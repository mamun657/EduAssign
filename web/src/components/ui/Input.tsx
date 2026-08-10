"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightAdornment?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    className = "",
    id,
    leftIcon,
    rightAdornment,
    type,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hasAdornment = !!leftIcon || !!rightAdornment;

  const baseInputClasses = [
    "h-10 rounded-lg border bg-white text-sm text-slate-900",
    "placeholder:text-slate-400",
    "focus:outline-none focus:ring-2 focus:ring-offset-1",
    error
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
      : "border-slate-200 focus:border-slate-400 focus:ring-slate-200",
    "disabled:bg-slate-50 disabled:text-slate-500",
  ].join(" ");

  const inputElement = (
    <input
      ref={ref}
      id={inputId}
      type={type}
      className={[
        baseInputClasses,
        leftIcon ? "pl-10" : "px-3",
        rightAdornment ? "pr-10" : "",
        hasAdornment ? "bg-transparent" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      {hasAdornment ? (
        <div
          className={[
            "relative flex items-center rounded-lg border bg-white",
            "focus-within:ring-2 focus-within:ring-offset-1",
            error
              ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-200"
              : "border-slate-200 focus-within:border-slate-400 focus-within:ring-slate-200",
            "disabled:bg-slate-50",
          ].join(" ")}
        >
          {leftIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </span>
          ) : null}
          {inputElement}
          {rightAdornment ? (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              {rightAdornment}
            </span>
          ) : null}
        </div>
      ) : (
        inputElement
      )}
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;