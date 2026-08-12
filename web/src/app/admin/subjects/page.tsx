"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2, Power, BookOpen, Search, Tag } from "lucide-react";
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
import { Subjects } from "@/lib/api";
import type {
  CreateSubjectRequest,
  Subject,
  UpdateSubjectRequest,
} from "@/lib/types";

export default function AdminSubjectsPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <SubjectsAdmin />
    </RouteGuard>
  );
}

type Modal =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; subject: Subject };

function SubjectsAdmin() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createForm, setCreateForm] = useState<CreateSubjectRequest>({
    code: "",
    name: "",
  });
  const [editForm, setEditForm] = useState<UpdateSubjectRequest>({
    code: "",
    name: "",
    isActive: true,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSubjects(await Subjects.list());
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      if (!q) return true;
      return (
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
      );
    });
  }, [subjects, search, statusFilter]);

  const activeCount = subjects.filter((s) => s.isActive).length;
  const inactiveCount = subjects.length - activeCount;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await Subjects.create({
        code: createForm.code.trim().toUpperCase(),
        name: createForm.name.trim(),
      });
      toast.success(`Subject ${created.code} created.`);
      setModal({ kind: "none" });
      setCreateForm({ code: "", name: "" });
      await load();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Create failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onEdit(e: FormEvent) {
    e.preventDefault();
    if (modal.kind !== "edit") return;
    setError(null);
    setBusy(true);
    try {
      await Subjects.update(modal.subject.id, {
        code: editForm.code?.trim().toUpperCase() || undefined,
        name: editForm.name?.trim() || undefined,
        isActive: editForm.isActive,
      });
      toast.success(`Subject ${editForm.code} updated.`);
      setModal({ kind: "none" });
      await load();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Update failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  function openEdit(s: Subject) {
    setEditForm({ code: s.code, name: s.name, isActive: s.isActive });
    setModal({ kind: "edit", subject: s });
  }

  async function deactivate(s: Subject) {
    if (!confirm(`Deactivate subject ${s.code}?`)) return;
    try {
      await Subjects.deactivate(s.id);
      toast.success(`Subject ${s.code} deactivated.`);
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Update failed.");
    }
  }

  async function remove(s: Subject) {
    if (!confirm(`Permanently delete subject ${s.code}? This cannot be undone.`)) return;
    try {
      await Subjects.remove(s.id);
      toast.success(`Subject ${s.code} deleted.`);
      await load();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Delete failed.";
      toast.error(msg);
    }
  }

  return (
    <DashboardShell role="Admin">
      <PageHeader
        eyebrow="Administration / Subjects"
        title="Subjects"
        description="Define the subjects available across the system."
        actions={
          <Button
            onClick={() => {
              setCreateForm({ code: "", name: "" });
              setModal({ kind: "create" });
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add subject
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
          tone="violet"
          icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
          label="Total subjects"
          value={loading ? "—" : subjects.length}
        />
        <StatCard
          tone="emerald"
          icon={<Tag className="h-5 w-5" aria-hidden="true" />}
          label="Active"
          value={loading ? "—" : activeCount}
        />
        <StatCard
          tone="rose"
          icon={<Tag className="h-5 w-5" aria-hidden="true" />}
          label="Inactive"
          value={loading ? "—" : inactiveCount}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>All subjects</CardTitle>
            <CardDescription>
              {loading ? "Loading…" : `${filtered.length} of ${subjects.length} shown`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                aria-label="Search subjects"
                placeholder="Search code or name"
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
              title="No subjects yet"
              description={
                subjects.length === 0
                  ? "Click “Add subject” above to create one."
                  : "Try adjusting your filters."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-[13.5px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="h-[56px] text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-semibold tracking-wide text-slate-700">
                          {s.code}
                        </span>
                      </td>
                      <td className="px-5 font-medium text-slate-900">{s.name}</td>
                      <td className="px-5">
                        <Badge
                          tone={s.isActive ? "success" : "danger"}
                          withDot
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                          </Button>
                          {s.isActive ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => deactivate(s)}
                            >
                              <Power className="h-3.5 w-3.5" aria-hidden="true" /> Deactivate
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="danger-soft"
                            onClick={() => remove(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
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

      {modal.kind === "create" ? (
        <ModalShell title="Add subject" onClose={() => setModal({ kind: "none" })}>
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Code"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              required
              placeholder="e.g. SCH_PHY"
            />
            <Input
              label="Name"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
              placeholder="e.g. Physics"
            />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModal({ kind: "none" })}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Create subject
              </Button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modal.kind === "edit" ? (
        <ModalShell
          title={`Edit subject ${modal.subject.code}`}
          onClose={() => setModal({ kind: "none" })}
        >
          <form onSubmit={onEdit} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Code"
              value={editForm.code ?? ""}
              onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
              required
            />
            <Input
              label="Name"
              value={editForm.name ?? ""}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <label className="flex items-center gap-2 text-[13px] text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={!!editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Active
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModal({ kind: "none" })}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Save changes
              </Button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </DashboardShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </CardHeader>
        <CardBody>{children}</CardBody>
      </Card>
    </div>
  );
}