"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Link2, Trash2 } from "lucide-react";
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

function TSS() {
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherListItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [studentDetail, setStudentDetail] = useState<AdminStudentDetail | null>(null);
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
    load().catch((err) => setError((err as { message?: string })?.message ?? "Failed to load."))
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
      toast.success(`Link created: ${created.teacherName} → ${created.studentName} (${created.subjectName}).`);
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

  return (
    <DashboardShell role="Admin">
      <PageHeader
        title="Teacher → Student → Subject"
        description="Assign teaching staff to deliver specific subjects to specific students."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New link</CardTitle>
            <CardDescription>
              Pick a student first — the subject menu only shows subjects they can take.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <form onSubmit={onCreate} className="grid gap-4">
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
              <div className="flex justify-end">
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
            <CardDescription>Narrow the list below by teacher or student.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-3">
            <Select
              label="By teacher"
              value={linkFilter.teacherId ?? ""}
              onChange={(e) =>
                setLinkFilter((f) => ({ ...f, teacherId: e.target.value || undefined }))
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
                setLinkFilter((f) => ({ ...f, studentId: e.target.value || undefined }))
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="py-2 pr-4">Teacher</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {links.map((l) => (
                    <tr key={l.id} className="text-[#374151]">
                      <td className="py-3 pr-4">{l.teacherName}</td>
                      <td className="py-3 pr-4">{l.studentName}</td>
                      <td className="py-3 pr-4">{l.subjectName}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={l.isActive ? "emerald" : "rose"}>
                          {l.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button size="sm" variant="danger" onClick={() => onDelete(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
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