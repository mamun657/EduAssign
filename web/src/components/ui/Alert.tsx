"use client";

import type { ReactNode } from "react";

type AlertTone = "info" | "success" | "error" | "warning";

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

const tones: Record<AlertTone, string> = {
  info: "bg-sky-50 text-sky-800 border-sky-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  error: "bg-rose-50 text-rose-800 border-rose-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
};

export default function Alert({ tone = "info", children, className = "" }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={[
        "rounded-lg border px-4 py-3 text-sm",
        tones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}