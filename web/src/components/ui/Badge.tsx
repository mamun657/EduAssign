"use client";

import type { ReactNode } from "react";

type Tone = "slate" | "emerald" | "amber" | "rose" | "sky" | "violet";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const tones: Record<Tone, string> = {
  slate: "bg-[#F9FAFB] text-[#374151] ring-[#E5E7EB]",
  emerald: "bg-[#ECFDF5] text-[#16A34A] ring-[#A7F3D0]",
  amber: "bg-[#FFFBEB] text-[#B45309] ring-[#FDE68A]",
  rose: "bg-[#FEF2F2] text-[#DC2626] ring-[#FECACA]",
  sky: "bg-[#EFF6FF] text-[#1D4ED8] ring-[#BFDBFE]",
  violet: "bg-[#F5F3FF] text-[#6D28D9] ring-[#DDD6FE]",
};

export default function Badge({ children, tone = "slate", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}