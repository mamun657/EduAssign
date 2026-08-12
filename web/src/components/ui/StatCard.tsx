"use client";

import type { ReactNode } from "react";

/**
 * Soft, brand-tinted tile variants for stat cards.
 *  - emerald  students / active accounts
 *  - blue     teachers / assignments
 *  - violet   subjects / catalog
 *  - orange   submissions / activity
 *  - cyan     reviews / counts
 *  - amber    pending / awaiting action
 *  - rose     issues / overdue
 *  - slate    neutral counts
 *  - success / warning / info / neutral  semantic aliases that map to brand colors
 */
type StatTone =
  | "emerald"
  | "blue"
  | "violet"
  | "orange"
  | "cyan"
  | "amber"
  | "rose"
  | "slate"
  | "success"
  | "warning"
  | "info"
  | "neutral";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: StatTone;
  /** Optional trailing element (e.g. delta vs last week). */
  trailing?: ReactNode;
}

const tones: Record<StatTone, { tile: string; icon: string; chip: string }> = {
  emerald: {
    tile: "bg-emerald-50",
    icon: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
  },
  blue: {
    tile: "bg-blue-50",
    icon: "text-blue-700",
    chip: "bg-blue-100 text-blue-700",
  },
  violet: {
    tile: "bg-violet-50",
    icon: "text-violet-700",
    chip: "bg-violet-100 text-violet-700",
  },
  orange: {
    tile: "bg-orange-50",
    icon: "text-orange-700",
    chip: "bg-orange-100 text-orange-700",
  },
  cyan: {
    tile: "bg-cyan-50",
    icon: "text-cyan-700",
    chip: "bg-cyan-100 text-cyan-700",
  },
  amber: {
    tile: "bg-amber-50",
    icon: "text-amber-700",
    chip: "bg-amber-100 text-amber-700",
  },
  rose: {
    tile: "bg-rose-50",
    icon: "text-rose-700",
    chip: "bg-rose-100 text-rose-700",
  },
  slate: {
    tile: "bg-slate-100",
    icon: "text-slate-700",
    chip: "bg-slate-200 text-slate-700",
  },
  success: {
    tile: "bg-emerald-50",
    icon: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    tile: "bg-amber-50",
    icon: "text-amber-700",
    chip: "bg-amber-100 text-amber-700",
  },
  info: {
    tile: "bg-blue-50",
    icon: "text-blue-700",
    chip: "bg-blue-100 text-blue-700",
  },
  neutral: {
    tile: "bg-slate-100",
    icon: "text-slate-700",
    chip: "bg-slate-200 text-slate-700",
  },
};

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
  trailing,
}: StatCardProps) {
  const t = tones[tone] ?? tones.slate;
  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span
        aria-hidden="true"
        className={[
          "grid h-11 w-11 shrink-0 place-items-center rounded-[10px]",
          t.tile,
          t.icon,
        ].join(" ")}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">
            {label}
          </p>
          {trailing}
        </div>
        <p className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900">
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[12px] text-slate-500">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}