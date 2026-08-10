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

export default function DashboardHeader({ role, onMenuToggle }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#E5E7EB] bg-[#FFFFFF]/95 px-4 backdrop-blur sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Hamburger — visible only below lg. Desktop uses the fixed sidebar. */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] text-[#111827] hover:bg-[#F9FAFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#111827] text-[#FFFFFF]"
          >
            <span className="text-xs font-bold">EA</span>
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-[#111827]">
              EduAssign Pro
            </span>
            <span className="hidden text-xs text-[#6B7280] sm:block">
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {mounted && user ? (
          <div className="hidden items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-1.5 text-sm sm:flex">
            <UserCircle2 className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
            <span className="text-[#111827]">
              {user.firstName} {user.lastName}
            </span>
            <span className="ml-1 rounded-full bg-[#F9FAFB] px-2 py-0.5 text-xs font-medium text-[#6B7280]">
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
