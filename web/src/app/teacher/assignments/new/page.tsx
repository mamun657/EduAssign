"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, X, Upload, Save, Send } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";
import { Assignments, TeacherAssignments } from "@/lib/api";
import type {
  CreateAssignmentRequest,
  TeacherAssignmentResponse,
} from "@/lib/types";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export default function NewAssignmentPage() {
  return (
    <RouteGuard roles={["Teacher"]}>
      <DashboardShell role="Teacher">
        <NewAssignmentForm />
      </DashboardShell>
    </RouteGuard>
  );
}

function NewAssignmentForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [links, setLinks] = useState<TeacherAssignmentResponse[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let ok = true;
    async function load() {
      setLoadingLinks(true);
      setLoadError(null);
      try {
        const data = await TeacherAssignments.mine();
        if (!ok) return;
        const active = data.filter((l) => l.isActive);
        setLinks(active);
      } catch (err) {
        if (!ok) return;
        setLoadError((err as { message?: string })?.message ?? "Failed to load links");
      } finally {
        if (ok) setLoadingLinks(false);
      }
    }
    load();
    return () => {
      ok = false;
    };
  }, [user?.id]);

  const studentOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const link of links) {
      if (!m.has(link.studentId)) m.set(link.studentId, link.studentName);
    }
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [links]);

  const subjectOptions = useMemo(() => {
    const filtered = links.filter((l) => !studentId || l.studentId === studentId);
    const m = new Map<string, string>();
    for (const link of filtered) {
      if (!m.has(link.subjectId)) m.set(link.subjectId, link.subjectName);
    }
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [links, studentId]);

  const subjectOptionLabels = useMemo(() => {
    const filtered = links.filter((l) => !studentId || l.studentId === studentId);
    const m = new Map<string, string>();
    for (const link of filtered) {
      if (!m.has(link.subjectId)) m.set(link.subjectId, link.subjectName);
    }
    return m;
  }, [links, studentId]);

  useEffect(() => {
    if (!subjectId) return;
    if (!subjectOptions.some((s) => s.id === subjectId)) {
      setSubjectId("");
    }
  }, [studentId, subjectOptions, subjectId]);

  function validate(): string | null {
    if (!studentId) return "Please pick a student.";
    if (!subjectId) return "Please pick a subject.";
    if (!title.trim()) return "Title is required.";
    if (!description.trim()) return "Description is required.";
    if (!dueDate) return "Due date is required.";
    const due = new Date(dueDate);
    if (Number.isNaN(+due)) return "Due date is invalid.";
    if (file) {
      if (file.size > MAX_BYTES) return "Attachment must be 10 MB or smaller.";
      if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
        return `Unsupported file type: ${file.type || "unknown"}.`;
      }
    }
    return null;
  }

  async function submit(publish: boolean) {
    setSubmitError(null);
    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateAssignmentRequest = {
        studentId,
        subjectId,
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(dueDate).toISOString(),
      };
      const created = await Assignments.create(payload);
      if (file) {
        try {
          await Assignments.uploadAttachment(created.id, file);
        } catch (uploadErr) {
          setSubmitError(
            `Assignment created but attachment upload failed: ${
              (uploadErr as { message?: string })?.message ?? "unknown error"
            }`,
          );
          setSubmitting(false);
          return;
        }
      }
      if (publish) {
        try {
          await Assignments.publish(created.id);
        } catch (pubErr) {
          setSubmitError(
            `Assignment saved but publish failed: ${
              (pubErr as { message?: string })?.message ?? "unknown error"
            }`,
          );
          setSubmitting(false);
          return;
        }
      }
      router.push("/teacher/assignments");
    } catch (err) {
      setSubmitError((err as { message?: string })?.message ?? "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New assignment"
        description="Create a new assignment with an optional brief attachment."
        actions={
          <Link href="/teacher/assignments">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          </Link>
        }
      />

      {loadError ? <Alert tone="error">{loadError}</Alert> : null}
      {submitError ? <Alert tone="error">{submitError}</Alert> : null}

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Pick a student and subject, then add the brief.</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="studentId" className="mb-1 block text-sm font-medium text-[#111827]">
                  Student
                </label>
                <Select
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={loadingLinks}
                  required
                >
                  <option value="">Select a student…</option>
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="subjectId" className="mb-1 block text-sm font-medium text-[#111827]">
                  Subject
                </label>
                <Select
                  id="subjectId"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={loadingLinks || !studentId}
                  required
                >
                  <option value="">Select a subject…</option>
                  {subjectOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {subjectOptionLabels.get(s.id) ?? s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="title" className="mb-1 block text-sm font-medium text-[#111827]">
                  Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={150}
                  placeholder="e.g. Algebra worksheet — chapter 3"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="description" className="mb-1 block text-sm font-medium text-[#111827]">
                  Description / instructions
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={6}
                  maxLength={4000}
                  placeholder="Outline what the student must do, page references, format expectations, etc."
                  className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30"
                />
              </div>
              <div>
                <label htmlFor="dueDate" className="mb-1 block text-sm font-medium text-[#111827]">
                  Due date
                </label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attachment (optional)</CardTitle>
                <CardDescription>
                  PDF, image, or document. Max 10 MB.
                </CardDescription>
              </div>
              {file ? (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#B91C1C] hover:underline"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              ) : null}
            </div>
          </CardHeader>
          <CardBody>
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                <FileText className="h-5 w-5 text-[#374151]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#111827]">{file.name}</p>
                  <p className="text-xs text-[#6B7280]">
                    {file.type || "unknown"} · {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <label
                htmlFor="attachment"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-8 text-center hover:bg-[#F3F4F6]"
              >
                <Upload className="h-6 w-6 text-[#6B7280]" aria-hidden="true" />
                <span className="text-sm font-medium text-[#111827]">Click to upload a file</span>
                <span className="text-xs text-[#6B7280]">
                  PDF, PNG, JPG, GIF, WebP, TXT, DOC, DOCX
                </span>
                <input
                  id="attachment"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.doc,.docx,application/pdf,image/png,image/jpeg,image/gif,image/webp,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={submitting || loadingLinks}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Saving…" : "Save draft"}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={submitting || loadingLinks}
            onClick={() => void submit(true)}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Publishing…" : "Publish"}
          </Button>
          <Link href="/teacher/assignments" className="text-sm font-medium text-[#6B7280] hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
