"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import Topbar from "@/components/layout/Topbar";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";
import { Assignments, TeacherAssignments } from "@/lib/api";
import type {
  Assignment,
  CreateAssignmentRequest,
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

export default function TeacherDashboardPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <div className="min-h-screen bg-slate-50">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <TeacherDashboard />
        </main>
      </div>
    </RouteGuard>
  );
}

function TeacherDashboard() {
  const { user } = useAuth();
  const [links, setLinks] = useState<TeacherAssignmentResponse[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ studentId: string; subjectId: string; title: string; description: string; dueDate: string }>({
    studentId: "",
    subjectId: "",
    title: "",
    description: "",
    dueDate: "",
  });

  async function refresh() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const myLinks = await TeacherAssignments.mine();
      setLinks(myLinks);
      const uniqStudents = new Map<string, string>();
      const uniqSubjects = new Map<string, string>();
      myLinks.forEach((l) => {
        if (l.isActive) {
          uniqStudents.set(l.studentId, l.studentName);
          uniqSubjects.set(l.subjectId, l.subjectName);
        }
      });
      setStudents([...uniqStudents].map(([id, name]) => ({ id, name })));
      setSubjects([...uniqSubjects].map(([id, name]) => ({ id, name })));
      const list = await Assignments.list();
      setAssignments(list);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [user?.id]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: CreateAssignmentRequest = {
        studentId: form.studentId,
        subjectId: form.subjectId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate: new Date(form.dueDate).toISOString(),
      };
      await Assignments.create(payload);
      setShowCreate(false);
      setForm({ studentId: "", subjectId: "", title: "", description: "", dueDate: "" });
      await refresh();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPublish(id: string) {
    setError(null);
    try {
      await Assignments.publish(id);
      await refresh();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Publish failed");
    }
  }
  async function onRemove(id: string) {
    if (!confirm("Delete this assignment?")) return;
    setError(null);
    try {
      await Assignments.remove(id);
      await refresh();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Delete failed");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hello, ${user?.firstName}`}
        description="Manage your assignments for the students you teach."
        actions={
          <Button onClick={() => setShowCreate((v) => !v)} disabled={students.length === 0}>
            {showCreate ? "Cancel" : "New assignment"}
          </Button>
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : students.length === 0 ? (
        <Alert tone="info">
          You don&apos;t have any assigned students yet. Ask an administrator to
          assign students and subjects to you.
        </Alert>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>My students</CardTitle>
                <CardDescription>Students assigned to you.</CardDescription>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  {students.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-900">{s.name}</span>
                      <Badge tone="slate">Student</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>My subjects</CardTitle>
                <CardDescription>Subjects you teach.</CardDescription>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  {subjects.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-900">{s.name}</span>
                      <Badge tone="sky">Subject</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          {showCreate ? (
            <Card>
              <CardHeader>
                <CardTitle>New assignment</CardTitle>
              </CardHeader>
              <CardBody>
                <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Student"
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    required
                  >
                    <option value="">Select student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                  <Select
                    label="Subject"
                    value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                    required
                  >
                    <option value="">Select subject…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                  <Input
                    label="Title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Description (optional)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Due date"
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    required
                  />
                  <div className="flex items-end justify-end">
                    <Button type="submit" loading={busy}>Create draft</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Drafts are private. Publish to notify students.</CardDescription>
            </CardHeader>
            <CardBody>
              {assignments.length === 0 ? (
                <p className="text-sm text-slate-500">No assignments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Student</th>
                        <th className="py-2 pr-4">Subject</th>
                        <th className="py-2 pr-4">Due</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignments.map((a) => (
                        <tr key={a.id} className="text-slate-700">
                          <td className="py-3 pr-4 font-medium text-slate-900">{a.title}</td>
                          <td className="py-3 pr-4">{a.studentName}</td>
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
                          <td className="py-3 pr-4">
                            <div className="flex gap-2">
                              {!a.isPublished ? (
                                <Button size="sm" variant="secondary" onClick={() => onPublish(a.id)}>
                                  Publish
                                </Button>
                              ) : null}
                              <Button size="sm" variant="danger" onClick={() => onRemove(a.id)}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}