"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import {
  AcademicLevels,
  Admin,
  Students,
  Subjects,
  TeacherAssignments,
} from "@/lib/api";
import type {
  AcademicLevel,
  AdminStudentDetail,
  AdminStudentListItem,
  AdminTeacherListItem,
  CreateTeacherRequest,
  CreateSubjectRequest,
  EnrolledSubject,
  Subject,
  TeacherAssignmentResponse,
} from "@/lib/types";

type Tab = "overview" | "students" | "teachers" | "subjects" | "teacherStudentSubject";

export default function AdminDashboardPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <div className="min-h-screen bg-slate-50">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <AdminDashboard />
        </main>
      </div>
    </RouteGuard>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Admin · ${user?.firstName}`}
        description="Manage users, curriculum, and teacher assignments."
      />

      <nav className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
        {(
          [
            ["overview", "Overview"],
            ["students", "Students"],
            ["teachers", "Teachers"],
            ["subjects", "Subjects"],
            ["teacherStudentSubject", "Assign Teacher → Student → Subject"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={[
              "rounded-md px-3 py-2 transition-colors",
              tab === k
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? <Overview /> : null}
      {tab === "students" ? <StudentsTab /> : null}
      {tab === "teachers" ? <TeachersTab /> : null}
      {tab === "subjects" ? <SubjectsTab /> : null}
      {tab === "teacherStudentSubject" ? <TSSTab /> : null}
    </div>
  );
}

function Overview() {
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherListItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c, d] = await Promise.all([
          Admin.students(),
          Admin.teachers(),
          Subjects.list(),
          AcademicLevels.list(),
        ]);
        setStudents(a);
        setTeachers(b);
        setSubjects(c);
        setLevels(d);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = [
    { label: "Students", value: students.length },
    { label: "Teachers", value: teachers.length },
    { label: "Subjects", value: subjects.length },
    { label: "Academic levels", value: levels.length },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardBody>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              {loading ? "—" : s.value}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function StudentsTab() {
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminStudentDetail | null>(null);
  const [enrolled, setEnrolled] = useState<EnrolledSubject[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const s = await Admin.students();
      setStudents(s);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function openDetail(id: string) {
    setError(null);
    try {
      const [detail, myEnrolled] = await Promise.all([
        Admin.studentDetail(id),
        Students.enrolledSubjects().catch(() => [] as EnrolledSubject[]),
      ]);
      setSelected(detail);
      setEnrolled(myEnrolled);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load");
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setError(null);
    try {
      await Admin.setUserActive(id, { isActive });
      await load();
      if (selected?.id === id) {
        const d = await Admin.studentDetail(id);
        setSelected(d);
      }
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Update failed");
    }
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Click a row to view their selected subjects.</CardDescription>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-500">No students registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Level</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id} className="text-slate-700">
                      <td className="py-3 pr-4">
                        <button
                          className="font-medium text-slate-900 hover:underline"
                          onClick={() => openDetail(s.id)}
                        >
                          {s.firstName} {s.lastName}
                        </button>
                      </td>
                      <td className="py-3 pr-4">{s.email}</td>
                      <td className="py-3 pr-4">{s.academicLevelName ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={s.isActive ? "emerald" : "rose"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toggleActive(s.id, !s.isActive)}
                        >
                          {s.isActive ? "Deactivate" : "Activate"}
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

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {selected.firstName} {selected.lastName}
            </CardTitle>
            <CardDescription>
              {selected.email} · {selected.academicLevelName ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardBody>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Selected subjects</h3>
                {selected.selectedSubjects.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">None selected yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {selected.selectedSubjects.map((s) => (
                      <li key={s.subjectId} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{s.subjectName}</span>
                        {s.isCompulsory ? (
                          <Badge tone="slate">Compulsory</Badge>
                        ) : (
                          <Badge tone="sky">{s.electiveGroup}</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Available, not selected</h3>
                {selected.availableNotSelectedSubjects.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">All available subjects selected.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {selected.availableNotSelectedSubjects.map((s) => (
                      <li key={s.subjectId} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{s.subjectName}</span>
                        {s.isCompulsory ? (
                          <Badge tone="slate">Compulsory</Badge>
                        ) : (
                          <Badge tone="amber">{s.electiveGroup}</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {enrolled.length > 0 ? (
              <p className="mt-4 text-xs text-slate-500">
                You currently have {enrolled.length} enrolled subjects in the public API.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function TeachersTab() {
  const [teachers, setTeachers] = useState<AdminTeacherListItem[]>([]);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CreateTeacherRequest>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
    academicLevelId: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [t, l] = await Promise.all([Admin.teachers(), AcademicLevels.list()]);
      setTeachers(t);
      setLevels(l);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await Admin.createTeacher({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber?.trim() || undefined,
        academicLevelId: form.academicLevelId || undefined,
      });
      setShow(false);
      setForm({ firstName: "", lastName: "", email: "", password: "", phoneNumber: "", academicLevelId: "" });
      await load();
    } catch (err) {
      const anyErr = err as { message?: string };
      setError(anyErr?.message ?? "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await Admin.setUserActive(id, { isActive });
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Update failed");
    }
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Teachers</CardTitle>
              <CardDescription>Add or manage teaching staff.</CardDescription>
            </div>
            <Button onClick={() => setShow((v) => !v)}>{show ? "Cancel" : "Add teacher"}</Button>
          </div>
        </CardHeader>
        <CardBody>
          {show ? (
            <form onSubmit={onCreate} className="mb-6 grid gap-4 sm:grid-cols-2">
              <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="sm:col-span-2" />
              <Input label="Initial password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} hint="Min 8 chars with upper, lower, digit, symbol." className="sm:col-span-2" />
              <Input label="Phone (optional)" type="tel" value={form.phoneNumber ?? ""} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              <Select label="Academic level (optional)" value={form.academicLevelId ?? ""} onChange={(e) => setForm({ ...form, academicLevelId: e.target.value })}>
                <option value="">—</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" loading={busy}>Create teacher</Button>
              </div>
            </form>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : teachers.length === 0 ? (
            <p className="text-sm text-slate-500">No teachers added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Level</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t) => (
                    <tr key={t.id} className="text-slate-700">
                      <td className="py-3 pr-4 font-medium text-slate-900">{t.firstName} {t.lastName}</td>
                      <td className="py-3 pr-4">{t.email}</td>
                      <td className="py-3 pr-4">{t.academicLevelName ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={t.isActive ? "emerald" : "rose"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Button size="sm" variant="secondary" onClick={() => toggleActive(t.id, !t.isActive)}>
                          {t.isActive ? "Deactivate" : "Activate"}
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
    </div>
  );
}

function SubjectsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CreateSubjectRequest>({ code: "", name: "" });

  async function load() {
    setLoading(true);
    try {
      setSubjects(await Subjects.list());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await Subjects.create({ code: form.code.trim().toUpperCase(), name: form.name.trim() });
      setShow(false);
      setForm({ code: "", name: "" });
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Create failed");
    } finally {
      setBusy(false);
    }
  }
  async function deactivate(id: string) {
    if (!confirm("Deactivate this subject?")) return;
    try {
      await Subjects.deactivate(id);
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Update failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>Add new subjects. Deactivate to remove from rotation.</CardDescription>
          </div>
          <Button onClick={() => setShow((v) => !v)}>{show ? "Cancel" : "Add subject"}</Button>
        </div>
      </CardHeader>
      <CardBody>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {show ? (
          <form onSubmit={onCreate} className="mb-6 grid gap-4 sm:grid-cols-3">
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. SCH_PHY" />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Physics" className="sm:col-span-2" />
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" loading={busy}>Create subject</Button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <tr key={s.id} className="text-slate-700">
                    <td className="py-3 pr-4 font-medium text-slate-900">{s.code}</td>
                    <td className="py-3 pr-4">{s.name}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={s.isActive ? "emerald" : "rose"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      {s.isActive ? (
                        <Button size="sm" variant="secondary" onClick={() => deactivate(s.id)}>Deactivate</Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TSSTab() {
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherListItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [studentDetail, setStudentDetail] = useState<AdminStudentDetail | null>(null);
  const [links, setLinks] = useState<TeacherAssignmentResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ teacherId: "", studentId: "", subjectId: "" });

  async function load() {
    const [s, t, sub, l] = await Promise.all([
      Admin.students(),
      Admin.teachers(),
      Subjects.list(),
      TeacherAssignments.list(),
    ]);
    setStudents(s);
    setTeachers(t);
    setAllSubjects(sub);
    setLinks(l);
  }
  useEffect(() => {
    load().catch((err) => setError((err as { message?: string })?.message ?? "Failed to load"));
  }, []);

  // When a student is selected, the Subject dropdown must be restricted to
  // subjects that the student has ACTUALLY selected/enrolled. We MUST NOT
  // union with availableNotSelectedSubjects — those are subjects the student
  // has not chosen and may not be assigned to a teacher on the student's
  // behalf without their consent.
  const subjectOptions = useMemo(() => {
    if (!studentDetail) return [] as Subject[];
    const selectedCodes = studentDetail.selectedSubjects.map(
      (s) => s.subjectCode,
    );
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
      await TeacherAssignments.create({
        teacherId: form.teacherId,
        studentId: form.studentId,
        subjectId: form.subjectId,
      });
      setForm({ teacherId: "", studentId: "", subjectId: "" });
      setStudentDetail(null);
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Create failed");
    } finally {
      setBusy(false);
    }
  }
  async function onDelete(id: string) {
    if (!confirm("Delete this assignment link?")) return;
    try {
      await TeacherAssignments.remove(id);
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>New Teacher → Student → Subject link</CardTitle>
          <CardDescription>
            Pick a student first — the subject menu will only show subjects they can take.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-3">
            <Select label="Student" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value, subjectId: "" })} required>
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </Select>
            <Select label="Subject" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required disabled={!form.studentId}>
              <option value="">Select subject…</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Select label="Teacher" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required>
              <option value="">Select teacher…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </Select>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" loading={busy}>Create link</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing links</CardTitle>
        </CardHeader>
        <CardBody>
          {links.length === 0 ? (
            <p className="text-sm text-slate-500">No links yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Teacher</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {links.map((l) => (
                    <tr key={l.id} className="text-slate-700">
                      <td className="py-3 pr-4">{l.teacherName}</td>
                      <td className="py-3 pr-4">{l.studentName}</td>
                      <td className="py-3 pr-4">{l.subjectName}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={l.isActive ? "emerald" : "rose"}>{l.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Button size="sm" variant="danger" onClick={() => onDelete(l.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
