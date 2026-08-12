"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import type { Role } from "@/lib/types";

interface DashboardShellProps {
  /** Active role — used to render the correct sidebar nav. */
  role: Role;
  /** Main content rendered beside the sidebar. */
  children: ReactNode;
}

/**
 * Shared dashboard layout.
 *  - Desktop (≥1024px): fixed sidebar (260px) + main content area.
 *  - Tablet/Mobile (<1024px): sidebar collapses; hamburger opens a drawer.
 *
 * The drawer locks body scroll while open and closes on route-change.
 * Clicking the backdrop OR the close button OR a nav item closes it.
 */
export default function DashboardShell({ role, children }: DashboardShellProps) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock body scroll while the drawer is open (mounted prevents SSR mismatch).
  useEffect(() => {
    if (!mounted) return;
    if (typeof document === "undefined") return;
    document.body.dataset.drawerOpen = drawerOpen ? "true" : "false";
    return () => {
      if (typeof document !== "undefined") {
        delete document.body.dataset.drawerOpen;
      }
    };
  }, [drawerOpen, mounted]);

  // Close on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Don't render the shell until we know the user state to avoid hydration
  // flashes between logged-in / logged-out.
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar — fixed at lg, hidden below. */}
      <aside
        className="hidden w-[260px] shrink-0 lg:sticky lg:top-0 lg:block lg:h-screen"
        aria-label="Primary navigation"
      >
        <Sidebar role={role} />
      </aside>

      {/* Main column (header + content). */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          role={role}
          onMenuToggle={() => setDrawerOpen((v) => !v)}
        />
        <main
          className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
          data-testid="dashboard-main"
        >
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      <div
        className={[
          "fixed inset-0 z-40 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close navigation"
          tabIndex={drawerOpen ? 0 : -1}
          onClick={() => setDrawerOpen(false)}
          className={[
            "absolute inset-0 bg-slate-900 transition-opacity",
            drawerOpen ? "opacity-50" : "opacity-0",
          ].join(" ")}
        />
        {/* Panel */}
        <div
          className={[
            "absolute left-0 top-0 h-full w-[280px] max-w-[85%] bg-white shadow-xl transition-transform",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white shadow-cta-green"
              >
                <span className="text-[12px] font-semibold tracking-tight">EA</span>
              </span>
              <span className="text-sm font-semibold text-slate-900">
                EduAssign Pro
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <Sidebar
            role={role}
            variant="drawer"
            onNavigate={() => setDrawerOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
