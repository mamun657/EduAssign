"use client";

import type { ReactNode } from "react";

/**
 * Semantic tones — keep palette small so the UI stays cohesive.
 *  - neutral  gray    (Inactive, Draft)
 *  - success  green   (Active, Reviewed, Published-confirmed, Approved)
 *  - info     blue    (Published, In progress, New)
 *  - warning  amber   (Submitted, Pending, Awaiting review)
 *  - danger   rose    (Rejected, Overdue, Disabled)
 *  - violet   purple  (Optional / elective subjects)
 */
type Tone = "neutral" | "success" | "info" | "warning" | "danger" | "violet";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  /** When true, renders a colored 6px dot prefix per Example C. */
  withDot?: boolean;
  className?: string;
}

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

const dotColor: Record<Tone, string> = {
  neutral: "bg-slate-400",
  success: "bg-emerald-600",
  info: "bg-blue-600",
  warning: "bg-amber-500",
  danger: "bg-rose-600",
  violet: "bg-violet-600",
};

export default function Badge({
  children,
  tone = "neutral",
  withDot = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      ].join(" ")}
    >
      {withDot ? (
        <span
          aria-hidden="true"
          className={["h-1.5 w-1.5 rounded-full", dotColor[tone]].join(" ")}
        />
      ) : null}
      {children}
    </span>
  );
}