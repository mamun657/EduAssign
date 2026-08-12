"use client";

import { useEffect, useState } from "react";
import { Menu, LogOut, UserCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import Button from "@/components/ui/Button";
import type { Role } from "@/lib/types";

interface DashboardHeaderProps {
  role: Role;
  onMenuToggle: () => void;
}

const ROLE_LABEL: Record<Role, string> = {
  Admin: "Administrator",
  Teacher: "Teacher",
  Student: "Student",
};

const ROLE_BADGE: Record<Role, string> = {
  Admin: "bg-violet-50 text-violet-700",
  Teacher: "bg-blue-50 text-blue-700",
  Student: "bg-emerald-50 text-emerald-700",
};

export default function DashboardHeader({ role, onMenuToggle }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger — visible only below lg. Desktop uses the fixed sidebar. */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white shadow-cta-green"
          >
            <span className="text-[12px] font-semibold tracking-tight">EA</span>
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13.5px] font-semibold text-slate-900">
              EduAssign Pro
            </span>
            <span className="hidden truncate text-[11px] font-medium text-slate-500 sm:block">
              {ROLE_LABEL[role]} workspace
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {mounted && user ? (
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm sm:flex">
            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[11px] font-semibold uppercase tracking-tight text-white"
            >
              {(user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")}
            </span>
            <span className="text-[13px] font-medium text-slate-800">
              {user.firstName} {user.lastName}
            </span>
            <span
              className={[
                "ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                ROLE_BADGE[role],
              ].join(" ")}
            >
              {user.role}
            </span>
          </div>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={logout}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
