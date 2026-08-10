"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Assignments, Students } from "@/lib/api";
import type {
  Assignment,
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
    refresh();
  }, []);

  const enrolledIds = new Set(enrolled.map((s) => s.subjectId));

  const groupState = (() => {
    const out = new Map<string, { max: number; selected: number }>();
    available?.electiveGroups.forEach((g) => {
      const selected = enrolled.filter((e) => e.electiveGroup === g.name).length;
      out.set(g.name, { max: g.maxChoicesInGroup, selected });
    });
    return out;
  })();

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
    <div className="space-y-8">
      <PageHeader
        title={`Hello, ${user?.firstName}`}
        description={
          available
            ? `${available.academicLevelName} curriculum · ${enrolled.length} subject(s) enrolled`
            : undefined
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-[#6B7280]">Loading…</p>
      ) : available ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Compulsory subjects</CardTitle>
              <CardDescription>
                Pre-selected for your level. You can review but cannot drop them.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {available.compulsorySubjects.map((s) => {
                  const isEnrolled = enrolledIds.has(s.subjectId);
                  return (
                    <div
                      key={s.subjectId}
                      className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{s.subjectName}</p>
                        <p className="text-xs text-[#6B7280]">{s.subjectCode}</p>
                      </div>
                      {isEnrolled ? (
                        <Badge tone="emerald">Enrolled</Badge>
                      ) : (
                        <Button
                          size="sm"
                          loading={busy === s.subjectId}
                          onClick={() => enroll(s)}
                        >
                          Enroll
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {available.electiveGroups.map((g) => {
            const state = groupState.get(g.name) ?? { max: g.maxChoicesInGroup, selected: 0 };
            const remaining = state.max - state.selected;
            const hasOptions = (g.options?.length ?? 0) > 0;
            const chosenOptionKey = hasOptions
              ? enrolled.find(
                  (e) =>
                    e.electiveGroup === g.name &&
                    e.electiveOption != null
                )?.electiveOption ?? null
              : null;
            return (
              <Card key={g.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{g.name}</CardTitle>
                      <CardDescription>
                        Choose exactly {g.maxChoicesInGroup}. You have {state.selected} selected
                        {remaining >= 0 ? ` · ${remaining} remaining` : " · limit reached"}.
                      </CardDescription>
                    </div>
                    <Badge tone={remaining === 0 ? "emerald" : "amber"}>
                      {state.selected} / {g.maxChoicesInGroup}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  {hasOptions
                    ? g.options!.map((opt) => {
                        const anyEnrolled = opt.subjects.some((s) =>
                          enrolledIds.has(s.subjectId)
                        );
                        const anotherOptionTaken =
                          chosenOptionKey != null && chosenOptionKey !== opt.key;
                        return (
                          <div key={opt.key}>
                            <div className="mb-2 flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#111827]">
                                {opt.displayName}
                              </p>
                              {anyEnrolled ? (
                                <Badge tone="emerald">Selected</Badge>
                              ) : anotherOptionTaken ? (
                                <Badge tone="slate">Locked</Badge>
                              ) : null}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {opt.subjects.map((s) => {
                                const isEnrolled = enrolledIds.has(s.subjectId);
                                const blocked = anotherOptionTaken && !isEnrolled;
                                const siblingTaken = anyEnrolled && !isEnrolled;
                                const disabled = blocked || siblingTaken;
                                return (
                                  <div
                                    key={s.subjectId}
                                    className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-4 py-3"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-[#111827]">
                                        {s.subjectName}
                                      </p>
                                      <p className="text-xs text-[#6B7280]">{s.subjectCode}</p>
                                    </div>
                                    {isEnrolled ? (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        loading={busy === s.subjectId}
                                        onClick={() => remove(s.subjectId)}
                                      >
                                        Remove
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        disabled={disabled}
                                        loading={busy === s.subjectId}
                                        onClick={() => enroll(s)}
                                      >
                                        {disabled
                                          ? siblingTaken
                                            ? "Already enrolled"
                                            : "Limit reached"
                                          : "Enroll"}
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    : g.subjects.map((s) => {
                        const isEnrolled = enrolledIds.has(s.subjectId);
                        const atLimit = !isEnrolled && remaining <= 0;
                        return (
                          <div
                            key={s.subjectId}
                            className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-[#111827]">{s.subjectName}</p>
                              <p className="text-xs text-[#6B7280]">{s.subjectCode}</p>
                            </div>
                            {isEnrolled ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                loading={busy === s.subjectId}
                                onClick={() => remove(s.subjectId)}
                              >
                                Remove
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={atLimit}
                                loading={busy === s.subjectId}
                                onClick={() => enroll(s)}
                              >
                                {atLimit ? "Limit reached" : "Enroll"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                </CardBody>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle>My assignments</CardTitle>
              <CardDescription>
                Submit your work before the due date.
              </CardDescription>
            </CardHeader>
            <CardBody>
              {assignments.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No assignments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                      <tr>
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Subject</th>
                        <th className="py-2 pr-4">Due</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {assignments.map((a) => (
                        <tr key={a.id} className="text-[#374151]">
                          <td className="py-3 pr-4 font-medium text-[#111827]">{a.title}</td>
                          <td className="py-3 pr-4">{a.subjectName}</td>
                          <td className="py-3 pr-4">{formatDate(a.dueDate)}</td>
                          <td className="py-3 pr-4">
                            <Badge
                              tone={
                                a.status === "Reviewed"
                                  ? "emerald"
                                  : a.status === "Submitted"
                                  ? "sky"
                                  : a.status === "Published"
                                  ? "amber"
                                  : "slate"
                              }
                            >
                              {a.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">{a.marks ?? "—"}</td>
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