"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Users, UserCheck, UserX, Filter, Trash2, AlertTriangle } from "lucide-react";
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
  AdminStudentDetail,
  AdminStudentListItem,
} from "@/lib/types";

export default function AdminStudentsPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <Students />
    </RouteGuard>
  );
}

function Students() {
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<AdminStudentListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([Admin.students(), AcademicLevels.list()]);
      setStudents(s);
      setLevels(l);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (levelFilter && s.academicLevelId !== levelFilter) return false;
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      if (!q) return true;
      return (
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    });
  }, [students, search, levelFilter, statusFilter]);

  const activeCount = students.filter((s) => s.isActive).length;
  const inactiveCount = students.length - activeCount;

  async function openDetail(id: string) {
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await Admin.studentDetail(id);
      setDetail(d);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Failed to load student.");
    } finally {
      setDetailLoading(false);
    }
  }
  function closeDetail() {
    setDetail(null);
  }

  async function toggleActive(s: AdminStudentListItem) {
    const action = s.isActive ? "deactivate" : "activate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${s.firstName} ${s.lastName}?`)) return;
    try {
      await Admin.setUserActive(s.id, { isActive: !s.isActive });
      toast.success(`Student ${action}d.`);
      await load();
      if (detail?.id === s.id) {
        const d = await Admin.studentDetail(s.id);
        setDetail(d);
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Update failed.");
    }
  }

  async function onDelete(s: AdminStudentListItem) {
    setDeleting(true);
    try {
      await Admin.deleteUser(s.id);
      toast.success(`Student ${s.firstName} ${s.lastName} deleted.`);
      if (detail?.id === s.id) setDetail(null);
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
        eyebrow="Administration / Students"
        title="Students"
        description="Manage student accounts and review their subject selections."
        actions={
          <Badge tone="info" withDot>
            {students.length} registered
          </Badge>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      {/* Quick stats */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          tone="emerald"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          label="Total students"
          value={loading ? "—" : students.length}
        />
        <StatCard
          tone="blue"
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
            <CardTitle>All students</CardTitle>
            <CardDescription>
              {loading ? "Loading…" : `${filtered.length} of ${students.length} shown`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Filter row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                aria-label="Search students"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={
                  <Search className="h-4 w-4" aria-hidden="true" />
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end">
              <Select
                label="Level"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="min-w-[170px]"
              >
                <option value="">All levels</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
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
          </div>

          {/* Active filter chips */}
          {(search || levelFilter || statusFilter) && (
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Active filters:</span>
              {search ? (
                <Badge tone="neutral">“{search}”</Badge>
              ) : null}
              {levelFilter ? (
                <Badge tone="info">
                  {levels.find((l) => l.id === levelFilter)?.name ?? levelFilter}
                </Badge>
              ) : null}
              {statusFilter ? (
                <Badge tone={statusFilter === "active" ? "success" : "danger"}>
                  {statusFilter === "active" ? "Active" : "Inactive"}
                </Badge>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setLevelFilter("");
                  setStatusFilter("");
                }}
                className="ml-1 text-emerald-700 hover:text-emerald-800"
              >
                Clear
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-[13px] text-slate-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No matching students"
              description={
                students.length === 0
                  ? "Students register themselves. They'll appear here once they sign up."
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
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="h-[56px] text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-5">
                        <button
                          type="button"
                          className="text-left font-medium text-slate-900 hover:text-emerald-700"
                          onClick={() => openDetail(s.id)}
                        >
                          {s.firstName} {s.lastName}
                        </button>
                      </td>
                      <td className="px-5 text-slate-500">{s.email}</td>
                      <td className="px-5 text-slate-700">
                        {s.academicLevelName ?? "—"}
                      </td>
                      <td className="px-5">
                        <Badge
                          tone={s.isActive ? "success" : "danger"}
                          withDot
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={s.isActive ? "secondary" : "success"}
                            onClick={() => toggleActive(s)}
                          >
                            {s.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger-soft"
                            onClick={() => setConfirmingDelete(s)}
                            aria-label={`Delete ${s.firstName} ${s.lastName}`}
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
          aria-labelledby="student-delete-title"
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
                <h2 id="student-delete-title" className="text-[15px] font-semibold text-slate-900">
                  Delete student permanently?
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
              All related enrollments, assignments, teacher-student links, and similarity analyses will be removed.
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

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Student detail"
        >
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    {detail.firstName} {detail.lastName}
                  </CardTitle>
                  <CardDescription>
                    {detail.email} · {detail.academicLevelName ?? "No level"}
                  </CardDescription>
                </div>
                <Button size="sm" variant="secondary" onClick={closeDetail}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailBlock
                  title="Selected subjects"
                  empty="No subjects selected yet."
                  items={detail.selectedSubjects.map((s) => ({
                    key: s.subjectId,
                    label: s.subjectName,
                    tag: s.isCompulsory ? (
                      <Badge tone="neutral">Compulsory</Badge>
                    ) : (
                      <Badge tone="violet">
                        {s.electiveGroup ?? "Elective"}
                      </Badge>
                    ),
                  }))}
                />
                <DetailBlock
                  title="Available, not selected"
                  empty="All available subjects selected."
                  items={detail.availableNotSelectedSubjects.map((s) => ({
                    key: s.subjectId,
                    label: s.subjectName,
                    tag: s.isCompulsory ? (
                      <Badge tone="neutral">Compulsory</Badge>
                    ) : (
                      <Badge tone="warning">
                        {s.electiveGroup ?? "Elective"}
                      </Badge>
                    ),
                  }))}
                />
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-[12.5px] text-slate-600">
                Account status:{" "}
                <Badge tone={detail.isActive ? "success" : "danger"} withDot>
                  {detail.isActive ? "Active" : "Inactive"}
                </Badge>
                <span className="ml-2 text-slate-500">
                  Created {new Date(detail.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : detailLoading ? (
        <p className="mt-4 text-[13px] text-slate-500">Loading student detail…</p>
      ) : null}
    </DashboardShell>
  );
}

function DetailBlock({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { key: string; label: string; tag: React.ReactNode }[];
}) {
  return (
    <div>
      <h3 className="text-[13.5px] font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]"
            >
              <span className="text-slate-700">{it.label}</span>
              {it.tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
