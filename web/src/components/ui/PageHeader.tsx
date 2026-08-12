"use client";

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Optional eyebrow label rendered above the title (e.g. "Students / 12 total"). */
  eyebrow?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="truncate text-[26px] font-semibold tracking-tight text-slate-900 sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}