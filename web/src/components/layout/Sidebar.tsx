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

const ADMIN_NAV: SidebarItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Teachers", href: "/admin/teachers", icon: UserCog },
  { label: "Subjects", href: "/admin/subjects", icon: BookOpen },
  { label: "Curriculum", href: "/admin/curriculum", icon: GraduationCap },
  {
    label: "Teacher → Student → Subject",
    href: "/admin/teacher-student-subject",
    icon: Link2,
  },
  { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
  { label: "Submissions", href: "/admin/submissions", icon: Inbox },
];

const TEACHER_NAV: SidebarItem[] = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Students", href: "/teacher/students", icon: Users },
  { label: "Subjects", href: "/teacher/subjects", icon: BookOpen },
  { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
  { label: "Submissions", href: "/teacher/submissions", icon: Inbox },
];

const STUDENT_NAV: SidebarItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Subjects", href: "/student/subjects", icon: BookOpen },
  { label: "Assignments", href: "/student/assignments", icon: FileText },
];

export function navForRole(role: Role): SidebarItem[] {
  switch (role) {
    case "Admin":
      return ADMIN_NAV;
    case "Teacher":
      return TEACHER_NAV;
    case "Student":
      return STUDENT_NAV;
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
  // Overview pages (/admin, /teacher, /student) are EXACT matches only — we
  // don't want /teacher/students to also highlight the Overview item.
  if (
    href === "/admin" ||
    href === "/teacher" ||
    href === "/student"
  ) {
    return pathname === href;
  }
  // Sub-routes use exact + prefix match (e.g. /admin/students/123 keeps the
  // Students item active).
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({ role, variant = "desktop", onNavigate }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const items = navForRole(role);
  const isDrawer = variant === "drawer";

  return (
    <nav
      aria-label="Primary"
      className={[
        "flex h-full flex-col gap-1",
        isDrawer ? "p-4" : "border-r border-[#E5E7EB] bg-[#FFFFFF] p-4",
      ].join(" ")}
    >
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
        {role === "Admin"
          ? "Administration"
          : role === "Teacher"
          ? "Teaching"
          : "Learning"}
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#F9FAFB] text-[#111827]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]",
                ].join(" ")}
              >
                <Icon
                  aria-hidden="true"
                  className={[
                    "h-5 w-5 shrink-0 transition-colors",
                    active
                      ? "text-[#111827]"
                      : "text-[#6B7280] group-hover:text-[#111827]",
                  ].join(" ")}
                  strokeWidth={active ? 2.25 : 2}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto rounded-full bg-[#F9FAFB] px-2 py-0.5 text-xs font-medium text-[#6B7280]">
                    {item.badge}
                  </span>
                ) : null}
                {/* Active indicator rail */}
                <span
                  aria-hidden="true"
                  className={[
                    "ml-1 h-5 w-0.5 rounded-full transition-opacity",
                    active ? "bg-[#111827] opacity-100" : "opacity-0",
                  ].join(" ")}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
