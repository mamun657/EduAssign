"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { dashboardPathFor } from "@/lib/auth";
import Button from "@/components/ui/Button";

export default function Topbar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={user ? dashboardPathFor(user.role) : "/"} className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <span className="text-sm font-bold">EA</span>
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            EduAssign Pro
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.firstName} {user.lastName}{" "}
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {user.role}
                </span>
              </span>
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">Create account</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}