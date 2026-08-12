"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Send,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Assignments } from "@/lib/api";
import type { Assignment, AssignmentStatus } from "@/lib/types";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKb(size?: number | null): string {
  if (!size) return "—";
  return `${(size / 1024).toFixed(1)} KB`;
}

function statusTone(
  status: AssignmentStatus,
): "success" | "info" | "warning" | "neutral" {
  switch (status) {
    case "Reviewed":
      return "success";
    case "Submitted":
      return "info";
    case "Published":
      return "warning";
    default:
      return "neutral";
  }
}

function downloadBlob(
  blob: Blob,
  fileName: string,
  setError: (m: string) => void,
) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    setError((err as { message?: string })?.message ?? "Failed to download");
  }
}

export default function StudentAssignmentDetailPage() {
  return (
    <RouteGuard roles={["Student"]}>
      <DashboardShell role="Student">
        <StudentAssignmentDetail />
      </DashboardShell>
    </RouteGuard>
  );
}

function StudentAssignmentDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [submissionText, setSubmissionText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const a = await Assignments.get(id);
      setAssignment(a);
      if (a.submissionText) setSubmissionText(a.submissionText);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user || !id) return;
    void refresh();
  }, [user?.id, id]);

  async function handleDownloadAttachment() {
    if (!assignment) return;
    setActionError(null);
    try {
      const res = await Assignments.downloadAttachment(assignment.id);
      const fileName =
        res.fileName ||
        assignment.attachmentFileName ||
        `attachment-${assignment.id}`;
      downloadBlob(res.blob, fileName, (m) => setActionError(m));
    } catch (err) {
      setActionError(
        (err as { message?: string })?.message ?? "Failed to download brief",
      );
    }
  }

  async function handleDownloadSubmission() {
    if (!assignment) return;
    setActionError(null);
    try {
      const res = await Assignments.downloadSubmissionFile(assignment.id);
      const fileName =
        res.fileName ||
        assignment.submissionFileName ||
        `submission-${assignment.id}`;
      downloadBlob(res.blob, fileName, (m) => setActionError(m));
    } catch (err) {
      setActionError(
        (err as { message?: string })?.message ?? "Failed to download submission",
      );
    }
  }

  function validate(): string | null {
    if (!submissionText.trim() && !file) {
      return "Add either written work or a file (or both) before submitting.";
    }
    if (file) {
      if (file.size > MAX_BYTES) return "File must be 10 MB or smaller.";
      if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
        return `Unsupported file type: ${file.type || "unknown"}.`;
      }
    }
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignment) return;
    setValidationError(null);
    setActionError(null);
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    setBusy(true);
    try {
      if (file) {
        await Assignments.uploadSubmissionFile(assignment.id, file);
      }
      await Assignments.submit(assignment.id, {
        submissionText: submissionText.trim(),
      });
      setFile(null);
      await refresh();
    } catch (e) {
      setActionError(
        (e as { message?: string })?.message ?? "Failed to submit",
      );
    } finally {
      setBusy(false);
    }
  }

  const backButton = (
    <Link href="/student/assignments">
      <Button variant="secondary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        My assignments
      </Button>
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assignment" actions={backButton} />
        <p className="text-[13px] text-slate-500">Loading…</p>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assignment"
          description={assignment?.subjectName}
          actions={backButton}
        />
        {error ? (
          <Alert tone="danger">{error}</Alert>
        ) : (
          <Alert tone="danger">Assignment not found.</Alert>
        )}
      </div>
    );
  }

  const isPublished = assignment.status === "Published";
  const isSubmitted = assignment.status === "Submitted";
  const isReviewed = assignment.status === "Reviewed";
  const canSubmit = isPublished;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={assignment.subjectName}
        title={assignment.title || "Assignment"}
        description={`Due ${formatDateTime(assignment.dueDate)}`}
        actions={backButton}
      />

      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
      {validationError ? (
        <Alert tone="danger">{validationError}</Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Brief</CardTitle>
                <CardDescription>
                  From your teacher. Review the requirements before submitting.
                </CardDescription>
              </div>
              <Badge tone={statusTone(assignment.status)} withDot>
                {assignment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            {assignment.description ? (
              <p className="whitespace-pre-wrap text-[13.5px] text-slate-800">
                {assignment.description}
              </p>
            ) : (
              <p className="text-[13.5px] italic text-slate-500">
                No description provided.
              </p>
            )}
            <div
              className="mt-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3"
              data-testid="assignment-attachment"
            >
              <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-violet-50 text-violet-700">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-slate-900">
                  {assignment.attachmentFileName ?? "No attachment"}
                </p>
                <p className="text-[12px] text-slate-500">
                  Brief attachment{" "}
                  {assignment.attachmentSize
                    ? `· ${formatKb(assignment.attachmentSize)}`
                    : ""}
                </p>
              </div>
              {assignment.attachmentFileName ? (
                <Button
                  variant="secondary"
                  onClick={handleDownloadAttachment}
                  aria-label="Download brief"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                Key dates and submission status.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3 text-[13.5px]">
                <div className="flex items-start justify-between gap-3">
                  <dt className="inline-flex items-center gap-1.5 text-slate-500">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    Due
                  </dt>
                  <dd className="font-medium text-slate-900">
                    {formatDateTime(assignment.dueDate)}
                  </dd>
                </div>
                {isSubmitted || isReviewed ? (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="inline-flex items-center gap-1.5 text-slate-500">
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      Submitted
                    </dt>
                    <dd className="font-medium text-slate-900">
                      {formatDateTime(assignment.submittedAt)}
                    </dd>
                  </div>
                ) : null}
                {isReviewed ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="inline-flex items-center gap-1.5 text-slate-500">
                        <CheckCircle2
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Reviewed
                      </dt>
                      <dd className="font-medium text-slate-900">
                        {formatDateTime(assignment.updatedAt)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="inline-flex items-center gap-1.5 text-slate-500">
                        <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                        Marks
                      </dt>
                      <dd>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12.5px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                          {assignment.marks} / 100
                        </span>
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </CardBody>
          </Card>

          {isSubmitted || isReviewed ? (
            <Card data-testid="submission-stack">
              <CardHeader>
                <CardTitle>Your submission</CardTitle>
                <CardDescription>
                  What your teacher can see after you submit.
                </CardDescription>
              </CardHeader>
              <CardBody>
                {assignment.submissionText ? (
                  <div className="rounded-[10px] border border-slate-200 bg-white px-4 py-3">
                    <p className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500">
                      Written answer
                    </p>
                    <p className="whitespace-pre-wrap text-[13.5px] text-slate-800">
                      {assignment.submissionText}
                    </p>
                  </div>
                ) : null}
                {assignment.submissionFileName ? (
                  <div className="mt-3 flex items-center gap-3 rounded-[10px] border border-slate-200 px-4 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-blue-50 text-blue-700">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-slate-900">
                        {assignment.submissionFileName}
                      </p>
                      <p className="text-[12px] text-slate-500">
                        Submission file{" "}
                        {assignment.submissionSize
                          ? `· ${formatKb(assignment.submissionSize)}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleDownloadSubmission}
                      aria-label="Download your submission"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download
                    </Button>
                  </div>
                ) : null}
                {!assignment.submissionText && !assignment.submissionFileName ? (
                  <p className="text-[13.5px] italic text-slate-500">
                    You submitted this assignment, but no content was attached.
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {isReviewed && assignment.feedback ? (
            <Card data-testid="teacher-feedback">
              <CardHeader>
                <CardTitle>Teacher feedback</CardTitle>
                <CardDescription>
                  Visible to you as soon as the teacher reviews your work.
                </CardDescription>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-[13.5px] text-slate-800">
                  {assignment.feedback}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {canSubmit ? (
            <form onSubmit={onSubmit} data-testid="submit-form">
              <Card>
                <CardHeader>
                  <CardTitle>Submit your work</CardTitle>
                  <CardDescription>
                    Written response or a file (or both). Max 10 MB.
                  </CardDescription>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="submissionText"
                        className="mb-1 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500"
                      >
                        Written answer
                      </label>
                      <textarea
                        id="submissionText"
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        rows={6}
                        maxLength={8000}
                        placeholder="Type your answer here…"
                        className="block w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="submissionFile"
                        className="mb-1 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500"
                      >
                        File
                      </label>
                      {file ? (
                        <div className="flex items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-blue-50 text-blue-700">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium text-slate-900">
                              {file.name}
                            </p>
                            <p className="text-[12px] text-slate-500">
                              {file.type || "unknown"} · {formatKb(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            aria-label="Remove file"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-slate-200 text-rose-600 hover:bg-rose-50"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="submissionFile"
                          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:bg-slate-100"
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-emerald-50 text-emerald-700">
                            <Upload className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="text-[13.5px] font-medium text-slate-900">
                            Click to upload a file
                          </span>
                          <span className="text-[12px] text-slate-500">
                            PDF, image, TXT, DOC, DOCX
                          </span>
                          <input
                            id="submissionFile"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.doc,.docx,application/pdf,image/png,image/jpeg,image/gif,image/webp,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <p className="text-[12px] text-slate-500">
                        Need to revise? You can resubmit before your teacher
                        reviews.
                      </p>
                      <Button type="submit" disabled={busy}>
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {busy ? "Submitting…" : "Submit work"}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </form>
          ) : null}

          {isPublished ? (
            <p className="inline-flex items-center gap-1 text-[12px] text-slate-500">
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
              Use the form above to send your work to your teacher.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}