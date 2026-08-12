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
        eyebrow="Administration / Curriculum"
        title="Curriculum"
        description="Academic levels and the subjects assigned to each level."
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle>Academic levels</CardTitle>
              <CardDescription>
                Select a level to view its curriculum.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-1.5">
            {loadingLevels ? (
              <p className="text-[13px] text-slate-500">Loading…</p>
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
                      "flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-[13.5px] transition-colors",
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={[
                          "grid h-8 w-8 place-items-center rounded-[8px]",
                          active ? "bg-white text-emerald-700" : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        <GraduationCap className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="font-medium">{l.name}</span>
                    </span>
                    <Badge tone={l.isActive ? "success" : "neutral"} withDot>
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
              <div className="flex flex-col gap-1">
                <CardTitle>Subjects for this level</CardTitle>
                <CardDescription>
                  Compulsory subjects plus elective groups offered at this level.
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody>
              {loadingSubjects ? (
                <p className="text-[13px] text-slate-500">Loading…</p>
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
                    accent="emerald"
                    items={grouped.compulsory.map((s) => ({
                      key: s.subjectId,
                      code: s.subjectCode,
                      label: s.subjectName,
                    }))}
                  />

                  {Array.from(grouped.electiveMap.entries()).map(([groupName, items]) => (
                    <GroupBlock
                      key={groupName}
                      title={`Elective group: ${groupName}`}
                      icon={Layers}
                      accent="violet"
                      items={items.map((s) => ({
                        key: s.subjectId,
                        code: s.subjectCode,
                        label: s.subjectName,
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
  accent,
  items,
}: {
  title: string;
  icon: typeof BookOpenCheck;
  accent: "emerald" | "violet";
  items: { key: string; code: string; label: string; hint?: string }[];
}) {
  const accentBg = accent === "emerald" ? "bg-emerald-50" : "bg-violet-50";
  const accentText = accent === "emerald" ? "text-emerald-700" : "text-violet-700";

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-slate-900">
        <span
          aria-hidden="true"
          className={["grid h-7 w-7 place-items-center rounded-[8px]", accentBg, accentText].join(" ")}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-slate-500">None.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-center justify-between px-3 py-2.5 text-[13.5px] hover:bg-slate-50"
            >
              <span className="flex items-center gap-2.5">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold tracking-wide text-slate-700">
                  {it.code}
                </span>
                <span className="text-slate-800">{it.label}</span>
              </span>
              {it.hint ? <Badge tone="violet">{it.hint}</Badge> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}