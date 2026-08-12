"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Save,
  Sparkles,
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
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Assignments } from "@/lib/api";
import type { Assignment, AssignmentStatus } from "@/lib/types";

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

export default function TeacherSubmissionReviewPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <TeacherSubmissionReview />
      </DashboardShell>
    </RouteGuard>
  );
}

function TeacherSubmissionReview() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const a = await Assignments.get(id);
      setAssignment(a);
      if (a.marks != null) setMarks(String(a.marks));
      if (a.feedback) setFeedback(a.feedback);
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignment) return;
    setValidationError(null);
    setActionError(null);

    const mm = Number(marks);
    if (!Number.isFinite(mm)) {
      setValidationError("Marks must be a number.");
      return;
    }
    if (mm < 0) {
      setValidationError("Marks cannot be negative.");
      return;
    }
    if (mm > 100) {
      setValidationError("Marks cannot exceed 100.");
      return;
    }

    setBusy(true);
    Assignments.review(assignment.id, { marks: mm, feedback: feedback.trim() })
      .then(() => {
        void refresh();
      })
      .catch((err: { message?: string }) => {
        setActionError(err?.message ?? "Failed to save review");
      })
      .finally(() => {
        setBusy(false);
      });
  }

  const backButton = (
    <Link href="/teacher/submissions">
      <Button variant="secondary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Review queue
      </Button>
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Review submission" actions={backButton} />
        <p className="text-[13px] text-slate-500">Loading…</p>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Review submission"
          description={assignment?.studentName}
          actions={backButton}
        />
        {error ? (
          <Alert tone="danger">{error}</Alert>
        ) : (
          <Alert tone="danger">Submission not found.</Alert>
        )}
      </div>
    );
  }

  const isReviewed = assignment.status === "Reviewed";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${assignment.studentName} · ${assignment.subjectName}`}
        title={assignment.title || "Submission"}
        description={`Submitted ${formatDateTime(assignment.submittedAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {backButton}
            <Link href={`/teacher/assignments/${assignment.id}`}>
              <Button variant="secondary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Similarity
              </Button>
            </Link>
          </div>
        }
      />

      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
      {validationError ? (
        <Alert tone="danger">{validationError}</Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Student submission</CardTitle>
                <CardDescription>
                  Due {formatDateTime(assignment.dueDate)}
                </CardDescription>
              </div>
              <Badge tone={statusTone(assignment.status)} withDot>
                {assignment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            {assignment.description ? (
              <div className="mb-4 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500">
                  Brief
                </p>
                <p className="whitespace-pre-wrap text-[13.5px] text-slate-800">
                  {assignment.description}
                </p>
              </div>
            ) : null}

            {assignment.submissionText ? (
              <div className="mb-4 rounded-[10px] border border-slate-200 bg-white px-4 py-3">
                <p className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500">
                  Typed response
                </p>
                <p className="whitespace-pre-wrap text-[13.5px] text-slate-800">
                  {assignment.submissionText}
                </p>
              </div>
            ) : null}

            <ul className="divide-y divide-slate-200 rounded-[10px] border border-slate-200">
              <li className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-blue-50 text-blue-700">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-slate-900">
                    {assignment.submissionFileName ?? "No file uploaded"}
                  </p>
                  <p className="text-[12px] text-slate-500">
                    Submission{" "}
                    {assignment.submissionSize
                      ? `· ${formatKb(assignment.submissionSize)}`
                      : ""}
                  </p>
                </div>
                {assignment.submissionFileName ? (
                  <Button
                    variant="secondary"
                    onClick={handleDownloadSubmission}
                    aria-label="Download submission"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download
                  </Button>
                ) : null}
              </li>
              <li className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-violet-50 text-violet-700">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-slate-900">
                    {assignment.attachmentFileName ?? "No teacher brief attached"}
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
              </li>
            </ul>

            {isReviewed ? (
              <div className="mt-4 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Reviewed
                </div>
                <p className="mt-1 flex items-center gap-2 text-[13.5px] text-slate-900">
                  <GraduationCap className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  Marks awarded:{" "}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-medium text-slate-900 ring-1 ring-emerald-200">
                    {assignment.marks} / 100
                  </span>
                </p>
                {assignment.feedback ? (
                  <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-slate-800">
                    {assignment.feedback}
                  </p>
                ) : null}
                <p className="mt-2 text-[12px] text-slate-500">
                  Last updated {formatDateTime(assignment.updatedAt)}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <form onSubmit={onSubmit} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{isReviewed ? "Update review" : "Award marks"}</CardTitle>
              <CardDescription>
                Marks are stored immediately. Students see feedback on their
                assignments page.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="marks"
                    className="mb-1 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500"
                  >
                    Marks (0 – 100)
                  </label>
                  <Input
                    id="marks"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="feedback"
                    className="mb-1 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500"
                  >
                    Feedback
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={7}
                    maxLength={4000}
                    placeholder="What did the student do well? What should they improve?"
                    className="block w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button type="submit" disabled={busy}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {busy ? "Saving…" : isReviewed ? "Update review" : "Save review"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => router.push("/teacher/submissions")}
                    className="text-[12.5px] font-medium text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[12px] text-slate-500">
                  Need a similarity score first?{" "}
                  <Link
                    href={`/teacher/assignments/${assignment.id}`}
                    className="inline-flex items-center gap-0.5 font-medium text-slate-700 hover:text-slate-900"
                  >
                    Open the analysis panel
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </p>
              </div>
            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  );
}
