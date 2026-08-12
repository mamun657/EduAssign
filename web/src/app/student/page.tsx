"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  ArrowRight,
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
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { Assignments, Students } from "@/lib/api";
import type {
  Assignment,
  AssignmentStatus,
  AvailableCurriculum,
  CurriculumSubject,
  EnrolledSubject,
} from "@/lib/types";

function formatDate(iso: string): string {
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

export default function StudentDashboardPage() {
  return (
    <RouteGuard roles={["Student"]}>
      <DashboardShell role="Student">
        <StudentDashboard />
      </DashboardShell>
    </RouteGuard>
  );
}

function StudentDashboard() {
  const { user } = useAuth();
  const [available, setAvailable] = useState<AvailableCurriculum | null>(null);
  const [enrolled, setEnrolled] = useState<EnrolledSubject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [a, e, asg] = await Promise.all([
        Students.availableSubjects(),
        Students.enrolledSubjects(),
        Assignments.list(),
      ]);
      setAvailable(a);
      setEnrolled(e);
      setAssignments(asg);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const enrolledIds = useMemo(
    () => new Set(enrolled.map((s) => s.subjectId)),
    [enrolled],
  );

  const groupState = useMemo(() => {
    const out = new Map<string, { max: number; selected: number }>();
    available?.electiveGroups.forEach((g) => {
      const selected = enrolled.filter((e) => e.electiveGroup === g.name).length;
      out.set(g.name, { max: g.maxChoicesInGroup, selected });
    });
    return out;
  }, [available, enrolled]);

  const stats = useMemo(() => {
    const outstanding = assignments.filter(
      (a) => a.status === "Published" || a.status === "Submitted",
    ).length;
    const reviewed = assignments.filter((a) => a.status === "Reviewed").length;
    return { outstanding, reviewed, enrolled: enrolled.length };
  }, [assignments, enrolled.length]);

  async function enroll(s: CurriculumSubject) {
    setBusy(s.subjectId);
    setError(null);
    try {
      await Students.enroll({ subjectId: s.subjectId });
      await refresh();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Enrollment failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(subjectId: string) {
    setBusy(subjectId);
    setError(null);
    try {
      await Students.remove(subjectId);
      await refresh();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Could not remove");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Welcome${user?.firstName ? `, ${user.firstName}` : ""}`}
        title="Your dashboard"
        description={
          available
            ? `${available.academicLevelName} curriculum · ${enrolled.length} subject(s) enrolled`
            : "Loading your curriculum…"
        }
        actions={
          <Link href="/student/assignments">
            <Button variant="success">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              View assignments
            </Button>
          </Link>
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Enrolled"
          value={stats.enrolled}
          icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
          tone="emerald"
          hint="Active subjects"
        />
        <StatCard
          label="Outstanding"
          value={stats.outstanding}
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          tone="warning"
          hint="Published or submitted"
        />
        <StatCard
          label="Reviewed"
          value={stats.reviewed}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          tone="success"
          hint="With marks"
        />
      </div>

      {loading ? (
        <Card>
          <CardBody>
            <p className="text-[13px] text-slate-500">Loading…</p>
          </CardBody>
        </Card>
      ) : available ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Compulsory subjects</CardTitle>
                  <CardDescription>
                    Pre-selected for your level. Review only — cannot be removed.
                  </CardDescription>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-700">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <ul className="divide-y divide-slate-200">
                {available.compulsorySubjects.map((s) => {
                  const isEnrolled = enrolledIds.has(s.subjectId);
                  return (
                    <li
                      key={s.subjectId}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-slate-900">
                          {s.subjectName}
                        </p>
                        <p className="text-[12px] text-slate-500">{s.subjectCode}</p>
                      </div>
                      {isEnrolled ? (
                        <Badge tone="success" withDot>
                          Enrolled
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="success"
                          loading={busy === s.subjectId}
                          onClick={() => enroll(s)}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Enroll
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>

          {available.electiveGroups.map((g) => {
            const state = groupState.get(g.name) ?? {
              max: g.maxChoicesInGroup,
              selected: 0,
            };
            const remaining = state.max - state.selected;
            const hasOptions = (g.options?.length ?? 0) > 0;
            const chosenOptionKey = hasOptions
              ? (enrolled.find(
                  (e) => e.electiveGroup === g.name && e.electiveOption != null,
                )?.electiveOption ?? null)
              : null;
            const atLimit = remaining <= 0;
            return (
              <Card key={g.name}>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>{g.name}</CardTitle>
                      <CardDescription>
                        Choose exactly {g.maxChoicesInGroup}. You have{" "}
                        {state.selected} selected
                        {remaining >= 0
                          ? ` · ${remaining} remaining`
                          : " · limit reached"}
                        .
                      </CardDescription>
                    </div>
                    <Badge tone={atLimit ? "success" : "warning"} withDot>
                      {state.selected} / {g.maxChoicesInGroup}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  {hasOptions
                    ? g.options!.map((opt) => {
                        const anyEnrolled = opt.subjects.some((s) =>
                          enrolledIds.has(s.subjectId),
                        );
                        const anotherOptionTaken =
                          chosenOptionKey != null && chosenOptionKey !== opt.key;
                        return (
                          <div
                            key={opt.key}
                            className="border-t border-slate-200 px-5 py-4 first:border-t-0"
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <p className="text-[13.5px] font-semibold text-slate-900">
                                {opt.displayName}
                              </p>
                              {anyEnrolled ? (
                                <Badge tone="success" withDot>
                                  Selected
                                </Badge>
                              ) : anotherOptionTaken ? (
                                <Badge tone="neutral" withDot>
                                  <Lock className="mr-1 inline-block h-3 w-3" aria-hidden="true" />
                                  Locked
                                </Badge>
                              ) : null}
                            </div>
                            <ul className="divide-y divide-slate-200 rounded-[10px] border border-slate-200">
                              {opt.subjects.map((s) => {
                                const isEnrolled = enrolledIds.has(s.subjectId);
                                const blocked = anotherOptionTaken && !isEnrolled;
                                const siblingTaken = anyEnrolled && !isEnrolled;
                                const disabled = blocked || siblingTaken;
                                return (
                                  <li
                                    key={s.subjectId}
                                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-[13.5px] font-medium text-slate-900">
                                        {s.subjectName}
                                      </p>
                                      <p className="text-[12px] text-slate-500">
                                        {s.subjectCode}
                                      </p>
                                    </div>
                                    {isEnrolled ? (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        loading={busy === s.subjectId}
                                        onClick={() => remove(s.subjectId)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        Remove
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="success"
                                        disabled={disabled}
                                        loading={busy === s.subjectId}
                                        onClick={() => enroll(s)}
                                      >
                                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                        {disabled
                                          ? siblingTaken
                                            ? "Already enrolled"
                                            : "Limit reached"
                                          : "Enroll"}
                                      </Button>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })
                    : (
                      <ul className="divide-y divide-slate-200">
                        {g.subjects.map((s) => {
                          const isEnrolled = enrolledIds.has(s.subjectId);
                          const atLimitLocal = !isEnrolled && atLimit;
                          return (
                            <li
                              key={s.subjectId}
                              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-[13.5px] font-medium text-slate-900">
                                  {s.subjectName}
                                </p>
                                <p className="text-[12px] text-slate-500">
                                  {s.subjectCode}
                                </p>
                              </div>
                              {isEnrolled ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  loading={busy === s.subjectId}
                                  onClick={() => remove(s.subjectId)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Remove
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="success"
                                  disabled={atLimitLocal}
                                  loading={busy === s.subjectId}
                                  onClick={() => enroll(s)}
                                >
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                  {atLimitLocal ? "Limit reached" : "Enroll"}
                                </Button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                </CardBody>
              </Card>
          );
          })}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>My assignments</CardTitle>
                  <CardDescription>
                    Submit your work before the due date.
                  </CardDescription>
                </div>
                <Link
                  href="/student/assignments"
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-slate-700 hover:text-slate-900"
                >
                  See all
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {assignments.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No assignments yet"
                    description="Your teachers will publish assignments here."
                    icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11.5px] uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th scope="col" className="px-5 py-2.5 font-semibold">Title</th>
                        <th scope="col" className="px-5 py-2.5 font-semibold">Subject</th>
                        <th scope="col" className="px-5 py-2.5 font-semibold">Due</th>
                        <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
                        <th scope="col" className="px-5 py-2.5 font-semibold">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {assignments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="h-[52px] px-5 align-middle">
                            <Link
                              href={`/student/assignments/${a.id}`}
                              className="font-medium text-slate-900 hover:text-emerald-700"
                            >
                              {a.title}
                            </Link>
                          </td>
                          <td className="h-[52px] px-5 align-middle text-slate-700">
                            {a.subjectName}
                          </td>
                          <td className="h-[52px] px-5 align-middle text-slate-500">
                            {formatDate(a.dueDate)}
                          </td>
                          <td className="h-[52px] px-5 align-middle">
                            <Badge tone={statusTone(a.status)} withDot>
                              {a.status}
                            </Badge>
                          </td>
                          <td className="h-[52px] px-5 align-middle text-slate-700">
                            {a.marks ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}