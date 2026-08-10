"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, BookOpenCheck, Layers } from "lucide-react";
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
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import { AcademicLevels, Subjects } from "@/lib/api";
import type {
  AcademicLevel,
  CurriculumSubject,
} from "@/lib/types";

export default function AdminCurriculumPage() {
  return (
    <RouteGuard roles={["Admin"]}>
      <Curriculum />
    </RouteGuard>
  );
}

function Curriculum() {
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const l = await AcademicLevels.list();
        setLevels(l);
        const active = l.find((x) => x.isActive) ?? l[0];
        if (active) setSelectedLevelId(active.id);
      } catch (err) {
        setError((err as { message?: string })?.message ?? "Failed to load levels.");
      } finally {
        setLoadingLevels(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedLevelId) return;
    (async () => {
      setLoadingSubjects(true);
      try {
        const sub = await Subjects.byAcademicLevel(selectedLevelId);
        setSubjects(sub);
      } catch (err) {
        setError((err as { message?: string })?.message ?? "Failed to load subjects.");
      } finally {
        setLoadingSubjects(false);
      }
    })();
  }, [selectedLevelId]);

  const grouped = useMemo(() => {
    const compulsory = subjects.filter((s) => s.isCompulsory);
    const electiveMap = new Map<string, CurriculumSubject[]>();
    for (const s of subjects.filter((x) => !x.isCompulsory)) {
      const key = s.electiveGroup ?? "Other";
      if (!electiveMap.has(key)) electiveMap.set(key, []);
      electiveMap.get(key)!.push(s);
    }
    return { compulsory, electiveMap };
  }, [subjects]);

  return (
    <DashboardShell role="Admin">
      <PageHeader
        title="Curriculum"
        description="Academic levels and the subjects assigned to each level."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Academic levels</CardTitle>
            <CardDescription>Select a level to view its curriculum.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-1.5">
            {loadingLevels ? (
              <p className="text-sm text-[#6B7280]">Loading…</p>
            ) : levels.length === 0 ? (
              <EmptyState
                title="No academic levels"
                description="Levels are seeded in the database."
              />
            ) : (
              levels.map((l) => {
                const active = l.id === selectedLevelId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedLevelId(l.id)}
                    className={[
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "border-[#111827] bg-[#F9FAFB] text-[#111827]"
                        : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" aria-hidden="true" />
                      <span className="font-medium">{l.name}</span>
                    </span>
                    <Badge tone={l.isActive ? "emerald" : "rose"}>
                      {l.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </button>
                );
              })
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subjects for this level</CardTitle>
              <CardDescription>
                Compulsory subjects plus elective groups offered at this level.
              </CardDescription>
            </CardHeader>
            <CardBody>
              {loadingSubjects ? (
                <p className="text-sm text-[#6B7280]">Loading…</p>
              ) : subjects.length === 0 ? (
                <EmptyState
                  title="No subjects assigned"
                  description="Subjects appear here when added to this level's curriculum."
                />
              ) : (
                <div className="space-y-6">
                  <GroupBlock
                    title="Compulsory subjects"
                    icon={BookOpenCheck}
                    items={grouped.compulsory.map((s) => ({
                      key: s.subjectId,
                      label: `${s.subjectCode} — ${s.subjectName}`,
                    }))}
                  />

                  {Array.from(grouped.electiveMap.entries()).map(([groupName, items]) => (
                    <GroupBlock
                      key={groupName}
                      title={`Elective group: ${groupName}`}
                      icon={Layers}
                      items={items.map((s) => ({
                        key: s.subjectId,
                        label: `${s.subjectCode} — ${s.subjectName}`,
                        hint: s.electiveOption ?? undefined,
                      }))}
                    />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

function GroupBlock({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof BookOpenCheck;
  items: { key: string; label: string; hint?: string }[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#111827]">
        <Icon className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[#6B7280]">None.</p>
      ) : (
        <ul className="divide-y divide-[#E5E7EB] rounded-lg border border-[#E5E7EB]">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-[#374151]">{it.label}</span>
              {it.hint ? (
                <Badge tone="violet">{it.hint}</Badge>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}