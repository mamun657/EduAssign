"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Filter, FileText } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
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
        title="Assignments"
        description="View briefs, submit work, and check feedback."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">To do</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{counts.Published}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Submitted</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{counts.Submitted}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Reviewed</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{counts.Reviewed}</p>
          </CardBody>
        </Card>
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
        <CardBody>
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
          ) : filtered.length === 0 ? (
            assignments.length === 0 ? (
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
            )
          ) : (
            <ul className="divide-y divide-[#E5E7EB]">
              {filtered.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/student/assignments/${a.id}`}
                    className="flex flex-wrap items-center gap-3 py-3 hover:bg-[#F9FAFB]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#111827]">
                        {a.title}
                      </p>
                      <p className="text-xs text-[#6B7280]">
                        {a.subjectName} · due {formatDate(a.dueDate)}
                      </p>
                    </div>
                    {a.attachmentFileName ? (
                      <span
                        title={`Has attachment: ${a.attachmentFileName}`}
                        className="inline-flex items-center text-[#6B7280]"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                    <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                    {a.status === "Reviewed" && a.marks != null ? (
                      <span className="text-xs font-medium text-[#111827]">
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
