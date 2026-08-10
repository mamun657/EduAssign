"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, Filter, CheckCircle2, Eye, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
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

function similarityLevelTone(
  level: SimilarityLevel | string | undefined,
): "emerald" | "amber" | "rose" | "slate" {
  switch (level) {
    case "Low":
      return "emerald";
    case "Moderate":
      return "amber";
    case "High":
      return "rose";
    default:
      return "slate";
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
  // Per-submission similarity summary cache. A missing key means "NotAnalyzed".
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
        setAssignments(list.filter((a) => a.status === "Submitted" || a.status === "Reviewed"));
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

  // Fetch similarity summaries in parallel for the Submitted/Reviewed rows.
  // 404 = "NotAnalyzed yet", which we treat as "no result" rather than an error.
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
          } catch (err) {
            const status = (err as { status?: number })?.status;
            if (status === 404) return { id: a.id, summary: null };
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
        title="Submissions"
        description="Review student work, give marks and feedback."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{submittedCount}</p>
            <p className="mt-1 text-xs text-[#6B7280]">Awaiting your review</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Reviewed</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{reviewedCount}</p>
            <p className="mt-1 text-xs text-[#6B7280]">Closed with marks</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Total</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{assignments.length}</p>
            <p className="mt-1 text-xs text-[#6B7280]">Submitted or reviewed</p>
          </CardBody>
        </Card>
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
        <CardBody>
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
          ) : filtered.length === 0 ? (
            assignments.length === 0 ? (
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
            )
          ) : (
            <ul className="divide-y divide-[#E5E7EB]">
              {filtered.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111827]">{a.title}</p>
                    <p className="text-xs text-[#6B7280]">
                      {a.studentName} · {a.subjectName} · submitted{" "}
                      {a.submittedAt ? formatDateTime(a.submittedAt) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(a.status)}>
                      {a.status === "Reviewed" ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Reviewed
                        </span>
                      ) : (
                        a.status
                      )}
                    </Badge>
                    {(() => {
                      const sim = similarityBySub[a.id];
                      if (!sim) {
                        return (
                          <Badge tone="slate" className="gap-1">
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            Not analyzed
                          </Badge>
                        );
                      }
                      if (sim.status === "Analyzing") {
                        return (
                          <Badge tone="slate" className="gap-1">
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
                            <Badge tone={similarityLevelTone(sim.level)}>
                              {similarityPercent(sim.highestSimilarityScore)}
                            </Badge>
                            <span className="text-xs text-[#6B7280]">
                              {sim.level === "High"
                                ? "High Similarity Detected"
                                : sim.level}
                            </span>
                          </span>
                        );
                      }
                      if (sim.status === "Failed") {
                        return (
                          <Badge tone="rose">Analysis failed</Badge>
                        );
                      }
                      return (
                        <Badge tone="slate">Not analyzed</Badge>
                      );
                    })()}
                    {a.status === "Reviewed" && a.marks != null ? (
                      <span className="text-xs font-medium text-[#111827]">
                        Marks: {a.marks}
                      </span>
                    ) : null}
                    <Link
                      href={`/teacher/submissions/${a.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB]"
                      aria-label={`Review ${a.title}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href={`/teacher/assignments/${a.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB]"
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
