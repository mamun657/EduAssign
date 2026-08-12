"use client";

import type { ReactNode } from "react";

type AlertTone =
  | "info"
  | "success"
  | "error"
  | "danger"
  | "warning"
  | "neutral";

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

const tones: Record<AlertTone, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function Alert({
  tone = "info",
  children,
  className = "",
}: AlertProps) {
  const role = tone === "error" || tone === "danger" ? "alert" : "status";
  return (
    <div
      role={role}
      className={[
        "rounded-[10px] border px-4 py-3 text-[13px] font-medium",
        tones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}