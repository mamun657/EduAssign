"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, GraduationCap } from "lucide-react";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#roles", label: "Solutions" },
  { href: "#faq", label: "FAQ" },
];

//   • "light" = navbar over a BLACK section (translucent dark bg + white text + white CTA)
//   • "dark"  = navbar over a WHITE section (translucent light bg + dark text + black CTA)
// intersecting the top of the viewport (handled in the effect below).
type NavTone = "light" | "dark";

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Default to "light" so the navbar looks intentional over the BLACK hero
  // before the scroll observer has a chance to attach.
  const [tone, setTone] = useState<NavTone>("light");

  useEffect(() => setMounted(true), []);

  // has scrolled past the hero, AND determine which section's tone the
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
      determineTone();
    }
    function determineTone() {
      // whose top is closest to (but ≤) the scroll position + a small
      // offset. That section is "under" the navbar right now.
      const probeY = window.scrollY + 80; // mid-navbar
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-nav-tone]")
      );
      if (sections.length === 0) return;
      let active: HTMLElement | null = null;
      for (const s of sections) {
        const top = s.offsetTop;
        if (top <= probeY) active = s;
        else break;
      }
      if (!active) return;
      const t = active.getAttribute("data-nav-tone");
      if (t === "light" || t === "dark") setTone(t);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof document === "undefined") return;
    document.body.dataset.drawerOpen = open ? "true" : "false";
    return () => {
      if (typeof document !== "undefined") {
        delete document.body.dataset.drawerOpen;
      }
    };
  }, [open, mounted]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
  }

  // ---- Navbar tokens -----------------------------------------------------
  // text. The previous tone-aware surface flipped to `bg-white/40` over the

  // it gains a hairline white border + a subtle bottom shadow for elevation.
  const surface = scrolled
    ? "border-b border-white/10 bg-black shadow-[0_1px_0_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.35)]"
    : "border-b border-transparent bg-black";

  // readable on every section.
  const fgText = "text-white";
  const fgTextHover = "hover:text-white/70";
  const fgBrand = "text-white";

  const ctaPrimary =
    "bg-white text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

  const hamburger = "hover:bg-white/10";
  const drawerBg = "bg-black border-white/10";
  const drawerItem = "text-white hover:bg-white/10";
  const drawerBorder = "border-white/10";
  const drawerSignIn =
    "border-white/25 bg-black text-white hover:bg-white/10";

  return (
    <header
      data-scrolled={scrolled ? "true" : "false"}
      data-tone={tone}
      className={[
        "sticky top-0 z-30 w-full transition-[background-color,border-color,color,box-shadow] duration-300 ease-out",
        surface,
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex max-w-[1280px] items-center justify-between px-6 sm:px-10 lg:px-14",
          scrolled ? "h-14" : "h-16",
        ].join(" ")}
      >
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="EduAssign Pro home"
          onClick={close}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-black">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </span>
          <span
            className={[
              "text-[15px] font-semibold tracking-tight",
              fgBrand,
            ].join(" ")}
          >
            EduAssign Pro
          </span>
        </Link>

        <nav
          className="hidden items-center gap-9 lg:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={[
                "text-[14px] font-medium transition-colors",
                fgText,
                fgTextHover,
              ].join(" ")}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className={[
              "inline-flex h-10 items-center justify-center rounded-md border border-white/25 bg-black px-4 text-[14px] font-medium text-white transition-colors hover:bg-white/10",
            ].join(" ")}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={[
              "inline-flex h-10 items-center justify-center rounded-full px-4 text-[14px] font-semibold transition-[transform,filter,background-color] duration-200 hover:-translate-y-0.5",
              ctaPrimary,
            ].join(" ")}
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className={[
            "inline-flex h-10 w-10 items-center justify-center rounded-md text-white transition-colors lg:hidden",
            hamburger,
          ].join(" ")}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        className={[
          "fixed inset-x-0 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        style={{ top: scrolled ? 56 : 64 }}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close navigation"
          tabIndex={open ? 0 : -1}
          onClick={close}
          className={[
            "fixed inset-0 bg-black transition-opacity",
            open ? "opacity-70" : "opacity-0",
          ].join(" ")}
          style={{ top: scrolled ? 56 : 64 }}
        />
        <div
          className={[
            "relative mx-3 mt-2 overflow-hidden rounded-xl border transition-all",
            drawerBg,
            open
              ? "translate-y-0 opacity-100"
              : "-translate-y-2 opacity-0",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <nav
            className="flex flex-col gap-1 p-3"
            aria-label="Mobile primary"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={close}
                className={[
                  "rounded-md px-3 py-2.5 text-sm font-medium",
                  drawerItem,
                ].join(" ")}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div
            className={["flex flex-col gap-2 border-t p-3", drawerBorder].join(
              " ",
            )}
          >
            <Link
              href="/login"
              onClick={close}
              className={[
                "inline-flex h-11 items-center justify-center rounded-full border bg-transparent text-sm font-medium transition-colors",
                drawerSignIn,
              ].join(" ")}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={close}
              className="inline-flex h-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-black"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
