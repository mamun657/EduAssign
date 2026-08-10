"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { TeacherAssignments } from "@/lib/api";
import type { TeacherAssignmentResponse } from "@/lib/types";

export default function TeacherSubjectsPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <TeacherSubjects />
      </DashboardShell>
    </RouteGuard>
  );
}

function TeacherSubjects() {
  const { user } = useAuth();
  const [links, setLinks] = useState<TeacherAssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let ok = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await TeacherAssignments.mine();
        if (!ok) return;
        setLinks(data.filter((l) => l.isActive));
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

  const rows = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; students: Set<string> }
    >();
    for (const link of links) {
      const existing = map.get(link.subjectId);
      if (existing) {
        existing.students.add(link.studentId);
      } else {
        map.set(link.subjectId, {
          id: link.subjectId,
          name: link.subjectName,
          students: new Set([link.studentId]),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [links]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Subjects you currently teach, with assigned student counts."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm text-[#6B7280]">Loading…</p>
        ) : rows.length === 0 ? (
          <Card className="sm:col-span-2 xl:col-span-3">
            <CardBody>
              <EmptyState
                title="No subjects assigned yet"
                description="An administrator needs to assign at least one subject before the dashboard is useful."
                icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
              />
            </CardBody>
          </Card>
        ) : (
          rows.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{s.name}</CardTitle>
                  </div>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB] text-[#374151]">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-2 text-sm text-[#111827]">
                  <Users className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
                  <span>
                    {s.students.size} student{s.students.size === 1 ? "" : "s"}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
