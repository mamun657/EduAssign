"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Filter,
  CheckCircle2,
  Eye,
  Sparkles,
  ClipboardList,
  Timer,
  Star,
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
import { Assignments, Similarity } from "@/lib/api";
import type {
  Assignment,
  AssignmentStatus,
  SimilarityLevel,
  SimilaritySummary,
} from "@/lib/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

function similarityLevelTone(
  level: SimilarityLevel | string | undefined,
): "success" | "warning" | "danger" | "neutral" {
  switch (level) {
    case "Low":
      return "success";
    case "Moderate":
      return "warning";
    case "High":
      return "danger";
    default:
      return "neutral";
  }
}

function similarityPercent(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${score.toFixed(2)}%`;
}

const FILTER_OPTIONS: { value: AssignmentStatus | "All"; label: string }[] = [
  { value: "Submitted", label: "Pending review" },
  { value: "Reviewed", label: "Reviewed" },
  { value: "All", label: "All submitted" },
];

export default function TeacherSubmissionsPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <TeacherSubmissions />
      </DashboardShell>
    </RouteGuard>
  );
}

function TeacherSubmissions() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssignmentStatus | "All">("Submitted");
  const [similarityBySub, setSimilarityBySub] = useState<
    Record<string, SimilaritySummary>
  >({});
  const [similarityLoading, setSimilarityLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let ok = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await Assignments.list();
        if (!ok) return;
        setAssignments(
          list.filter((a) => a.status === "Submitted" || a.status === "Reviewed"),
        );
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

  useEffect(() => {
    if (assignments.length === 0) return;
    let ok = true;
    async function loadSimilarity() {
      setSimilarityLoading(true);
      const targets = assignments.filter((a) => !!a.submittedAt);
      const results = await Promise.all(
        targets.map(async (a) => {
          try {
            const s = await Similarity.submissionSummary(a.id);
            return { id: a.id, summary: s };
          } catch {
            return { id: a.id, summary: null };
          }
        }),
      );
      if (!ok) return;
      const map: Record<string, SimilaritySummary> = {};
      for (const r of results) {
        if (r.summary) map[r.id] = r.summary;
      }
      setSimilarityBySub(map);
      setSimilarityLoading(false);
    }
    void loadSimilarity();
    return () => {
      ok = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments]);

  const filtered = useMemo(() => {
    if (filter === "All") return assignments;
    return assignments.filter((a) => a.status === filter);
  }, [assignments, filter]);

  const submittedCount = assignments.filter((a) => a.status === "Submitted").length;
  const reviewedCount = assignments.filter((a) => a.status === "Reviewed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review queue"
        title="Submissions"
        description="Review student work, run similarity analysis, and award marks."
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending"
          value={submittedCount}
          icon={<Timer className="h-5 w-5" aria-hidden="true" />}
          tone="info"
          hint="Awaiting your review"
        />
        <StatCard
          label="Reviewed"
          value={reviewedCount}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          tone="success"
          hint="Closed with marks"
        />
        <StatCard
          label="Total"
          value={assignments.length}
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          tone="slate"
          hint="Submitted or reviewed"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>
                {assignments.length} total · showing {filtered.length}
              </CardDescription>
            </div>
            <div className="w-full sm:w-56">
              <Select
                aria-label="Filter submissions"
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
                  title="No submissions yet"
                  description="Submissions appear here once students turn in work."
                  icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
                />
              ) : (
                <EmptyState
                  title="No matches"
                  description={`No submissions with status "${filter}".`}
                  icon={<Filter className="h-6 w-6" aria-hidden="true" />}
                />
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {filtered.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-slate-900">
                      {a.title}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {a.studentName} · {a.subjectName} · submitted{" "}
                      {a.submittedAt ? formatDateTime(a.submittedAt) : "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(a.status)} withDot>
                      {a.status === "Reviewed" ? "Reviewed" : a.status}
                    </Badge>
                    {(() => {
                      const sim = similarityBySub[a.id];
                      if (!sim) {
                        return (
                          <Badge tone="neutral" className="gap-1">
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            {similarityLoading ? "Loading…" : "Not analyzed"}
                          </Badge>
                        );
                      }
                      if (sim.status === "Analyzing") {
                        return (
                          <Badge tone="neutral" className="gap-1">
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Analyzing…
                          </Badge>
                        );
                      }
                      if (sim.status === "Completed") {
                        return (
                          <span
                            data-testid="similarity-row-badge"
                            data-level={sim.level}
                            className="inline-flex items-center gap-2"
                          >
                            <Badge tone={similarityLevelTone(sim.level)} withDot>
                              {similarityPercent(sim.highestSimilarityScore)}
                            </Badge>
                            <span className="text-[12px] text-slate-500">
                              {sim.level === "High"
                                ? "High Similarity Detected"
                                : sim.level}
                            </span>
                          </span>
                        );
                      }
                      if (sim.status === "Failed") {
                        return <Badge tone="danger">Analysis failed</Badge>;
                      }
                      return <Badge tone="neutral">Not analyzed</Badge>;
                    })()}
                    {a.status === "Reviewed" && a.marks != null ? (
                      <span className="inline-flex items-center gap-1 rounded-[9px] border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-800">
                        <Star className="h-3 w-3 text-amber-600" aria-hidden="true" />
                        Marks: {a.marks}
                      </span>
                    ) : null}
                    <Link
                      href={`/teacher/submissions/${a.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-slate-300 bg-white px-2.5 text-[12.5px] font-medium text-slate-800 hover:bg-slate-50"
                      aria-label={`Review ${a.title}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Review
                    </Link>
                    <Link
                      href={`/teacher/assignments/${a.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      aria-label={`Similarity analysis for ${a.title}`}
                      title="Similarity analysis"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
