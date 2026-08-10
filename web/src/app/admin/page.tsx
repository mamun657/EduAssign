"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCog,
  BookOpen,
  GraduationCap,
  ClipboardList,
  Inbox,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  AcademicLevels,
  Admin,
  Assignments,
  Subjects,
} from "@/lib/api";
import type {
  AcademicLevel,
  AdminStudentListItem,
  AdminTeacherListItem,
  Assignment,
  Subject,
} from "@/lib/types";

export default function AdminOverviewPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <Overview />
    </RouteGuard>
  );
}

function Overview() {
  const { user } = useAuth();
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherListItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, t, sub, lvl, asg] = await Promise.all([
          Admin.students(),
          Admin.teachers(),
          Subjects.list(),
          AcademicLevels.list(),
          Assignments.list(),
        ]);
        setStudents(s);
        setTeachers(t);
        setSubjects(sub);
        setLevels(lvl);
        setAssignments(asg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const activeStudents = students.filter((s) => s.isActive).length;
    const activeTeachers = teachers.filter((t) => t.isActive).length;
    const activeSubjects = subjects.filter((s) => s.isActive).length;
    const submitted = assignments.filter(
      (a) => a.status === "Submitted" || a.status === "Reviewed",
    ).length;
    const pendingReview = assignments.filter((a) => a.status === "Submitted").length;
    return {
      activeStudents,
      activeTeachers,
      activeSubjects,
      totalAssignments: assignments.length,
      submitted,
      pendingReview,
    };
  }, [students, teachers, subjects, assignments]);

  const recentAssignments = useMemo(() => {
    return [...assignments]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 5);
  }, [assignments]);

  const recentStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 5);
  }, [students]);

  return (
    <DashboardShell role="Admin">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? "Admin"}`}
        description="Operational snapshot of students, teachers, subjects and assignments."
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Users}
          label="Active students"
          value={counts.activeStudents}
          loading={loading}
          href="/admin/students"
        />
        <StatCard
          icon={UserCog}
          label="Active teachers"
          value={counts.activeTeachers}
          loading={loading}
          href="/admin/teachers"
        />
        <StatCard
          icon={BookOpen}
          label="Active subjects"
          value={counts.activeSubjects}
          loading={loading}
          href="/admin/subjects"
        />
        <StatCard
          icon={GraduationCap}
          label="Academic levels"
          value={levels.length}
          loading={loading}
          href="/admin/curriculum"
        />
        <StatCard
          icon={ClipboardList}
          label="Total assignments"
          value={counts.totalAssignments}
          loading={loading}
          href="/admin/assignments"
        />
        <StatCard
          icon={Inbox}
          label="Pending review"
          value={counts.pendingReview}
          loading={loading}
          href="/admin/submissions"
          accent={counts.pendingReview > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Secondary stats */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#16A34A]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280]">Submissions</p>
              <p className="text-xl font-semibold text-[#111827]">
                {loading ? "—" : counts.submitted}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#F59E0B]">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280]">Drafts</p>
              <p className="text-xl font-semibold text-[#111827]">
                {loading ? "—" : assignments.filter((a) => a.status === "Draft").length}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280]">Reviewed</p>
              <p className="text-xl font-semibold text-[#111827]">
                {loading ? "—" : assignments.filter((a) => a.status === "Reviewed").length}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent assignments</CardTitle>
                <CardDescription>Last 5 assignments created.</CardDescription>
              </div>
              <Link
                href="/admin/assignments"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#16A34A] hover:underline"
              >
                View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <p className="text-sm text-[#6B7280]">Loading…</p>
            ) : recentAssignments.length === 0 ? (
              <EmptyState
                title="No assignments yet"
                description="Teachers can create assignments for the students assigned to them."
              />
            ) : (
              <ul className="divide-y divide-[#E5E7EB]">
                {recentAssignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#111827]">
                        {a.title}
                      </p>
                      <p className="truncate text-xs text-[#6B7280]">
                        {a.teacherName} → {a.studentName} · {a.subjectName}
                      </p>
                    </div>
                    <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent students</CardTitle>
                <CardDescription>Last 5 students registered.</CardDescription>
              </div>
              <Link
                href="/admin/students"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#16A34A] hover:underline"
              >
                View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <p className="text-sm text-[#6B7280]">Loading…</p>
            ) : recentStudents.length === 0 ? (
              <EmptyState
                title="No students yet"
                description="Students register themselves. They'll appear here once they sign up."
              />
            ) : (
              <ul className="divide-y divide-[#E5E7EB]">
                {recentStudents.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#111827]">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="truncate text-xs text-[#6B7280]">
                        {s.email} · {s.academicLevelName ?? "No level"}
                      </p>
                    </div>
                    <Badge tone={s.isActive ? "emerald" : "rose"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  href,
  accent = "neutral",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  loading: boolean;
  href: string;
  accent?: "neutral" | "warning";
}) {
  const accentClass =
    accent === "warning"
      ? "bg-[#FFFBEB] text-[#F59E0B]"
      : "bg-[#F0FDF4] text-[#16A34A]";
  return (
    <Link
      href={href}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F9FAFB]"
    >
      <Card className="transition-shadow group-hover:shadow-md">
        <CardBody className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">
              {loading ? "—" : value}
            </p>
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentClass}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

function statusTone(status: Assignment["status"]): "emerald" | "amber" | "sky" | "slate" {
  switch (status) {
    case "Reviewed":
      return "emerald";
    case "Submitted":
      return "amber";
    case "Published":
      return "sky";
    case "Draft":
    default:
      return "slate";
  }
}
