"use client";

import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["border-b border-slate-200 px-5 py-4", className].join(" ")}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={[
        "text-[14.5px] font-semibold tracking-tight text-slate-900",
        className,
      ].join(" ")}
    >
      {children}
    </h2>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={["mt-0.5 text-[12.5px] text-slate-500", className].join(" ")}>
      {children}
    </p>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={["px-5 py-4", className].join(" ")}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["border-t border-slate-200 px-5 py-4", className].join(" ")}
    >
      {children}
    </div>
  );
}