"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
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

  return (
    <DashboardShell role="Admin">
      <PageHeader
        title="Students"
        description="Manage student accounts and review their subject selections."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All students</CardTitle>
          <CardDescription>
            {filtered.length} of {students.length} shown
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]"
              />
              <Input
                aria-label="Search students"
                placeholder="Search name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              label="Level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
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
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
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
                  {filtered.map((s) => (
                    <tr key={s.id} className="text-[#374151]">
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          className="font-medium text-[#111827] hover:underline"
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
                      <td className="py-3 pr-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toggleActive(s)}
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

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/50 p-4"
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
                      <Badge tone="slate">Compulsory</Badge>
                    ) : (
                      <Badge tone="sky">{s.electiveGroup ?? "Elective"}</Badge>
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
                      <Badge tone="slate">Compulsory</Badge>
                    ) : (
                      <Badge tone="amber">{s.electiveGroup ?? "Elective"}</Badge>
                    ),
                  }))}
                />
              </div>
              <div className="rounded-lg bg-[#F9FAFB] p-3 text-xs text-[#6B7280]">
                Account status:{" "}
                <Badge tone={detail.isActive ? "emerald" : "rose"}>
                  {detail.isActive ? "Active" : "Inactive"}
                </Badge>
                <span className="ml-2">Created {new Date(detail.createdAt).toLocaleDateString()}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : detailLoading ? (
        <p className="mt-4 text-sm text-[#6B7280]">Loading student detail…</p>
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
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-[#6B7280]">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between text-sm">
              <span className="text-[#374151]">{it.label}</span>
              {it.tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
