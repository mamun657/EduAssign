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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#FFFFFF] px-6 py-10 text-center">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#F9FAFB] text-[#6B7280]">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-[#6B7280]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
