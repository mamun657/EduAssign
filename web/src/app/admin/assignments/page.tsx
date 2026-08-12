"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Filter, FileText, Eye } from "lucide-react";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
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

function statusTone(
  status: AssignmentStatus
): "success" | "warning" | "info" | "neutral" {
  switch (status) {
    case "Reviewed":
      return "success";
    case "Submitted":
      return "warning";
    case "Published":
      return "info";
    case "Draft":
    default:
      return "neutral";
  }
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
      setError(
        (err as { message?: string })?.message ?? "Failed to load assignments."
      );
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

  const stats = useMemo(
    () => ({
      total: assignments.length,
      draft: assignments.filter((a) => a.status === "Draft").length,
      published: assignments.filter((a) => a.status === "Published").length,
      submitted: assignments.filter((a) => a.status === "Submitted").length,
      reviewed: assignments.filter((a) => a.status === "Reviewed").length,
    }),
    [assignments]
  );

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
        eyebrow="Administration / Assignments"
        title="Assignments"
        description="Every assignment across the institution."
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          tone="slate"
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
          label="Total"
          value={stats.total}
        />
        <StatCard tone="neutral" icon={<FileText className="h-4 w-4" aria-hidden="true" />} label="Draft" value={stats.draft} />
        <StatCard tone="info" icon={<Eye className="h-4 w-4" aria-hidden="true" />} label="Published" value={stats.published} />
        <StatCard
          tone="warning"
          icon={<Eye className="h-4 w-4" aria-hidden="true" />}
          label="Submitted"
          value={stats.submitted}
        />
        <StatCard
          tone="success"
          icon={<Eye className="h-4 w-4" aria-hidden="true" />}
          label="Reviewed"
          value={stats.reviewed}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <CardTitle>All assignments</CardTitle>
              <CardDescription>
                {filtered.length} of {assignments.length} shown
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <Select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
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
            <p className="text-[13px] text-slate-500">Loading…</p>
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
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Title</th>
                    <th className="px-4 py-2 font-semibold">Teacher</th>
                    <th className="px-4 py-2 font-semibold">Student</th>
                    <th className="px-4 py-2 font-semibold">Subject</th>
                    <th className="px-4 py-2 font-semibold">Due</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="h-[56px] text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {a.title}
                      </td>
                      <td className="px-4 py-2">{a.teacherName}</td>
                      <td className="px-4 py-2">{a.studentName}</td>
                      <td className="px-4 py-2">{a.subjectName}</td>
                      <td className="px-4 py-2">
                        {new Date(a.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <Badge tone={statusTone(a.status)} withDot>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="danger-soft"
                          onClick={() => onDelete(a)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
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