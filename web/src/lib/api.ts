// Centralized API client. Single source of truth for backend URL + auth header.
// Uses fetch + JSON so we don't add any runtime deps beyond what's already in package.json.

import { getToken, clearAuth } from "./auth";
import type { ApiError } from "./types";

// Backend controllers already declare [Route("api/[controller]")] (or
// "api/<name>"). The frontend paths below are relative to /api/<...> so the
// base URL only needs to be the origin, e.g. http://localhost:5220.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5220";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions<TBody> {
  method?: Method;
  body?: TBody;
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  // If true, no Authorization header is attached (used for login/register).
  public?: boolean;
}

function buildUrl(path: string, params?: RequestOptions<unknown>["params"]): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  // Always hit the /api/* prefix because every ASP.NET controller
  // is decorated with [Route("api/[controller]")] or "api/<name>".
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withPrefix = normalized.startsWith("/api/")
    ? normalized
    : `/api${normalized}`;
  const url = `${base}${withPrefix}`;
  if (!params) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qs.append(k, String(v));
  }
  const q = qs.toString();
  return q ? `${url}?${q}` : url;
}

function extractError(status: number, payload: unknown): ApiError {
  let message = "";
  let errors: Record<string, string[]> | undefined;
  if (payload && typeof payload === "object") {
    const any = payload as Record<string, unknown>;
    message =
      (any.message as string) ??
      (any.title as string) ??
      (any.detail as string) ??
      "";
    if (any.errors && typeof any.errors === "object") {
      errors = any.errors as Record<string, string[]>;
    }
  }
  if (!message) {
    switch (status) {
      case 400:
        message = "The request was invalid. Please review the form.";
        break;
      case 401:
        message = "Your session has expired. Please sign in again.";
        break;
      case 403:
        message = "You do not have permission to perform this action.";
        break;
      case 404:
        message = "Requested resource was not found.";
        break;
      case 409:
        message = "This action conflicts with the current state.";
        break;
      case 500:
        message = "Something went wrong on the server.";
        break;
      default:
        message = `Request failed with status ${status}.`;
    }
  }
  return { status, message, errors };
}

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const { method = "GET", body, params, signal, public: isPublic = false } = options;
  const url = buildUrl(path, params);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!isPublic) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    // Network failure: server down, DNS failure, CORS preflight reject, etc.
    const isAbort = (e as { name?: string })?.name === "AbortError";
    if (isAbort) {
      throw {
        status: 0,
        message: "Request cancelled.",
        network: true,
      } satisfies ApiError;
    }
    throw {
      status: 0,
      message:
        "Unable to connect to the server. Please make sure the API is running and CORS is configured.",
      network: true,
    } satisfies ApiError;
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as TResponse;
  }

  const text = await res.text();
  const payload = text ? safeParse(text) : null;

  if (!res.ok) {
    // Auto-logout on 401 so a stale token doesn't break the app
    if (res.status === 401 && !isPublic) clearAuth();
    throw extractError(res.status, payload);
  }

  return (payload as TResponse) ?? (undefined as TResponse);
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// --- Auth ---
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "./types";
export const Auth = {
  login: (req: LoginRequest) =>
    apiRequest<AuthResponse, LoginRequest>("/Auth/login", {
      method: "POST",
      body: req,
      public: true,
    }),
  register: (req: RegisterRequest) =>
    apiRequest<AuthResponse, RegisterRequest>("/Auth/register", {
      method: "POST",
      body: req,
      public: true,
    }),
  me: () => apiRequest<User>("/Auth/me"),
};

// --- Academic Levels ---
import type { AcademicLevel } from "./types";
export const AcademicLevels = {
  list: () => apiRequest<AcademicLevel[]>("/AcademicLevels"),
};

// --- Subjects ---
import type {
  CreateSubjectRequest,
  Subject,
  UpdateSubjectRequest,
} from "./types";
export const Subjects = {
  list: () => apiRequest<Subject[]>("/Subjects"),
  create: (req: CreateSubjectRequest) =>
    apiRequest<Subject, CreateSubjectRequest>("/Subjects", {
      method: "POST",
      body: req,
    }),
  update: (id: string, req: UpdateSubjectRequest) =>
    apiRequest<Subject, UpdateSubjectRequest>(`/Subjects/${id}`, {
      method: "PUT",
      body: req,
    }),
  deactivate: (id: string) =>
    apiRequest<Subject, UpdateSubjectRequest>(`/Subjects/${id}`, {
      method: "PUT",
      body: { isActive: false },
    }),
};

