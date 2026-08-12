"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant =
  | "primary"
  | "success"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-soft";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-slate-900 disabled:bg-slate-400",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-600 disabled:bg-emerald-300 shadow-cta-green",
  secondary:
    "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400 disabled:opacity-60",
  ghost:
    "bg-transparent text-slate-800 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400 disabled:opacity-50",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-600 disabled:bg-rose-300",
  "danger-soft":
    "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:bg-rose-200 focus-visible:ring-rose-300 disabled:opacity-60",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] rounded-[8px]",
  md: "h-[42px] px-4 text-[13.5px] rounded-[9px]",
  lg: "h-12 px-6 text-[15px] rounded-[10px]",
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
        "inline-flex items-center justify-center gap-2 font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
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