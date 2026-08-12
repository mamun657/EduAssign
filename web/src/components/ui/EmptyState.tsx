"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h3 className="text-[14.5px] font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-[13px] leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
