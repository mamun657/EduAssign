"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, BookOpen } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { TeacherAssignments } from "@/lib/api";
import type { TeacherAssignmentResponse } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export default function TeacherStudentsPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <TeacherStudents />
      </DashboardShell>
    </RouteGuard>
  );
}

function TeacherStudents() {
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
      { id: string; name: string; subjects: Set<string>; isActive: boolean }
    >();
    for (const link of links) {
      const existing = map.get(link.studentId);
      if (existing) {
        existing.subjects.add(link.subjectName);
      } else {
        map.set(link.studentId, {
          id: link.studentId,
          name: link.studentName,
          subjects: new Set([link.subjectName]),
          isActive: link.isActive,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [links]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roster"
        title="Students"
        description="Students currently assigned to you."
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total students"
          value={rows.length}
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          tone="emerald"
          hint="Currently assigned"
        />
        <StatCard
          label="Active links"
          value={links.length}
          icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
          tone="blue"
          hint="Across all subjects"
        />
        <StatCard
          label="Avg subjects / student"
          value={
            rows.length === 0
              ? "—"
              : (links.length / rows.length).toFixed(1)
          }
          icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
          tone="violet"
          hint="Workload indicator"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assigned students</CardTitle>
              <CardDescription>
                {rows.length} student{rows.length === 1 ? "" : "s"} · {links.length} link
                {links.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-emerald-50 text-emerald-700">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-[13px] text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No students assigned yet"
                description="An administrator needs to assign students and subjects to you before they appear here."
                icon={<Users className="h-6 w-6" aria-hidden="true" />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {rows.map((s) => (
                <li key={s.id} className="flex h-[60px] items-center gap-4 px-5">
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[12.5px] font-semibold text-emerald-700"
                    aria-hidden="true"
                  >
                    {initials(s.name) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-slate-900">{s.name}</p>
                    <p className="text-[12px] text-slate-500">
                      {s.subjects.size} subject{s.subjects.size === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
                    {Array.from(s.subjects).map((subj) => (
                      <Badge key={subj} tone="violet">
                        {subj}
                      </Badge>
                    ))}
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
