"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { X, Plus, UserCog, UserCheck, UserX, Search, Trash2, AlertTriangle } from "lucide-react";
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
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { AcademicLevels, Admin } from "@/lib/api";
import type {
  AcademicLevel,
  AdminTeacherListItem,
  CreateTeacherRequest,
} from "@/lib/types";

export default function AdminTeachersPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <Teachers />
    </RouteGuard>
  );
}

function Teachers() {
  const [teachers, setTeachers] = useState<AdminTeacherListItem[]>([]);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<AdminTeacherListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (statusFilter === "active" && !t.isActive) return false;
      if (statusFilter === "inactive" && t.isActive) return false;
      if (!q) return true;
      return (
        t.firstName.toLowerCase().includes(q) ||
        t.lastName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
      );
    });
  }, [teachers, search, statusFilter]);

  const activeCount = teachers.filter((t) => t.isActive).length;
  const inactiveCount = teachers.length - activeCount;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await Admin.createTeacher({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber?.trim() || undefined,
        academicLevelId: form.academicLevelId || undefined,
      });
      toast.success(`Teacher ${created.firstName} ${created.lastName} created.`);
      setShowForm(false);
      setForm({ firstName: "", lastName: "", email: "", password: "", phoneNumber: "", academicLevelId: "" });
      await load();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Create failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(t: AdminTeacherListItem) {
    const action = t.isActive ? "deactivate" : "activate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${t.firstName} ${t.lastName}?`)) return;
    try {
      await Admin.setUserActive(t.id, { isActive: !t.isActive });
      toast.success(`Teacher ${action}d.`);
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Update failed.");
    }
  }

  async function onDelete(t: AdminTeacherListItem) {
    setDeleting(true);
    try {
      await Admin.deleteUser(t.id);
      toast.success(`Teacher ${t.firstName} ${t.lastName} deleted.`);
      setConfirmingDelete(null);
      await load();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Delete failed.";
      toast.error(msg);
      setConfirmingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DashboardShell role="Admin">
      <PageHeader
        eyebrow="Administration / Teachers"
        title="Teachers"
        description="Add teaching staff and manage their account state."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? (
              <>
                <X className="h-4 w-4" aria-hidden="true" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add teacher
              </>
            )}
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          tone="blue"
          icon={<UserCog className="h-5 w-5" aria-hidden="true" />}
          label="Total teachers"
          value={loading ? "—" : teachers.length}
        />
        <StatCard
          tone="emerald"
          icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
          label="Active"
          value={loading ? "—" : activeCount}
        />
        <StatCard
          tone="rose"
          icon={<UserX className="h-5 w-5" aria-hidden="true" />}
          label="Inactive"
          value={loading ? "—" : inactiveCount}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>All teachers</CardTitle>
            <CardDescription>
              {loading ? "Loading…" : `${filtered.length} of ${teachers.length} shown`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {showForm ? (
            <form
              onSubmit={onCreate}
              className="grid gap-4 rounded-[10px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
            >
              <Input
                label="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
              <Input
                label="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="sm:col-span-2"
              />
              <Input
                label="Initial password"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                hint="Min 8 chars with upper, lower, digit, symbol."
                className="sm:col-span-2"
              />
              <Input
                label="Phone (optional)"
                type="tel"
                value={form.phoneNumber ?? ""}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              />
              <Select
                label="Academic level (optional)"
                value={form.academicLevelId ?? ""}
                onChange={(e) => setForm({ ...form, academicLevelId: e.target.value })}
              >
                <option value="">—</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" loading={busy}>
                  Create teacher
                </Button>
              </div>
            </form>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                aria-label="Search teachers"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[150px]"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          {loading ? (
            <p className="text-[13px] text-slate-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No teachers added yet"
              description={
                teachers.length === 0
                  ? "Click “Add teacher” above to create one."
                  : "Try adjusting your filters."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-[13.5px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Level</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="h-[56px] text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-5 font-medium text-slate-900">
                        {t.firstName} {t.lastName}
                      </td>
                      <td className="px-5 text-slate-500">{t.email}</td>
                      <td className="px-5">{t.academicLevelName ?? "—"}</td>
                      <td className="px-5">
                        <Badge
                          tone={t.isActive ? "success" : "danger"}
                          withDot
                        >
                          {t.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={t.isActive ? "secondary" : "success"}
                            onClick={() => toggleActive(t)}
                          >
                            {t.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger-soft"
                            onClick={() => setConfirmingDelete(t)}
                            aria-label={`Delete ${t.firstName} ${t.lastName}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
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

      {confirmingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teacher-delete-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setConfirmingDelete(null);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="teacher-delete-title" className="text-[15px] font-semibold text-slate-900">
                  Delete teacher permanently?
                </h2>
                <p className="mt-1 text-[12.5px] text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 text-[13px] text-slate-600">
              You are about to delete{" "}
              <span className="font-medium text-slate-900">
                {confirmingDelete.firstName} {confirmingDelete.lastName}
              </span>{" "}
              (<span className="text-slate-500">{confirmingDelete.email}</span>).
              All related assignments, teacher-student links, and similarity analyses will be removed.
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 rounded-b-xl">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(confirmingDelete)}
                loading={deleting}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}