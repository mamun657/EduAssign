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
import StatCard from "@/components/ui/StatCard";
import { Assignments } from "@/lib/api";
import type { Assignment, AssignmentStatus } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function statusTone(status: AssignmentStatus): "success" | "info" | "warning" | "neutral" {
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

  const counts = useMemo(() => {
    const c = { Draft: 0, Published: 0, Submitted: 0, Reviewed: 0 } as Record<
      "Draft" | "Published" | "Submitted" | "Reviewed",
      number
    >;
    for (const a of assignments) c[a.status] += 1;
    return c;
  }, [assignments]);

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
        eyebrow="Authoring"
        title="Assignments"
        description="Drafts, published briefs, and submissions."
        actions={
          <Link href="/teacher/assignments/new">
            <Button variant="success">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New assignment
            </Button>
          </Link>
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total"
          value={assignments.length}
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          tone="slate"
          hint="All time"
        />
        <StatCard
          label="Drafts"
          value={counts.Draft}
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          tone="neutral"
          hint="Unpublished"
        />
        <StatCard
          label="Published"
          value={counts.Published}
          icon={<Send className="h-5 w-5" aria-hidden="true" />}
          tone="warning"
          hint="Awaiting student"
        />
        <StatCard
          label="Submitted"
          value={counts.Submitted}
          icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
          tone="info"
          hint="To review"
        />
        <StatCard
          label="Reviewed"
          value={counts.Reviewed}
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          tone="success"
          hint="Closed with marks"
        />
      </div>

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
        <CardBody className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-[13px] text-slate-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="p-5">
              {assignments.length === 0 ? (
                <EmptyState
                  title="No assignments yet"
                  description="Create your first assignment and attach a brief."
                  icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
                  action={
                    <Link href="/teacher/assignments/new">
                      <Button variant="success">
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
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11.5px] uppercase tracking-[0.06em] text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Title</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Student</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Subject</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Due</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="h-[56px] px-5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{a.title}</span>
                          {a.attachmentFileName ? (
                            <span
                              title={`Attachment: ${a.attachmentFileName}`}
                              className="inline-flex items-center text-slate-400"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="h-[56px] px-5 align-middle text-slate-700">{a.studentName}</td>
                      <td className="h-[56px] px-5 align-middle text-slate-700">{a.subjectName}</td>
                      <td className="h-[56px] px-5 align-middle text-slate-500">
                        {formatDate(a.dueDate)}
                      </td>
                      <td className="h-[56px] px-5 align-middle">
                        <Badge tone={statusTone(a.status)} withDot>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="h-[56px] px-5 align-middle">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/teacher/assignments/${a.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            aria-label={`View ${a.title}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          {a.status === "Submitted" ? (
                            <Link
                              href={`/teacher/submissions/${a.id}`}
                              className="inline-flex items-center gap-1.5 rounded-[9px] border border-slate-300 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-slate-800 hover:bg-slate-50"
                            >
                              <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
                              Review
                            </Link>
                          ) : null}
                          {a.status === "Draft" ? (
                            <Button
                              size="sm"
                              variant="success"
                              loading={busyId === a.id}
                              onClick={() => handlePublish(a.id)}
                            >
                              <Send className="h-3.5 w-3.5" aria-hidden="true" />
                              Publish
                            </Button>
                          ) : null}
                          {a.status === "Draft" ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(a.id)}
                              disabled={busyId === a.id}
                              aria-label={`Delete ${a.title}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
