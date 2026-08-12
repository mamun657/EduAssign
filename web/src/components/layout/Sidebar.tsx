"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardList,
  UserCog,
  FileText,
  Inbox,
  Link2,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional badge text shown to the right of the item. */
  badge?: string;
}

/**
 * Grouped sidebar items — each role gets 1–2 labeled sections so the rail
 * reads like a proper product nav, not a flat list.
 */
type SidebarGroup = { label: string; items: SidebarItem[] };

const ADMIN_GROUPS: SidebarGroup[] = [
  {
    label: "Administration",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Students", href: "/admin/students", icon: Users },
      { label: "Teachers", href: "/admin/teachers", icon: UserCog },
      { label: "Subjects", href: "/admin/subjects", icon: BookOpen },
      { label: "Curriculum", href: "/admin/curriculum", icon: GraduationCap },
    ],
  },
  {
    label: "Assignments",
    items: [
      {
        label: "Teacher → Student → Subject",
        href: "/admin/teacher-student-subject",
        icon: Link2,
      },
      { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
      { label: "Submissions", href: "/admin/submissions", icon: Inbox },
    ],
  },
];

const TEACHER_GROUPS: SidebarGroup[] = [
  {
    label: "Teaching",
    items: [
      { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
      { label: "Students", href: "/teacher/students", icon: Users },
      { label: "Subjects", href: "/teacher/subjects", icon: BookOpen },
    ],
  },
  {
    label: "Assignments",
    items: [
      { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
      { label: "Submissions", href: "/teacher/submissions", icon: Inbox },
    ],
  },
];

const STUDENT_GROUPS: SidebarGroup[] = [
  {
    label: "Learning",
    items: [
      { label: "Dashboard", href: "/student", icon: LayoutDashboard },
      { label: "Subjects", href: "/student/subjects", icon: BookOpen },
      { label: "Assignments", href: "/student/assignments", icon: FileText },
    ],
  },
];

export function groupsForRole(role: Role): SidebarGroup[] {
  switch (role) {
    case "Admin":
      return ADMIN_GROUPS;
    case "Teacher":
      return TEACHER_GROUPS;
    case "Student":
      return STUDENT_GROUPS;
  }
}

function roleSubtitle(role: Role): string {
  switch (role) {
    case "Admin":
      return "Administrator";
    case "Teacher":
      return "Teacher";
    case "Student":
      return "Student";
  }
}

interface SidebarProps {
  role: Role;
  /** When true, renders the visual style for the slide-in mobile drawer. */
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
}

function isActive(pathname: string, href: string): boolean {
  // For hash links (legacy anchors), only the base path matters. The page
  // itself handles in-page scrolling.
  const [path, hash] = href.split("#");
  if (hash) {
    return pathname === path;
  }
  // don't want /teacher/students to also highlight the Overview item.
  if (href === "/admin" || href === "/teacher" || href === "/student") {
    return pathname === href;
  }
  // Sub-routes use exact + prefix match (e.g. /admin/students/123 keeps the
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({
  role,
  variant = "desktop",
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const groups = groupsForRole(role);
  const isDrawer = variant === "drawer";

  return (
    <nav
      aria-label="Primary"
      className={[
        "flex h-full flex-col gap-5",
        isDrawer ? "p-4" : "border-r border-slate-200 bg-white p-4",
      ].join(" ")}
    >
      <Link
        href={`/${role.toLowerCase()}`}
        className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
      >
        <span
          aria-hidden="true"
          className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-white shadow-cta-green"
        >
          <span className="text-[13px] font-semibold tracking-tight">EA</span>
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13.5px] font-semibold tracking-tight text-slate-900">
            EduAssign Pro
          </span>
          <span className="truncate text-[11px] font-medium text-slate-500">
            {roleSubtitle(role)} workspace
          </span>
        </span>
      </Link>

      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {group.label}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                        active
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "absolute inset-y-1.5 left-0 w-[3px] rounded-r-full transition-opacity",
                          active
                            ? "bg-emerald-600 opacity-100"
                            : "opacity-0",
                        ].join(" ")}
                      />
                      <Icon
                        aria-hidden="true"
                        className={[
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active
                            ? "text-emerald-600"
                            : "text-slate-400 group-hover:text-slate-600",
                        ].join(" ")}
                        strokeWidth={active ? 2.25 : 2}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span
                          className={[
                            "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
                            active
                              ? "bg-white text-emerald-700"
                              : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-medium text-slate-700">
          Need a hand?
        </p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Reach the academic office or your assigned teacher for assignments,
          submissions, and grading help.
        </p>
      </div>
    </nav>
  );
}
