"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  FileText,
  Eye,
  Trash2,
  Send,
  Inbox,
  Filter,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { Assignments } from "@/lib/api";
import type { Assignment, AssignmentStatus } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
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

const ALL_STATUSES: (AssignmentStatus | "All")[] = [
  "All",
  "Draft",
  "Published",
  "Submitted",
  "Reviewed",
];

export default function TeacherAssignmentsListPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <TeacherAssignmentsList />
      </DashboardShell>
    </RouteGuard>
  );
}

function TeacherAssignmentsList() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssignmentStatus | "All">("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await Assignments.list();
      setAssignments(list);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (filter === "All") return assignments;
    return assignments.filter((a) => a.status === filter);
  }, [assignments, filter]);

  async function handlePublish(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await Assignments.publish(id);
      await refresh();
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Failed to publish");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this assignment? This also removes its attachment.")) return;
    setActionError(null);
    setBusyId(id);
    try {
      await Assignments.remove(id);
      await refresh();
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Drafts, published briefs, and submissions."
        actions={
          <Link href="/teacher/assignments/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New assignment
            </Button>
          </Link>
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All assignments</CardTitle>
              <CardDescription>
                {assignments.length} total · showing {filtered.length}
              </CardDescription>
            </div>
            <div className="w-full sm:w-56">
              <Select
                aria-label="Filter by status"
                value={filter}
                onChange={(e) => setFilter(e.target.value as AssignmentStatus | "All")}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "All" ? "All statuses" : s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
          ) : filtered.length === 0 ? (
            assignments.length === 0 ? (
              <EmptyState
                title="No assignments yet"
                description="Create your first assignment and attach a brief."
                icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
                action={
                  <Link href="/teacher/assignments/new">
                    <Button>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New assignment
                    </Button>
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title="No matches"
                description={`No assignments with status "${filter}".`}
                icon={<Filter className="h-6 w-6" aria-hidden="true" />}
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E5E7EB] text-xs uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">Title</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Student</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Subject</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Due</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                    <th scope="col" className="py-2 pr-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtered.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 pr-3 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#111827]">{a.title}</span>
                          {a.attachmentFileName ? (
                            <span
                              title={`Attachment: ${a.attachmentFileName}`}
                              className="inline-flex items-center text-[#6B7280]"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-top text-[#111827]">{a.studentName}</td>
                      <td className="py-3 pr-3 align-top text-[#111827]">{a.subjectName}</td>
                      <td className="py-3 pr-3 align-top text-[#6B7280]">
                        {formatDate(a.dueDate)}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/teacher/assignments/${a.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB]"
                            aria-label={`View ${a.title}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          {a.status === "Submitted" ? (
                            <Link
                              href={`/teacher/submissions/${a.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
                            >
                              <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
                              Review
                            </Link>
                          ) : null}
                          {a.status === "Draft" ? (
                            <button
                              type="button"
                              onClick={() => handlePublish(a.id)}
                              disabled={busyId === a.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Send className="h-3.5 w-3.5" aria-hidden="true" />
                              {busyId === a.id ? "Publishing…" : "Publish"}
                            </button>
                          ) : null}
                          {a.status === "Draft" ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(a.id)}
                              disabled={busyId === a.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Delete ${a.title}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
