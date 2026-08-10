// Shared TypeScript types mirroring the .NET backend DTOs.
// Source: server/EduAssignPro.Application/Dtos/**/*Response.cs

export type Role = "Admin" | "Teacher" | "Student";
export type AcademicLevelCode = "SCHOOL" | "COLLEGE";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  role: Role;
  academicLevelId?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  role: Exclude<Role, "Admin">;
  academicLevelId?: string;
}

export interface AcademicLevel {
  id: string;
  code: AcademicLevelCode | string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface CreateSubjectRequest {
  code: string;
  name: string;
}

export interface UpdateSubjectRequest {
  code?: string;
  name?: string;
  isActive?: boolean;
}

export interface CurriculumSubject {
  curriculumSubjectId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  isCompulsory: boolean;
  electiveGroup?: string | null;
  maxChoicesInGroup?: number | null;
  electiveOption?: string | null;
}

export interface ElectiveOption {
  key: string;
  displayName: string;
  subjects: CurriculumSubject[];
}

export interface ElectiveGroup {
  name: string;
  maxChoicesInGroup: number;
  subjects: CurriculumSubject[];
  options?: ElectiveOption[];
}

export interface AvailableCurriculum {
  academicLevelId: string;
  academicLevelCode: string;
  academicLevelName: string;
  compulsorySubjects: CurriculumSubject[];
  electiveGroups: ElectiveGroup[];
  alreadyEnrolled: CurriculumSubject[];
}

export interface EnrolledSubject {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  isCompulsory: boolean;
  electiveGroup?: string | null;
  electiveOption?: string | null;
  enrolledAt: string;
}

export interface EnrollSubjectRequest {
  subjectId: string;
}

export interface EnrollSubjectResponse {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  isCompulsory: boolean;
  electiveGroup?: string | null;
}

export interface AdminStudentListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  academicLevelId?: string | null;
  academicLevelCode?: string | null;
  academicLevelName?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminStudentSubjectItem {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  isCompulsory: boolean;
  electiveGroup?: string | null;
}

export interface AdminStudentDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  role: Role;
  academicLevelId?: string | null;
  academicLevelCode?: string | null;
  academicLevelName?: string | null;
  isActive: boolean;
  createdAt: string;
  selectedSubjects: AdminStudentSubjectItem[];
  availableNotSelectedSubjects: AdminStudentSubjectItem[];
}

export interface AdminTeacherListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  academicLevelId?: string | null;
  academicLevelName?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateTeacherRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  academicLevelId?: string;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
}

export interface TeacherAssignmentRequest {
  teacherId: string;
  studentId: string;
  subjectId: string;
}

export interface TeacherAssignmentResponse {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  createdAt: string;
  isActive: boolean;
}

export type AssignmentStatus = "Draft" | "Published" | "Submitted" | "Reviewed";

export interface Assignment {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  title: string;
  description?: string | null;
  dueDate: string;
  isPublished: boolean;
  isActive: boolean;
  submissionText?: string | null;
  submittedAt?: string | null;
  marks?: number | null;
  feedback?: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  // File attachment metadata (teacher's brief). Null if no attachment yet.
  attachmentFileName?: string | null;
  attachmentContentType?: string | null;
  attachmentSize?: number | null;
  // Student submission file metadata. Null if no submission file yet.
  submissionFileName?: string | null;
  submissionContentType?: string | null;
  submissionSize?: number | null;
}

export interface CreateAssignmentRequest {
  studentId: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string; // ISO
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  dueDate?: string;
}

export interface SubmitAssignmentRequest {
  submissionText: string;
}

export interface ReviewSubmissionRequest {
  marks: number;
  feedback?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  network?: boolean;
}