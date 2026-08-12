"use client";

import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
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
import StatCard from "@/components/ui/StatCard";
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
        eyebrow="Catalog"
        title="My subjects"
        description="Subjects you are currently enrolled in."
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total subjects"
          value={subjects.length}
          icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
          tone="emerald"
          hint="Currently enrolled"
        />
        <StatCard
          label="Compulsory"
          value={compulsoryCount}
          icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}
          tone="blue"
          hint="Required by your level"
        />
        <StatCard
          label="Electives"
          value={electiveCount}
          icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
          tone="violet"
          hint="Of your own choosing"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Enrolled subjects</CardTitle>
              <CardDescription>
                {subjects.length} total · {compulsoryCount} required · {electiveCount} elective
              </CardDescription>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-700">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-[13px] text-slate-500">Loading…</p>
          ) : subjects.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No subjects yet"
                description="An administrator needs to enrol you in subjects before they appear here."
                icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {subjects.map((s) => (
                <li
                  key={s.subjectId}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50"
                >
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-700"
                    aria-hidden="true"
                  >
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-slate-900">
                      {s.subjectName}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {s.isCompulsory
                        ? "Compulsory"
                        : `Elective — ${s.electiveGroup ?? "Group"}${
                            s.electiveOption ? ` · ${s.electiveOption}` : ""
                          }`}
                    </p>
                  </div>
                  <Badge tone={s.isCompulsory ? "success" : "violet"} withDot>
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
