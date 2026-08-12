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
        <label
          htmlFor={selectId}
          className="text-[12.5px] font-medium text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={[
          "h-[42px] rounded-[9px] border bg-white px-3 text-[13.5px] text-slate-900",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          error
            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
            : "border-slate-300 focus:border-slate-500 focus:ring-slate-200",
          "disabled:bg-slate-50 disabled:text-slate-500",
          className,
        ].join(" ")}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="text-[11.5px] font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-[11.5px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;