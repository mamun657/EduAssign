"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Inbox,
  Send,
  Trash2,
  FileText,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
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

export default function TeacherAssignmentDetailPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <TeacherAssignmentDetail />
      </DashboardShell>
    </RouteGuard>
  );
}

function TeacherAssignmentDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const a = await Assignments.get(id);
      setAssignment(a);
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

  async function handlePublish() {
    if (!assignment) return;
    setActionError(null);
    setBusy(true);
    try {
      await Assignments.publish(assignment.id);
      await refresh();
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!assignment) return;
    if (!confirm("Delete this assignment? This also removes its attachment.")) return;
    setActionError(null);
    setBusy(true);
    try {
      await Assignments.remove(assignment.id);
      router.push("/teacher/assignments");
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Failed to delete");
      setBusy(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assignment"
          description="Loading…"
          actions={
            <Link href="/teacher/assignments">
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
          title="Assignment"
          actions={
            <Link href="/teacher/assignments">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            </Link>
          }
        />
        {error ? <Alert tone="error">{error}</Alert> : (
          <Alert tone="error">Assignment not found.</Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.title}
        description={`${assignment.subjectName} · ${assignment.studentName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/teacher/assignments">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            </Link>
            {assignment.status === "Draft" ? (
              <>
                <Button onClick={handlePublish} disabled={busy}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {busy ? "Publishing…" : "Publish"}
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={busy}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              </>
            ) : null}
            {assignment.status === "Submitted" ? (
              <Link href={`/teacher/submissions/${assignment.id}`}>
                <Button>
                  <Inbox className="h-4 w-4" aria-hidden="true" />
                  Review
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Brief</CardTitle>
                <CardDescription>Instructions given to the student.</CardDescription>
              </div>
              <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-line text-sm text-[#111827]">{assignment.description}</p>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Student</dt>
                  <dd className="font-medium text-[#111827]">{assignment.studentName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Subject</dt>
                  <dd className="font-medium text-[#111827]">{assignment.subjectName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Due</dt>
                  <dd className="font-medium text-[#111827]">{formatDateTime(assignment.dueDate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Created</dt>
                  <dd className="font-medium text-[#111827]">{formatDateTime(assignment.createdAt)}</dd>
                </div>
                {assignment.submittedAt ? (
                  <div className="flex justify-between">
                    <dt className="text-[#6B7280]">Submitted</dt>
                    <dd className="font-medium text-[#111827]">{formatDateTime(assignment.submittedAt)}</dd>
                  </div>
                ) : null}
                {assignment.marks != null ? (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-[#6B7280]">Reviewed</dt>
                      <dd className="font-medium text-[#111827]">{formatDateTime(assignment.updatedAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#6B7280]">Marks</dt>
                      <dd className="font-medium text-[#111827]">{assignment.marks}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>Teacher brief and student submission.</CardDescription>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2">
                  <FileText className="h-5 w-5 text-[#374151]" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111827]">
                      {assignment.attachmentFileName ?? "No attachment"}
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
                <li className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2">
                  <FileText className="h-5 w-5 text-[#374151]" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111827]">
                      {assignment.submissionFileName ?? "No submission yet"}
                    </p>
                    {assignment.submissionSize ? (
                      <p className="text-xs text-[#6B7280]">
                        {(assignment.submissionSize / 1024).toFixed(1)} KB
                      </p>
                    ) : null}
                  </div>
                  {assignment.submissionFileName ? (
                    <Link href={`/teacher/submissions/${assignment.id}`}>
                      <Button variant="secondary">
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Open
                      </Button>
                    </Link>
                  ) : null}
                </li>
              </ul>
            </CardBody>
          </Card>

          {assignment.feedback ? (
            <Card>
              <CardHeader>
                <CardTitle>Feedback given</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-line text-sm text-[#111827]">{assignment.feedback}</p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
