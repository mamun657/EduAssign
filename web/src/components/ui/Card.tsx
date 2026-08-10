"use client";

import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-sm",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={["border-b border-[#E5E7EB] px-6 py-4", className].join(" ")}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={["text-base font-semibold text-[#111827]", className].join(" ")}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={["mt-0.5 text-sm text-[#6B7280]", className].join(" ")}>
      {children}
    </p>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={["px-6 py-5", className].join(" ")}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={["border-t border-[#E5E7EB] px-6 py-4", className].join(" ")}
    >
      {children}
    </div>
  );
}