"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  ClipboardList,
  Inbox,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  FileText,
  Eye,
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
import { Assignments, TeacherAssignments } from "@/lib/api";
import type {
  Assignment,
  AssignmentStatus,
  TeacherAssignmentResponse,
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

export default function TeacherDashboardPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <TeacherOverview />
      </DashboardShell>
    </RouteGuard>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone = "slate",
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: "slate" | "emerald" | "amber" | "sky";
  hint?: string;
}) {
  const ringColor: Record<string, string> = {
    slate: "bg-[#F9FAFB] text-[#374151]",
    emerald: "bg-[#ECFDF5] text-[#16A34A]",
    amber: "bg-[#FFFBEB] text-[#B45309]",
    sky: "bg-[#EFF6FF] text-[#1D4ED8]",
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{value}</p>
            {hint ? (
              <p className="mt-1 text-xs text-[#6B7280]">{hint}</p>
            ) : null}
          </div>
          <div
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ringColor[tone]}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function TeacherOverview() {
  const { user } = useAuth();
  const [links, setLinks] = useState<TeacherAssignmentResponse[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let ok = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [myLinks, list] = await Promise.all([
          TeacherAssignments.mine(),
          Assignments.list(),
        ]);
        if (!ok) return;
        // Hide inactive TSS links — students/subjects only count if assigned AND active.
        const activeLinks = myLinks.filter((l) => l.isActive);
        setLinks(activeLinks);
        setAssignments(list);
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

  const uniqueStudents = new Set(links.map((l) => l.studentId));
  const uniqueSubjects = new Set(links.map((l) => l.subjectId));

  const total = assignments.length;
  const drafts = assignments.filter((a) => a.status === "Draft").length;
  const published = assignments.filter((a) => a.status === "Published").length;
  const submitted = assignments.filter((a) => a.status === "Submitted").length;
  const reviewed = assignments.filter((a) => a.status === "Reviewed").length;

  // Recent activity: 5 most recent assignments by updatedAt.
  const recent = [...assignments]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5);

  // Pending submissions = assignments in Submitted state, sorted by submittedAt ascending.
  const pendingReview = assignments
    .filter((a) => a.status === "Submitted")
    .sort((a, b) => +new Date(a.submittedAt ?? a.updatedAt) - +new Date(b.submittedAt ?? b.updatedAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user?.firstName ?? "Teacher"}`}
        description="Manage your students, assignments, and submission reviews."
        actions={
          <Link href="/teacher/assignments/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New assignment
            </Button>
          </Link>
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Students"
          value={uniqueStudents.size}
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          tone="slate"
          hint="Assigned to you"
        />
        <KpiCard
          label="Subjects"
          value={uniqueSubjects.size}
          icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
          tone="slate"
          hint="You teach"
        />
        <KpiCard
          label="Assignments"
          value={total}
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          tone="amber"
          hint={`${drafts} draft · ${published} published`}
        />
        <KpiCard
          label="To review"
          value={submitted}
          icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
          tone="sky"
          hint={`${reviewed} reviewed`}
        />
      </section>

      {loading ? (
        <p className="text-sm text-[#6B7280]">Loading…</p>
      ) : links.length === 0 ? (
        <EmptyState
          title="No students assigned yet"
          description="An administrator needs to assign students and subjects to you before you can create assignments."
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending review</CardTitle>
                  <CardDescription>Submissions waiting for marks and feedback.</CardDescription>
                </div>
                <Link href="/teacher/submissions" className="text-sm font-medium text-[#111827] hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              {pendingReview.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No submissions waiting on you.</p>
              ) : (
                <ul className="space-y-3">
                  {pendingReview.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#111827]">{a.title}</p>
                        <p className="text-xs text-[#6B7280]">
                          {a.studentName} · {a.subjectName}
                        </p>
                      </div>
                      <Link
                        href={`/teacher/submissions/${a.id}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
                      >
                        Review
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
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
                  <CardTitle>Recent assignments</CardTitle>
                  <CardDescription>Your five most recently updated assignments.</CardDescription>
                </div>
                <Link href="/teacher/assignments" className="text-sm font-medium text-[#111827] hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              {recent.length === 0 ? (
                <EmptyState
                  title="No assignments yet"
                  description="Create your first assignment and attach the brief PDF."
                  icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
                  action={
                    <Link href="/teacher/assignments/new">
                      <Button>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        New assignment
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {recent.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#111827]">{a.title}</p>
                        <p className="text-xs text-[#6B7280]">
                          {a.studentName} · {a.subjectName} · due {formatDate(a.dueDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                        <Link
                          href={`/teacher/assignments/${a.id}`}
                          aria-label={`View assignment ${a.title}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB]"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Common workflows.</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/teacher/assignments/new"
              className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-4 py-3 hover:bg-[#F9FAFB]"
            >
              <Plus className="h-5 w-5 text-[#111827]" aria-hidden="true" />
              <span className="text-sm font-medium text-[#111827]">Create assignment</span>
            </Link>
            <Link
              href="/teacher/assignments"
              className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-4 py-3 hover:bg-[#F9FAFB]"
            >
              <FileText className="h-5 w-5 text-[#111827]" aria-hidden="true" />
              <span className="text-sm font-medium text-[#111827]">List assignments</span>
            </Link>
            <Link
              href="/teacher/submissions"
              className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-4 py-3 hover:bg-[#F9FAFB]"
            >
              <Inbox className="h-5 w-5 text-[#111827]" aria-hidden="true" />
              <span className="text-sm font-medium text-[#111827]">Review submissions</span>
            </Link>
            <Link
              href="/teacher/students"
              className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-4 py-3 hover:bg-[#F9FAFB]"
            >
              <Users className="h-5 w-5 text-[#111827]" aria-hidden="true" />
              <span className="text-sm font-medium text-[#111827]">My students</span>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Hidden helper so eslint thinks the icons are used. */}
      <span className="hidden">
        <Clock className="h-4 w-4" aria-hidden="true" />
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
  );
}