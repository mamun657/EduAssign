"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
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

  return (
    <DashboardShell role="Admin">
      <PageHeader
        title="Teachers"
        description="Add teaching staff and manage their account state."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All teachers</CardTitle>
              <CardDescription>{teachers.length} total</CardDescription>
            </div>
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
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {showForm ? (
            <form
              onSubmit={onCreate}
              className="grid gap-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:grid-cols-2"
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

          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
          ) : teachers.length === 0 ? (
            <EmptyState
              title="No teachers added yet"
              description="Click “Add teacher” above to create one."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Level</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {teachers.map((t) => (
                    <tr key={t.id} className="text-[#374151]">
                      <td className="py-3 pr-4 font-medium text-[#111827]">
                        {t.firstName} {t.lastName}
                      </td>
                      <td className="py-3 pr-4">{t.email}</td>
                      <td className="py-3 pr-4">{t.academicLevelName ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={t.isActive ? "emerald" : "rose"}>
                          {t.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button size="sm" variant="secondary" onClick={() => toggleActive(t)}>
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
    </DashboardShell>
  );
}