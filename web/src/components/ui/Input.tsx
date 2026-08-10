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
    "h-10 rounded-lg border bg-[#FFFFFF] text-sm text-[#111827]",
    "placeholder:text-[#9CA3AF]",
    "focus:outline-none focus:ring-2 focus:ring-offset-1",
    error
      ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#FECACA]"
      : "border-[#E5E7EB] focus:border-[#111827] focus:ring-[#E5E7EB]",
    "disabled:bg-[#F9FAFB] disabled:text-[#6B7280]",
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
        <label htmlFor={inputId} className="text-sm font-medium text-[#111827]">
          {label}
        </label>
      ) : null}
      {hasAdornment ? (
        <div
          className={[
            "relative flex items-center rounded-lg border bg-[#FFFFFF]",
            "focus-within:ring-2 focus-within:ring-offset-1",
            error
              ? "border-[#DC2626] focus-within:border-[#DC2626] focus-within:ring-[#FECACA]"
              : "border-[#E5E7EB] focus-within:border-[#111827] focus-within:ring-[#E5E7EB]",
            "disabled:bg-[#F9FAFB]",
          ].join(" ")}
        >
          {leftIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
              {leftIcon}
            </span>
          ) : null}
          {inputElement}
          {rightAdornment ? (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280]">
              {rightAdornment}
            </span>
          ) : null}
        </div>
      ) : (
        inputElement
      )}
      {error ? (
        <p className="text-xs text-[#DC2626]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#6B7280]">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;