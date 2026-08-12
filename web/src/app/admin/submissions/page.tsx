"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Inbox, ClipboardCheck } from "lucide-react";
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
      setError(
        (err as { message?: string })?.message ?? "Failed to load submissions."
      );
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

  const counts = useMemo(
    () => ({
      submitted: all.filter((a) => a.status === "Submitted").length,
      reviewed: all.filter((a) => a.status === "Reviewed").length,
    }),
    [all]
  );

  return (
    <DashboardShell role="Admin">
      <PageHeader
        eyebrow="Administration / Submissions"
        title="Submissions"
        description="Assignments students have submitted and teachers have reviewed."
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <StatCard
          tone="warning"
          icon={<Inbox className="h-4 w-4" aria-hidden="true" />}
          label="Pending review"
          value={counts.submitted}
        />
        <StatCard
          tone="success"
          icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
          label="Reviewed"
          value={counts.reviewed}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <CardTitle>All submissions</CardTitle>
              <CardDescription>
                {filtered.length} shown · {counts.submitted} pending review ·{" "}
                {counts.reviewed} reviewed
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
            <p className="text-[13px] text-slate-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              description="Students must publish and submit an assignment before it appears here."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Title</th>
                    <th className="px-4 py-2 font-semibold">Student</th>
                    <th className="px-4 py-2 font-semibold">Teacher</th>
                    <th className="px-4 py-2 font-semibold">Subject</th>
                    <th className="px-4 py-2 font-semibold">Marks</th>
                    <th className="px-4 py-2 font-semibold">Submitted</th>
                    <th className="px-4 py-2 font-semibold">Feedback</th>
                    <th className="px-4 py-2 font-semibold">Stage</th>
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
                      <td className="px-4 py-2">{a.studentName}</td>
                      <td className="px-4 py-2">{a.teacherName}</td>
                      <td className="px-4 py-2">{a.subjectName}</td>
                      <td className="px-4 py-2">{a.marks ?? "—"}</td>
                      <td className="px-4 py-2">
                        {a.submittedAt
                          ? new Date(a.submittedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="max-w-[280px] px-4 py-2">
                        <p
                          className="truncate text-slate-700"
                          title={a.feedback ?? ""}
                        >
                          {a.feedback ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          tone={a.status === "Reviewed" ? "success" : "warning"}
                          withDot
                        >
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
            Submitted = awaiting teacher review. Reviewed = teacher has set marks
            and feedback.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-3 text-[13.5px] text-slate-700">
          <p>
            Use the stage filter to focus on items awaiting teacher action. The
            marks column stays empty until a teacher reviews and saves marks on
            the assignment.
          </p>
          <div>
            <Button variant="secondary" onClick={load}>
              <Eye className="h-4 w-4" aria-hidden="true" /> Refresh
            </Button>
          </div>
        </CardBody>
      </Card>
    </DashboardShell>
  );
}