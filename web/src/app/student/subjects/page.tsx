"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { Students } from "@/lib/api";
import type { EnrolledSubject } from "@/lib/types";

export default function StudentSubjectsPage() {
  return (
    <RouteGuard roles={["Student"]}>
      <DashboardShell role="Student">
        <StudentSubjects />
      </DashboardShell>
    </RouteGuard>
  );
}

function StudentSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<EnrolledSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let ok = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await Students.enrolledSubjects();
        if (!ok) return;
        setSubjects(data);
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

  const compulsoryCount = subjects.filter((s) => s.isCompulsory).length;
  const electiveCount = subjects.length - compulsoryCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Subjects you are currently enrolled in."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Total subjects
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#111827]">
                {subjects.length}
              </p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#065F46]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Compulsory
            </p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">
              {compulsoryCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Electives
            </p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">
              {electiveCount}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled subjects</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
          ) : subjects.length === 0 ? (
            <EmptyState
              title="No subjects yet"
              description="An administrator needs to enrol you in subjects before they appear here."
              icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
            />
          ) : (
            <ul className="divide-y divide-[#E5E7EB]">
              {subjects.map((s) => (
                <li key={s.subjectId} className="flex items-center gap-4 py-3">
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0F9FF] text-[#075985]"
                    aria-hidden="true"
                  >
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111827]">
                      {s.subjectName}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {s.isCompulsory
                        ? "Compulsory"
                        : `Elective — ${s.electiveGroup ?? "Group"}${s.electiveOption ? ` · ${s.electiveOption}` : ""}`}
                    </p>
                  </div>
                  <Badge tone={s.isCompulsory ? "emerald" : "sky"}>
                    {s.isCompulsory ? "Required" : "Elective"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
