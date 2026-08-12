import { getToken, clearAuth } from "./auth";
import type { ApiError } from "./types";
const FALLBACK_DEV_URL = "http://localhost:5220";
const FALLBACK_PROD_URL = "https://eduassign-api.onrender.com";

function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (raw && raw.length > 0) return raw.replace(/\/+$/, "");
  
  return process.env.NODE_ENV === "production" ? FALLBACK_PROD_URL : FALLBACK_DEV_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions<TBody> {
  method?: Method;
  body?: TBody;
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  
  public?: boolean;
}

function buildUrl(path: string, params?: RequestOptions<unknown>["params"]): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  
  
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
  CurriculumSubject,
  Subject,
  UpdateSubjectRequest,
} from "./types";
export const Subjects = {
  list: () => apiRequest<Subject[]>("/Subjects"),
  // Returns the curriculum subjects (compulsory + elective groups + options)
  byAcademicLevel: (academicLevelId: string) =>
    apiRequest<CurriculumSubject[]>(
      `/Subjects/by-academic-level/${academicLevelId}`,
    ),
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
  remove: (id: string) =>
    apiRequest<unknown, unknown>(`/Subjects/${id}`, { method: "DELETE" }),
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
  deleteUser: (id: string) =>
    apiRequest<unknown, unknown>(`/admin/users/${id}`, {
      method: "DELETE",
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

/**
 * POST a multipart/form-data upload. The browser builds the multipart body for
 * us so we don't need any runtime dep. We attach the bearer token manually
 * because the default apiRequest serializes JSON, not FormData.
 */
async function apiUpload<TResponse>(
  path: string,
  formData: FormData,
): Promise<TResponse> {
  const token = getToken();
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const text = await res.text();
  const payload = text ? safeParse(text) : null;
  if (!res.ok) {
    if (res.status === 401) clearAuth();
    throw extractError(res.status, payload);
  }
  return (payload as TResponse) ?? (undefined as TResponse);
}

/**
 * GET a binary blob (file) using the bearer token. Returns
 * { blob, contentType, fileName } so the caller can save it with a meaningful
 * filename. The backend sends Content-Disposition: attachment; filename=... so
 * we parse the filename out of the headers when present.
 */
async function apiDownload(
  path: string,
): Promise<{ blob: Blob; contentType: string; fileName: string }> {
  const token = getToken();
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) clearAuth();
    const text = await res.text();
    throw extractError(res.status, text ? safeParse(text) : null);
  }
  const contentType = res.headers.get("Content-Type") ?? "application/octet-stream";
  const dispo = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(dispo);
  const fileName = match ? decodeURIComponent(match[1] ?? "download") : "download";
  const blob = await res.blob();
  return { blob, contentType, fileName };
}

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
  /**
   * Teacher-only: upload a PDF/image as the assignment brief attachment.
   * Replaces any existing attachment.
   */
  uploadAttachment: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload<Assignment>(`/assignments/${id}/attachment`, fd);
  },
  /** Teacher (owner) or Student (assigned, published only): download attachment. */
  downloadAttachment: (id: string) =>
    apiDownload(`/assignments/${id}/attachment`),
  /**
   * Student-only: upload the student's submission file (PDF/image/etc).
   * Replaces any existing submission file.
   */
  uploadSubmissionFile: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload<Assignment>(`/assignments/${id}/submission-file`, fd);
  },
  /** Teacher (owner): download the student's submission file. */
  downloadSubmissionFile: (id: string) =>
    apiDownload(`/assignments/${id}/submission-file`),
};

// --- Phase 6: Similarity / AI analysis ---
// Uses the existing apiRequest so JWT auth + 401 auto-logout already work.
import type {
  AssignmentSimilaritySummary,
  SimilarityAnalyzeAccepted,
  SimilarityComparison,
  SimilaritySummary,
} from "./types";

/**
 * Backend endpoint contract (server/EduAssignPro.Api/Controllers/SimilarityController.cs):
 *   POST /api/similarity/submissions/{submissionId}/analyze     → 202 Accepted (queue job)
 *   GET  /api/similarity/assignments/{assignmentId}/summary     → AssignmentSimilaritySummary
 *   GET  /api/similarity/submissions/{submissionId}            → SimilaritySummary (teacher/admin: full; student owner: filtered)
 *   GET  /api/similarity/compare?a={idA}&b={idB}               → SimilarityComparison (teacher/admin only)
 * All endpoints require [Authorize]; teacher/admin enforced in-controller.
 */
export const Similarity = {
  /** Trigger analysis for one submission. Returns 202 with the queued job id. */
  analyze: (submissionId: string) =>
    apiRequest<SimilarityAnalyzeAccepted, unknown>(
      `/similarity/submissions/${submissionId}/analyze`,
      { method: "POST" },
    ),

  /** Per-assignment aggregated summary ranked by highest similarity first. */
  assignmentSummary: (assignmentId: string) =>
    apiRequest<AssignmentSimilaritySummary>(
      `/similarity/assignments/${assignmentId}/summary`,
    ),

  /** Per-submission detail. Teacher/admin get full matches; student owner gets a filtered view. */
  submissionSummary: (submissionId: string) =>
    apiRequest<SimilaritySummary>(`/similarity/submissions/${submissionId}`),

  /** Pairwise comparison between two submissions (teacher/admin only). */
  compare: (a: string, b: string) =>
    apiRequest<SimilarityComparison>("/similarity/compare", {
      params: { a, b },
    }),
};