// --- Students (self-service) ---
import type {
  AvailableCurriculum,
  EnrolledSubject,
  EnrollSubjectRequest,
  EnrollSubjectResponse,
} from "./types";
export const Students = {
  availableSubjects: () =>
    apiRequest<AvailableCurriculum>("/Students/available-subjects"),
  enrolledSubjects: () =>
    apiRequest<EnrolledSubject[]>("/Students/enrolled-subjects"),
  enroll: (req: EnrollSubjectRequest) =>
    apiRequest<EnrollSubjectResponse, EnrollSubjectRequest>(
      "/Students/enroll",
      { method: "POST", body: req },
    ),
  remove: (subjectId: string) =>
    apiRequest<unknown, unknown>(`/Students/enroll/${subjectId}`, {
      method: "DELETE",
    }),
};

// --- Admin ---
import type {
  AdminStudentDetail,
  AdminStudentListItem,
  AdminTeacherListItem,
  CreateTeacherRequest,
  UpdateUserStatusRequest,
} from "./types";
export const Admin = {
  students: () => apiRequest<AdminStudentListItem[]>("/admin/students"),
  studentDetail: (id: string) =>
    apiRequest<AdminStudentDetail>(`/admin/students/${id}`),
  teachers: () => apiRequest<AdminTeacherListItem[]>("/admin/teachers"),
  createTeacher: (req: CreateTeacherRequest) =>
    apiRequest<AdminTeacherListItem, CreateTeacherRequest>(
      "/admin/teachers",
      { method: "POST", body: req },
    ),
  setUserActive: (id: string, req: UpdateUserStatusRequest) =>
    apiRequest<unknown, UpdateUserStatusRequest>(`/admin/users/${id}/active`, {
      method: "PATCH",
      body: req,
    }),
};

// --- Teacher assignments (Admin manages TSS) ---
import type {
  TeacherAssignmentRequest,
  TeacherAssignmentResponse,
} from "./types";
export const TeacherAssignments = {
  list: (params?: { teacherId?: string; studentId?: string }) =>
    apiRequest<TeacherAssignmentResponse[]>("/teacher-student-subjects", { params }),
  create: (req: TeacherAssignmentRequest) =>
    apiRequest<TeacherAssignmentResponse, TeacherAssignmentRequest>(
      "/teacher-student-subjects",
      { method: "POST", body: req },
    ),
  remove: (id: string) =>
    apiRequest<unknown, unknown>(`/teacher-student-subjects/${id}`, {
      method: "DELETE",
    }),
  mine: () =>
    apiRequest<TeacherAssignmentResponse[]>("/teacher-student-subjects/mine"),
  myTeachers: () =>
    apiRequest<TeacherAssignmentResponse[]>("/teacher-student-subjects/my-teachers"),
};

// --- Assignments (Teachers + Students) ---
import type {
  Assignment,
  CreateAssignmentRequest,
  ReviewSubmissionRequest,
  SubmitAssignmentRequest,
  UpdateAssignmentRequest,
} from "./types";
export const Assignments = {
  // Both teacher and student can call this; backend returns role-filtered list.
  list: (params?: { studentId?: string; subjectId?: string }) =>
    apiRequest<Assignment[]>("/assignments", { params }),
  get: (id: string) => apiRequest<Assignment>(`/assignments/${id}`),
  create: (req: CreateAssignmentRequest) =>
    apiRequest<Assignment, CreateAssignmentRequest>("/assignments", {
      method: "POST",
      body: req,
    }),
  update: (id: string, req: UpdateAssignmentRequest) =>
    apiRequest<Assignment, UpdateAssignmentRequest>(`/assignments/${id}`, {
      method: "PUT",
      body: req,
    }),
  remove: (id: string) =>
    apiRequest<unknown, unknown>(`/assignments/${id}`, { method: "DELETE" }),
  publish: (id: string) =>
    apiRequest<Assignment, unknown>(`/assignments/${id}/publish`, {
      method: "POST",
    }),
  submit: (id: string, req: SubmitAssignmentRequest) =>
    apiRequest<Assignment, SubmitAssignmentRequest>(`/assignments/${id}/submit`, {
      method: "POST",
      body: req,
    }),
  review: (id: string, req: ReviewSubmissionRequest) =>
    apiRequest<Assignment, ReviewSubmissionRequest>(
      `/assignments/${id}/review`,
      { method: "POST", body: req },
    ),
};