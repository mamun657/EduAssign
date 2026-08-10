"use client";

import { forwardRef, type SelectHTMLAttributes, useId, type ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className = "", id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-[#111827]">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={[
          "h-10 rounded-lg border bg-[#FFFFFF] px-3 text-sm text-[#111827]",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          error
            ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#FECACA]"
            : "border-[#E5E7EB] focus:border-[#111827] focus:ring-[#E5E7EB]",
          "disabled:bg-[#F9FAFB] disabled:text-[#6B7280]",
          className,
        ].join(" ")}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs text-[#DC2626]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#6B7280]">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;