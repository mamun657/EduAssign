"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#111827] text-[#FFFFFF] hover:bg-[#1F2937] active:bg-[#0B1220] focus-visible:ring-[#111827] disabled:bg-[#9CA3AF]",
  secondary:
    "bg-[#FFFFFF] text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB] active:bg-[#F3F4F6] focus-visible:ring-[#111827] disabled:opacity-60",
  ghost:
    "bg-transparent text-[#111827] hover:bg-[#F9FAFB] active:bg-[#F3F4F6] focus-visible:ring-[#111827] disabled:opacity-50",
  danger:
    "bg-[#DC2626] text-[#FFFFFF] hover:bg-[#B91C1C] active:bg-[#991B1B] focus-visible:ring-[#DC2626] disabled:bg-[#FCA5A5]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    className = "",
    disabled,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFFFF]",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});

export default Button;