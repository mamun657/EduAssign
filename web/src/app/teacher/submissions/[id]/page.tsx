"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Assignments } from "@/lib/api";
import type { Assignment, AssignmentStatus } from "@/lib/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: AssignmentStatus) {
  switch (status) {
    case "Reviewed":
      return "emerald" as const;
    case "Submitted":
      return "sky" as const;
    case "Published":
      return "amber" as const;
    default:
      return "slate" as const;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id]);

  async function handleDownloadSubmission() {
    if (!assignment) return;
    setActionError(null);
    try {
      const res = await Assignments.downloadSubmissionFile(assignment.id);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.fileName || assignment.submissionFileName || `submission-${assignment.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Failed to download");
    }
  }

  async function handleDownloadAttachment() {
    if (!assignment) return;
    setActionError(null);
    try {
      const res = await Assignments.downloadAttachment(assignment.id);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName || assignment.attachmentFileName || `attachment-${assignment.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Failed to download");
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Review submission"
          description="Loading…"
          actions={
            <Link href="/teacher/submissions">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Review submission"
          actions={
            <Link href="/teacher/submissions">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            </Link>
          }
        />
        {error ? <Alert tone="error">{error}</Alert> : (
          <Alert tone="error">Submission not found.</Alert>
        )}
      </div>
    );
  }

  const isReviewed = assignment.status === "Reviewed";

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.title}
        description={`${assignment.studentName} · ${assignment.subjectName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/teacher/submissions">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            </Link>
            <Link href={`/teacher/assignments/${assignment.id}`}>
              <Button variant="secondary">Open assignment</Button>
            </Link>
          </div>
        }
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {validationError ? <Alert tone="error">{validationError}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student submission</CardTitle>
                <CardDescription>
                  Submitted{" "}
                  {assignment.submittedAt ? formatDateTime(assignment.submittedAt) : "—"}
                </CardDescription>
              </div>
              <Badge tone={statusTone(assignment.status)}>
                {isReviewed ? (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Reviewed
                  </span>
                ) : (
                  assignment.status
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            {assignment.submissionText ? (
              <div className="mb-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                <p className="whitespace-pre-line text-sm text-[#111827]">
                  {assignment.submissionText}
                </p>
              </div>
            ) : null}

            <ul className="space-y-3">
              <li className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2">
                <FileText className="h-5 w-5 text-[#374151]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#111827]">
                    {assignment.submissionFileName ?? "No file uploaded"}
                  </p>
                  {assignment.submissionSize ? (
                    <p className="text-xs text-[#6B7280]">
                      {(assignment.submissionSize / 1024).toFixed(1)} KB
                    </p>
                  ) : null}
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
              <li className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2">
                <FileText className="h-5 w-5 text-[#374151]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#111827]">
                    {assignment.attachmentFileName ?? "No teacher brief attached"}
                  </p>
                  {assignment.attachmentSize ? (
                    <p className="text-xs text-[#6B7280]">
                      {(assignment.attachmentSize / 1024).toFixed(1)} KB
                    </p>
                  ) : null}
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
          </CardBody>
        </Card>

        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
              <CardDescription>
                Enter marks for the student along with optional feedback.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label htmlFor="marks" className="mb-1 block text-sm font-medium text-[#111827]">
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
                  <label htmlFor="feedback" className="mb-1 block text-sm font-medium text-[#111827]">
                    Feedback
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={6}
                    maxLength={4000}
                    placeholder="What did the student do well? What should they improve?"
                    className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30"
                    required
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={busy}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {busy ? "Saving…" : isReviewed ? "Update review" : "Save review"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => router.push("/teacher/submissions")}
                    className="text-sm font-medium text-[#6B7280] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
                {isReviewed ? (
                  <p className="text-xs text-[#6B7280]">
                    Last updated {formatDateTime(assignment.updatedAt)}
                  </p>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  );
}
