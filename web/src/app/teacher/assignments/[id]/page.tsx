"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ListChecks,
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
import { Assignments, Similarity } from "@/lib/api";
import type {
  Assignment,
  AssignmentStatus,
  SimilarityLevel,
  SimilaritySummary,
} from "@/lib/types";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
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

function levelTone(level: SimilarityLevel | string | undefined) {
  switch (level) {
    case "Low":
      return "emerald" as const;
    case "Moderate":
      return "amber" as const;
    case "High":
      return "rose" as const;
    default:
      return "slate" as const;
  }
}

function levelLabel(level: SimilarityLevel | string | undefined): string {
  switch (level) {
    case "High":
      return "High Similarity Detected";
    case "Moderate":
      return "Moderate Similarity";
    case "Low":
      return "Low Similarity";
    default:
      return "Pending";
  }
}

function percent(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${score.toFixed(2)}%`;
}

export default function TeacherAssignmentDetailPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <TeacherAssignmentDetail />
      </DashboardShell>
    </RouteGuard>
  );
}

function TeacherAssignmentDetail() {
  const params = useParams<{ id: string }>();
  const submissionId = params?.id ?? "";
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SimilaritySummary | null | undefined>(undefined);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  // 404 from submissionSummary means "NotAnalyzed yet" — don't surface as error.
  const notAnalyzed = useRef(false);
  const pollHandle = useRef<number | null>(null);

  const fetchSummary = useCallback(async (id: string) => {
    try {
      const s = await Similarity.submissionSummary(id);
      setSummary(s);
      notAnalyzed.current = false;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        notAnalyzed.current = true;
        setSummary(null);
        setSummaryError(null);
        return;
      }
      setSummaryError(
        (err as { message?: string })?.message ?? "Failed to load similarity",
      );
    }
  }, []);

  // Initial load: assignment + (optional) existing similarity summary.
  useEffect(() => {
    if (!user || !submissionId) return;
    let ok = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const a = await Assignments.get(submissionId);
        if (!ok) return;
        setAssignment(a);
        await fetchSummary(submissionId);
      } catch (err) {
        if (!ok) return;
        setError((err as { message?: string })?.message ?? "Failed to load assignment");
      } finally {
        if (ok) setLoading(false);
      }
    }
    void load();
    return () => {
      ok = false;
    };
  }, [user?.id, submissionId, fetchSummary]);

  // Stop any pending polling on unmount.
  useEffect(() => {
    return () => {
      if (pollHandle.current !== null) {
        window.clearTimeout(pollHandle.current);
        pollHandle.current = null;
      }
    };
  }, []);

  function stopPolling() {
    if (pollHandle.current !== null) {
      window.clearTimeout(pollHandle.current);
      pollHandle.current = null;
    }
  }

  // Poll every 2s while status is "Analyzing", up to ~60s of effort.
  // Cap total wall-clock time to avoid runaway polling on stuck jobs.
  function startPolling(id: string) {
    stopPolling();
    const startedAt = Date.now();
    const maxMs = 60_000;
    const tick = async () => {
      if (Date.now() - startedAt > maxMs) {
        stopPolling();
        return;
      }
      await fetchSummary(id);
      // Read summary via the closure's `summary` state? React gives us last
      // snapshot; safest is to read via the next scheduled tick from ref of last status.
      const last = currentStatusRef.current;
      if (last === "Completed" || last === "Failed" || notAnalyzed.current) {
        stopPolling();
        return;
      }
      pollHandle.current = window.setTimeout(tick, 2000);
    };
    pollHandle.current = window.setTimeout(tick, 0);
  }

  // Keep a ref of latest summary.status so the poll loop can stop itself.
  const currentStatusRef = useRef<string | null>(null);
  useEffect(() => {
    currentStatusRef.current = summary?.status ?? null;
  }, [summary?.status]);

  async function handleAnalyze() {
    if (!submissionId) return;
    setTriggering(true);
    setTriggerError(null);
    try {
      await Similarity.analyze(submissionId);
      // Optimistically flip to "Analyzing" so the user sees immediate feedback,
      // then poll for the real Completed/Failed transition.
      setSummary((prev) =>
        prev
          ? { ...prev, status: "Analyzing" }
          : {
              submissionId,
              assignmentId: submissionId,
              studentId: assignment?.studentId ?? "",
              studentName: assignment?.studentName ?? "",
              status: "Analyzing",
              overallScore: null,
              highestSimilarityScore: null,
              lexicalScore: null,
              semanticScore: null,
              level: "Unknown",
              matches: [],
            },
      );
      startPolling(submissionId);
    } catch (err) {
      setTriggerError(
        (err as { message?: string })?.message ?? "Failed to start similarity analysis",
      );
    } finally {
      setTriggering(false);
    }
  }

  async function handleRefreshResult() {
    if (!submissionId) return;
    setSummaryError(null);
    await fetchSummary(submissionId);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assignment" />
        <p className="text-sm text-[#6B7280]">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assignment"
          actions={
            <Link href="/teacher/assignments">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
              </Button>
            </Link>
          }
        />
        <Alert tone="error">{error}</Alert>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assignment" />
        <EmptyState
          title="Not found"
          description="The requested assignment does not exist or is not accessible."
          icon={<FileText className="h-6 w-6" aria-hidden="true" />}
        />
      </div>
    );
  }

  const submitted = !!assignment.submittedAt;
  const hasResult =
    summary !== undefined &&
    summary !== null &&
    summary.status === "Completed";
  const hasFailed =
    summary !== undefined && summary !== null && summary.status === "Failed";
  const analyzing =
    summary !== undefined && summary !== null && summary.status === "Analyzing";

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.title || "Assignment"}
        description={`Student: ${assignment.studentName} · Subject: ${assignment.subjectName}`}
        actions={
          <Link href="/teacher/assignments">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All assignments
            </Button>
          </Link>
        }
      />

      {/* --- Assignment brief --- */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Brief</CardTitle>
              <CardDescription>
                Due {formatDate(assignment.dueDate)} · created {formatDate(assignment.createdAt)}
              </CardDescription>
            </div>
            <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          {assignment.description ? (
            <p className="whitespace-pre-wrap text-sm text-[#111827]">{assignment.description}</p>
          ) : (
            <p className="text-sm italic text-[#6B7280]">No description provided.</p>
          )}
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Submitted
              </dt>
              <dd className="text-sm text-[#111827]">{formatDate(assignment.submittedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Submission File
              </dt>
              <dd className="text-sm text-[#111827]">
                {assignment.submissionFileName ? (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {assignment.submissionFileName}
                  </span>
                ) : (
                  <span className="italic text-[#6B7280]">No file uploaded</span>
                )}
              </dd>
            </div>
            {assignment.marks != null ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                  Marks
                </dt>
                <dd className="text-sm text-[#111827]">{assignment.marks}</dd>
              </div>
            ) : null}
            {assignment.feedback ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                  Feedback
                </dt>
                <dd className="whitespace-pre-wrap text-sm text-[#111827]">{assignment.feedback}</dd>
              </div>
            ) : null}
          </dl>
        </CardBody>
      </Card>

      {/* --- Similarity panel --- */}
      <Card data-testid="similarity-panel">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Similarity Analysis</CardTitle>
              <CardDescription>
                Cosine + lexical comparison against peer submissions in this assignment.
                Scores come from the analysis pipeline — re-running reuses prior embeddings.
              </CardDescription>
            </div>
            {hasResult ? (
              <Badge tone={levelTone(summary.level)} data-level={summary.level}>
                {levelLabel(summary.level)} · {percent(summary.highestSimilarityScore)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {!submitted ? (
            <EmptyState
              title="No submission yet"
              description="Similarity analysis can be run once the student has submitted work."
              icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleAnalyze}
                  loading={triggering || analyzing}
                  disabled={triggering || analyzing}
                  data-testid="analyze-similarity-button"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {analyzing
                    ? "Analyzing…"
                    : summary && summary.status !== "NotAnalyzed"
                    ? "Re-analyze Similarity"
                    : "Analyze Similarity"}
                </Button>
                {summary && summary.status !== "NotAnalyzed" ? (
                  <Button
                    variant="secondary"
                    onClick={handleRefreshResult}
                    disabled={analyzing}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh result
                  </Button>
                ) : null}
              </div>

              {triggerError ? <Alert tone="error">{triggerError}</Alert> : null}
              {summaryError ? <Alert tone="error">{summaryError}</Alert> : null}

              {analyzing ? (
                <Alert tone="info">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Analysis is running on the server. This page will refresh automatically.
                  </span>
                </Alert>
              ) : null}

              {/* --- Not analyzed yet --- */}
              {summary === null || summary === undefined ? (
                <EmptyState
                  title="Similarity analysis has not been performed yet"
                  description="Click 'Analyze Similarity' to queue a comparison against peer submissions in this assignment."
                  icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}
                />
              ) : null}

              {/* --- Failed --- */}
              {hasFailed ? (
                <Alert tone="error">
                  <span className="inline-flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                    <span>
                      <strong>Analysis failed.</strong>{" "}
                      {summary.errorMessage ?? "See server logs for details."}
                    </span>
                  </span>
                </Alert>
              ) : null}

              {/* --- Completed --- */}
              {hasResult ? (
                <div className="space-y-4" data-testid="similarity-result">
                  {/* Top-line numbers */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div
                      className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                      data-testid="similarity-score-tile"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                        Highest Similarity
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-[#111827]" data-testid="similarity-score">
                        {percent(summary.highestSimilarityScore)}
                      </div>
                      <div className="text-xs text-[#6B7280]">vs {summary.comparedStudentName ?? "peer"}</div>
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Lexical (TF‑IDF)
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-[#111827]">
                        {percent(summary.lexicalScore)}
                      </div>
                      <div className="text-xs text-[#6B7280]">Token overlap</div>
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Semantic (MiniLM cosine)
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-[#111827]">
                        {percent(summary.semanticScore)}
                      </div>
                      <div className="text-xs text-[#6B7280]">384‑dim embedding</div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
                      Status: {summary.status}
                    </span>
                    <span>Analyzed: {formatDate(summary.analyzedAt)}</span>
                  </div>

                  {/* Peer matches */}
                  {summary.matches && summary.matches.length > 0 ? (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#111827]">
                        <ListChecks className="h-4 w-4" aria-hidden="true" />
                        Closest peer submissions
                      </div>
                      <ul className="divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB]">
                        {summary.matches.map((m, idx) => (
                          <li
                            key={`${m.submissionId}-${idx}`}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                            data-testid="similarity-peer-row"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-[#111827]">{m.studentName}</p>
                              <p className="text-xs text-[#6B7280]">
                                Submission {m.submissionId.slice(0, 12)}…
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                              <span>Lexical {m.lexicalScore.toFixed(2)}%</span>
                              <span>Semantic {m.semanticScore.toFixed(2)}%</span>
                              {/* Score only — no separate classification here. */}
                              <Badge tone="slate">{m.finalScore.toFixed(2)}%</Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <Alert tone="info">
                      No peer submissions to compare against in this assignment yet. The
                      analysis completed with no matches (0% similarity).
                    </Alert>
                  )}
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
