"use client";

import type { ReactNode } from "react";

type AlertTone = "info" | "success" | "error" | "warning";

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

const tones: Record<AlertTone, string> = {
  info: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
  success: "bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]",
  error: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
  warning: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
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