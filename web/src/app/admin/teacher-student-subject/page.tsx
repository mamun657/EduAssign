"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Link2, Trash2, UserPlus, BookOpen, UserCircle2 } from "lucide-react";
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
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import {
  Admin,
  Subjects,
  TeacherAssignments,
} from "@/lib/api";
import type {
  AdminStudentDetail,
  AdminStudentListItem,
  AdminTeacherListItem,
  Subject,
  TeacherAssignmentResponse,
} from "@/lib/types";

export default function AdminTSSPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <TSS />
    </RouteGuard>
  );
}

const STEP_META = [
  { icon: UserPlus, label: "Student", hint: "Pick the student first" },
  { icon: BookOpen, label: "Subject", hint: "Choose a subject they can take" },
  { icon: UserCircle2, label: "Teacher", hint: "Assign the teaching staff" },
] as const;

function TSS() {
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherListItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [studentDetail, setStudentDetail] = useState<AdminStudentDetail | null>(
    null
  );
  const [links, setLinks] = useState<TeacherAssignmentResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ teacherId: "", studentId: "", subjectId: "" });
  const [linkFilter, setLinkFilter] = useState<{ teacherId?: string; studentId?: string }>({});

  async function load() {
    const [s, t, sub, l] = await Promise.all([
      Admin.students(),
      Admin.teachers(),
      Subjects.list(),
      TeacherAssignments.list(linkFilter),
    ]);
    setStudents(s);
    setTeachers(t);
    setAllSubjects(sub);
    setLinks(l);
  }

  useEffect(() => {
    load().catch((err) =>
      setError((err as { message?: string })?.message ?? "Failed to load.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkFilter.teacherId, linkFilter.studentId]);

  const subjectOptions = useMemo(() => {
    if (!studentDetail) return [] as Subject[];
    const selectedCodes = studentDetail.selectedSubjects.map((s) => s.subjectCode);
    return allSubjects.filter((s) => selectedCodes.includes(s.code));
  }, [studentDetail, allSubjects]);

  useEffect(() => {
    if (!form.studentId) {
      setStudentDetail(null);
      return;
    }
    Admin.studentDetail(form.studentId)
      .then(setStudentDetail)
      .catch(() => setStudentDetail(null));
  }, [form.studentId]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await TeacherAssignments.create({
        teacherId: form.teacherId,
        studentId: form.studentId,
        subjectId: form.subjectId,
      });
      toast.success(
        `Link created: ${created.teacherName} → ${created.studentName} (${created.subjectName}).`
      );
      setForm({ teacherId: "", studentId: "", subjectId: "" });
      setStudentDetail(null);
      await load();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Create failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this assignment link?")) return;
    try {
      await TeacherAssignments.remove(id);
      toast.success("Link removed.");
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Delete failed.");
    }
  }

  const activeStepIndex = form.subjectId ? 2 : form.studentId ? 1 : 0;

  return (
    <DashboardShell role="Admin">
      <PageHeader
        eyebrow="Administration / Teacher links"
        title="Teacher → Student → Subject"
        description="Pair teaching staff to deliver specific subjects to specific students."
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      {/* Stepper */}
      <ol className="mb-6 grid gap-3 sm:grid-cols-3">
        {STEP_META.map((step, i) => {
          const done = i < activeStepIndex;
          const current = i === activeStepIndex;
          const StepIcon = step.icon;
          return (
            <li
              key={step.label}
              className={[
                "flex items-start gap-3 rounded-lg border bg-white px-3.5 py-3 transition-colors",
                current
                  ? "border-emerald-200 bg-emerald-50/40"
                  : done
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "grid h-9 w-9 place-items-center rounded-[9px] text-[13px] font-semibold",
                  current
                    ? "bg-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
                    : done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {done ? "✓" : <StepIcon className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="flex flex-col">
                <span className="text-[12px] uppercase tracking-[0.08em] text-slate-500">
                  Step {i + 1}
                </span>
                <span className="text-[14px] font-semibold text-slate-900">{step.label}</span>
                <span className="text-[12.5px] text-slate-500">{step.hint}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New link</CardTitle>
            <CardDescription>
              Student first — subject menu only shows subjects they can take.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Student"
                value={form.studentId}
                onChange={(e) =>
                  setForm({ ...form, studentId: e.target.value, subjectId: "" })
                }
                required
              >
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </Select>
              <Select
                label="Subject"
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                required
                disabled={!form.studentId}
              >
                <option value="">Select subject…</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Teacher"
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                required
              >
                <option value="">Select teacher…</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </Select>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" loading={busy}>
                  <Link2 className="h-4 w-4" aria-hidden="true" /> Create link
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter links</CardTitle>
            <CardDescription>Narrow the list below.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-3">
            <Select
              label="By teacher"
              value={linkFilter.teacherId ?? ""}
              onChange={(e) =>
                setLinkFilter((f) => ({
                  ...f,
                  teacherId: e.target.value || undefined,
                }))
              }
            >
              <option value="">All teachers</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </Select>
            <Select
              label="By student"
              value={linkFilter.studentId ?? ""}
              onChange={(e) =>
                setLinkFilter((f) => ({
                  ...f,
                  studentId: e.target.value || undefined,
                }))
              }
            >
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </Select>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Existing links</CardTitle>
          <CardDescription>{links.length} total</CardDescription>
        </CardHeader>
        <CardBody>
          {links.length === 0 ? (
            <EmptyState
              title="No links yet"
              description="Create a Teacher → Student → Subject link above."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Teacher</th>
                    <th className="px-4 py-2 font-semibold">Student</th>
                    <th className="px-4 py-2 font-semibold">Subject</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {links.map((l) => (
                    <tr
                      key={l.id}
                      className="h-[52px] text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {l.teacherName}
                      </td>
                      <td className="px-4 py-2">{l.studentName}</td>
                      <td className="px-4 py-2">{l.subjectName}</td>
                      <td className="px-4 py-2">
                        <Badge tone={l.isActive ? "success" : "neutral"} withDot>
                          {l.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="danger-soft"
                          onClick={() => onDelete(l.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </DashboardShell>
  );
}