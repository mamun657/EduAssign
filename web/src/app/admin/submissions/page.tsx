"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
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
import type { Assignment } from "@/lib/types";

export default function AdminSubmissionsPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <SubmissionsAdmin />
    </RouteGuard>
  );
}

function SubmissionsAdmin() {
  const [all, setAll] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"Submitted" | "Reviewed" | "">("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setAll(await Assignments.list());
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const submittedOrReviewed = all.filter(
      (a) => a.status === "Submitted" || a.status === "Reviewed"
    );
    if (!stage) return submittedOrReviewed;
    return submittedOrReviewed.filter((a) => a.status === stage);
  }, [all, stage]);

  const counts = useMemo(() => {
    const submitted = all.filter((a) => a.status === "Submitted").length;
    const reviewed = all.filter((a) => a.status === "Reviewed").length;
    return { submitted, reviewed };
  }, [all]);

  return (
    <DashboardShell role="Admin">
      <PageHeader
        title="Submissions"
        description="Assignments students have submitted and teachers have reviewed."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>All submissions</CardTitle>
              <CardDescription>
                {filtered.length} shown · {counts.submitted} pending review · {counts.reviewed} reviewed
              </CardDescription>
            </div>
            <Select
              aria-label="Filter by stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as typeof stage)}
            >
              <option value="">All</option>
              <option value="Submitted">Submitted only</option>
              <option value="Reviewed">Reviewed only</option>
            </Select>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              description="Students must publish and submit an assignment before it appears here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Teacher</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Marks</th>
                    <th className="py-2 pr-4">Submitted</th>
                    <th className="py-2 pr-4">Feedback</th>
                    <th className="py-2 pr-4">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtered.map((a) => (
                    <tr key={a.id} className="text-[#374151]">
                      <td className="py-3 pr-4 font-medium text-[#111827]">{a.title}</td>
                      <td className="py-3 pr-4">{a.studentName}</td>
                      <td className="py-3 pr-4">{a.teacherName}</td>
                      <td className="py-3 pr-4">{a.subjectName}</td>
                      <td className="py-3 pr-4">{a.marks ?? "—"}</td>
                      <td className="py-3 pr-4">
                        {a.submittedAt
                          ? new Date(a.submittedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 max-w-[280px]">
                        <p className="truncate text-[#374151]" title={a.feedback ?? ""}>
                          {a.feedback ?? "—"}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={a.status === "Reviewed" ? "emerald" : "amber"}>
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to read this list</CardTitle>
          <CardDescription>
            Submitted = awaiting teacher review. Reviewed = teacher has set marks and feedback.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-2 text-sm text-[#374151]">
          <p>
            Use the stage filter to focus on items awaiting teacher action. The marks column is empty until
            a teacher reviews and saves marks on the assignment.
          </p>
          <Button variant="secondary" onClick={load}>
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </Button>
        </CardBody>
      </Card>
    </DashboardShell>
  );
}