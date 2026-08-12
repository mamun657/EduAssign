"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Filter,
  FileText,
  Send,
  CheckCircle2,
  Timer,
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
import Badge from "@/components/ui/Badge";
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

const FILTER_OPTIONS: { value: AssignmentStatus | "All"; label: string }[] = [
  { value: "All", label: "All assignments" },
  { value: "Published", label: "To do" },
  { value: "Submitted", label: "Submitted" },
  { value: "Reviewed", label: "Reviewed" },
];

export default function StudentAssignmentsPage() {
  return (
    <RouteGuard roles={["Student"]}>
      <DashboardShell role="Student">
        <StudentAssignments />
      </DashboardShell>
    </RouteGuard>
  );
}

function StudentAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssignmentStatus | "All">("All");

  useEffect(() => {
    if (!user) return;
    let ok = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await Assignments.list();
        if (!ok) return;
        setAssignments(list);
      } catch (err) {
        if (!ok) return;
        setError((err as { message?: string })?.message ?? "Failed to load");
      } finally {
        if (ok) setLoading(false);
      }
    }
    load();
    return () => {
      ok = false;
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (filter === "All") return assignments;
    return assignments.filter((a) => a.status === filter);
  }, [assignments, filter]);

  const counts = useMemo(() => {
    const c = { Published: 0, Submitted: 0, Reviewed: 0 } as Record<
      "Published" | "Submitted" | "Reviewed",
      number
    >;
    for (const a of assignments) {
      if (a.status === "Published" || a.status === "Submitted" || a.status === "Reviewed") {
        c[a.status] += 1;
      }
    }
    return c;
  }, [assignments]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your work"
        title="Assignments"
        description="View briefs, submit work, and check feedback."
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="To do"
          value={counts.Published}
          icon={<Timer className="h-5 w-5" aria-hidden="true" />}
          tone="warning"
          hint="Awaiting submission"
        />
        <StatCard
          label="Submitted"
          value={counts.Submitted}
          icon={<Send className="h-5 w-5" aria-hidden="true" />}
          tone="info"
          hint="Awaiting teacher review"
        />
        <StatCard
          label="Reviewed"
          value={counts.Reviewed}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          tone="success"
          hint="With marks"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>My assignments</CardTitle>
              <CardDescription>
                {assignments.length} total · showing {filtered.length}
              </CardDescription>
            </div>
            <div className="w-full sm:w-56">
              <Select
                aria-label="Filter assignments"
                value={filter}
                onChange={(e) => setFilter(e.target.value as AssignmentStatus | "All")}
              >
                {FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
                  description="Your teacher will publish assignments here."
                  icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
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
            <ul className="divide-y divide-slate-200">
              {filtered.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/student/assignments/${a.id}`}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-slate-900">
                        {a.title}
                      </p>
                      <p className="text-[12px] text-slate-500">
                        {a.subjectName} · due {formatDate(a.dueDate)}
                      </p>
                    </div>
                    {a.attachmentFileName ? (
                      <span
                        title={`Has attachment: ${a.attachmentFileName}`}
                        className="inline-flex items-center text-slate-400"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                    <Badge tone={statusTone(a.status)} withDot>
                      {a.status}
                    </Badge>
                    {a.status === "Reviewed" && a.marks != null ? (
                      <span className="inline-flex items-center gap-1 rounded-[9px] border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-800">
                        Marks: {a.marks}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
