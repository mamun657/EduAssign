"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Filter } from "lucide-react";
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
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { Assignments } from "@/lib/api";
import type { Assignment, AssignmentStatus } from "@/lib/types";

export default function AdminAssignmentsPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <AssignmentsAdmin />
    </RouteGuard>
  );
}

function AssignmentsAdmin() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | AssignmentStatus>("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setAssignments(await Assignments.list());
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!statusFilter) return assignments;
    return assignments.filter((a) => a.status === statusFilter);
  }, [assignments, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: assignments.length,
      draft: assignments.filter((a) => a.status === "Draft").length,
      published: assignments.filter((a) => a.status === "Published").length,
      submitted: assignments.filter((a) => a.status === "Submitted").length,
      reviewed: assignments.filter((a) => a.status === "Reviewed").length,
    };
  }, [assignments]);

  async function onDelete(a: Assignment) {
    if (!confirm(`Delete assignment "${a.title}"? This cannot be undone.`)) return;
    try {
      await Assignments.remove(a.id);
      toast.success("Assignment deleted.");
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Delete failed.");
    }
  }

  return (
    <DashboardShell role="Admin">
      <PageHeader
        title="Assignments"
        description="All assignments across the system."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatPill label="Total" value={stats.total} />
        <StatPill label="Draft" value={stats.draft} tone="slate" />
        <StatPill label="Published" value={stats.published} tone="sky" />
        <StatPill label="Submitted" value={stats.submitted} tone="amber" />
        <StatPill label="Reviewed" value={stats.reviewed} tone="emerald" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>All assignments</CardTitle>
              <CardDescription>
                {filtered.length} of {assignments.length} shown
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
              <Select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Submitted">Submitted</option>
                <option value="Reviewed">Reviewed</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No assignments"
              description={
                assignments.length === 0
                  ? "Teachers can create assignments for the students assigned to them."
                  : "No assignments match this filter."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Teacher</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Due</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtered.map((a) => (
                    <tr key={a.id} className="text-[#374151]">
                      <td className="py-3 pr-4 font-medium text-[#111827]">{a.title}</td>
                      <td className="py-3 pr-4">{a.teacherName}</td>
                      <td className="py-3 pr-4">{a.studentName}</td>
                      <td className="py-3 pr-4">{a.subjectName}</td>
                      <td className="py-3 pr-4">{new Date(a.dueDate).toLocaleDateString()}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button size="sm" variant="danger" onClick={() => onDelete(a)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </DashboardShell>
  );
}

function StatPill({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "sky" | "amber" | "emerald";
}) {
  const ring: Record<typeof tone, string> = {
    slate: "ring-[#E5E7EB]",
    sky: "ring-[#BFDBFE]",
    amber: "ring-[#FDE68A]",
    emerald: "ring-[#A7F3D0]",
  };
  return (
    <Card>
      <CardBody className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</p>
        <p className={`rounded-md px-2 py-0.5 text-lg font-semibold ring-1 ring-inset ${ring[tone]} text-[#111827]`}>
          {value}
        </p>
      </CardBody>
    </Card>
  );
}

function statusTone(status: AssignmentStatus): "emerald" | "amber" | "sky" | "slate" {
  switch (status) {
    case "Reviewed":
      return "emerald";
    case "Submitted":
      return "amber";
    case "Published":
      return "sky";
    case "Draft":
    default:
      return "slate";
  }
}