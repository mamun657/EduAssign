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
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
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

function statusTone(status: Assignment["status"]):
  | "success"
  | "warning"
  | "info"
  | "neutral" {
  switch (status) {
    case "Reviewed":
      return "success";
    case "Submitted":
      return "warning";
    case "Published":
      return "info";
    case "Draft":
    default:
      return "neutral";
  }
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
    const drafts = assignments.filter((a) => a.status === "Draft").length;
    const reviewed = assignments.filter((a) => a.status === "Reviewed").length;
    return {
      activeStudents,
      activeTeachers,
      activeSubjects,
      totalAssignments: assignments.length,
      submitted,
      pendingReview,
      drafts,
      reviewed,
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

  const display = (v: number) => (loading ? "—" : v);

  return (
    <DashboardShell role="Admin">
      <PageHeader
        eyebrow="Administration"
        title={`Welcome back, ${user?.firstName ?? "Admin"}`}
        description="Operational snapshot of students, teachers, subjects and assignments."
      />

      {/* KPI grid — 6 cards on lg+ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/admin/students" className="block focus:outline-none">
          <StatCard
            tone="emerald"
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
            label="Active students"
            value={display(counts.activeStudents)}
            hint={`${students.length} total`}
          />
        </Link>
        <Link href="/admin/teachers" className="block focus:outline-none">
          <StatCard
            tone="blue"
            icon={<UserCog className="h-5 w-5" aria-hidden="true" />}
            label="Active teachers"
            value={display(counts.activeTeachers)}
            hint={`${teachers.length} total`}
          />
        </Link>
        <Link href="/admin/subjects" className="block focus:outline-none">
          <StatCard
            tone="violet"
            icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Active subjects"
            value={display(counts.activeSubjects)}
            hint={`${subjects.length} total`}
          />
        </Link>
        <Link href="/admin/curriculum" className="block focus:outline-none">
          <StatCard
            tone="cyan"
            icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}
            label="Academic levels"
            value={display(levels.length)}
            hint="Levels + tracks"
          />
        </Link>
        <Link href="/admin/assignments" className="block focus:outline-none">
          <StatCard
            tone="orange"
            icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
            label="Total assignments"
            value={display(counts.totalAssignments)}
            hint={`${counts.drafts} drafts`}
          />
        </Link>
        <Link href="/admin/submissions" className="block focus:outline-none">
          <StatCard
            tone={counts.pendingReview > 0 ? "amber" : "slate"}
            icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
            label="Pending review"
            value={display(counts.pendingReview)}
            hint="Awaiting grading"
          />
        </Link>
      </div>

      {/* Submission pipeline */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-[10px] bg-emerald-50 text-emerald-700"
            >
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500">
                Reviewed
              </p>
              <p className="text-[20px] font-semibold tracking-tight text-slate-900">
                {display(counts.reviewed)}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-[10px] bg-amber-50 text-amber-700"
            >
              <Inbox className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500">
                Submitted
              </p>
              <p className="text-[20px] font-semibold tracking-tight text-slate-900">
                {display(counts.submitted)}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-[10px] bg-blue-50 text-blue-700"
            >
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-slate-500">
                Drafts
              </p>
              <p className="text-[20px] font-semibold tracking-tight text-slate-900">
                {display(counts.drafts)}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Recent assignments</CardTitle>
                <CardDescription>Last 5 assignments created.</CardDescription>
              </div>
              <Link
                href="/admin/assignments"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 hover:text-emerald-800"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <p className="px-5 py-6 text-[13px] text-slate-500">Loading…</p>
            ) : recentAssignments.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No assignments yet"
                  description="Teachers can create assignments for the students assigned to them."
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {recentAssignments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-slate-900">
                        {a.title}
                      </p>
                      <p className="truncate text-[12px] text-slate-500">
                        {a.teacherName} → {a.studentName} · {a.subjectName}
                      </p>
                    </div>
                    <Badge tone={statusTone(a.status)} withDot>
                      {a.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Recent students</CardTitle>
                <CardDescription>Last 5 students registered.</CardDescription>
              </div>
              <Link
                href="/admin/students"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 hover:text-emerald-800"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <p className="px-5 py-6 text-[13px] text-slate-500">Loading…</p>
            ) : recentStudents.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No students yet"
                  description="Students register themselves. They'll appear here once they sign up."
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {recentStudents.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-slate-900">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="truncate text-[12px] text-slate-500">
                        {s.email} · {s.academicLevelName ?? "No level"}
                      </p>
                    </div>
                    <Badge tone={s.isActive ? "success" : "danger"} withDot>
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
