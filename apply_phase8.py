#!/usr/bin/env python3
"""Apply Phase 8 landing-page redesign — Hero section rewrite only.

Strategy: read the original file, locate the Hero block (lines containing
`function Hero() {` ... through the end of `function HeroMarquee() { ... }`,
immediately before the `/* ─── Features` divider) and splice in the new
Hero + HeroVisual + HeroMarquee implementation. Other sections (Features,
HowItWorks, Roles, ProductShowcase, AISimilarity, Security, FAQ, FinalCTA,
Footer) are left untouched.

The replacement preserves:
  • existing imports at the top of the file
  • existing landing Nav (LandingNav.tsx)  — not touched
  • the rest of the LandingPage.tsx file  — untouched
  • all SSR-safety guarantees (no Date.now, Math.random, window/document in
    initial render; mask-image / radial gradients are static inline styles)
"""
from __future__ import annotations
import io
import sys

PATH = r"c:\EduAssign\web\src\app\_landing\LandingPage.tsx"

# Anchors used to delimit the existing block in the source file.
# We replace from "function Hero() {" (the first occurrence) through the end of
# "function HeroMarquee() { ... }", stopping right before the next section
# divider comment that begins the Features section.
START_MARKER = "function Hero() {"
END_MARKER_PREFIX = "function Features()"

NEW_BLOCK = r'''function Hero() {
  // ---------------------------------------------------------------------
  // Full-screen cinematic hero. The hero's `<section>` is exactly 100svh tall
  // (minus the navbar height handled by the section's own top padding) so the
  // entire first-viewport composition — navbar, eyebrow, headline,
  // description, CTAs, trust bullets, hero image, and the compact feature
  // strip — fits without scrolling at every required desktop resolution.
  //
  // The image is rendered at natural aspect ratio, sized via min(...) so it
  // scales smoothly between 1280px and 1920px+. It sits on the right with a
  // very subtle edge-fade (only on the bottom-left corner of the image, never
  // across the subjects) so the image's own dark background merges with the
  // hero's #0B0F1A background into a single continuous cinematic scene.
  // ---------------------------------------------------------------------
  return (
    <section
      className="relative isolate overflow-hidden bg-[#0B0F1A] text-white"
      aria-label="Introduction"
    >
      {/* Ambient cinematic lighting — extremely soft, layered radial gradients.
          Two warm halos behind the image (subtle gold/amber), a top vignette
          for navbar contrast, and a subtle bottom dimming for depth. No
          neon, no glow blobs, no blue/cyan/AI gradients. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        {/* primary warm halo behind the image — very soft, very low opacity */}
        <div
          className="absolute right-[-15%] top-[-10%] h-[120%] w-[80%] blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(180,130,45,0.10), rgba(180,130,45,0) 70%)",
          }}
        />
        {/* secondary deep amber wash, lower-right */}
        <div
          className="absolute bottom-[-25%] right-[-10%] h-[95%] w-[85%] blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(212,167,75,0.07), rgba(212,167,75,0) 70%)",
          }}
        />
        {/* very faint top vignette so the navbar text reads cleanly */}
        <div
          className="absolute inset-x-0 top-0 h-24"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0))",
          }}
        />
        {/* very fine bottom dimming for cinematic depth — leaves room for the
            feature strip at the bottom of the hero */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)",
          }}
        />
      </div>

      {/* Top navigation strip — already rendered by <LandingNav /> outside the
          <main>; this hero just reserves the navbar height at the top so its
          own content is positioned correctly. */}

      {/* Two-column full-screen layout. Left column: eyebrow + headline +
          description + CTAs + benefits. Right column: hero image. The feature
          strip is pinned to the bottom of the section so it sits inside the
          first viewport. */}
      <div className="relative mx-auto flex h-[100svh] min-h-[640px] max-w-[1400px] flex-col px-5 pt-[68px] sm:px-8 sm:pt-[72px] lg:px-12 lg:pt-[76px]">
        {/* Main row: two columns */}
        <div className="relative flex flex-1 items-center">
          {/* Left content — eyebrow + headline + description + CTAs + benefits */}
          <div className="hero-fade-in relative z-10 w-full max-w-[560px] lg:w-[44%]">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D4A74B]" />
              Assignment &amp; Submission Platform
            </span>

            <h1 className="mt-5 text-[42px] font-semibold leading-[1.05] tracking-tight text-white sm:text-[52px] lg:text-[60px]">
              Manage Assignments.{" "}
              <span className="bg-gradient-to-r from-white via-white to-[#C9C6BD] bg-clip-text text-transparent">
                Empower Learning.
              </span>
            </h1>

            <p className="mt-5 max-w-[520px] text-[15px] leading-7 text-[#C9C6BD] sm:text-base">
              EduAssign Pro gives schools and colleges one secure workspace to
              manage classes, assignments, submissions, grading, feedback, and
              academic workflows — built for Admins, Teachers, and Students.
            </p>

            <div className="hero-fade-in hero-fade-in-delay-1 mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#E5C683] to-[#B8862F] px-5 text-sm font-semibold text-[#1A1304] shadow-[0_8px_24px_-10px_rgba(212,167,75,0.55)] transition-[transform,filter,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C683] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F1A]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/[0.03] px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/[0.08]"
              >
                Sign In
              </Link>
            </div>

            <ul className="hero-fade-in hero-fade-in-delay-2 mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#B6B0A2]">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D4A74B]" aria-hidden="true" />
                Role-based access
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D4A74B]" aria-hidden="true" />
                Secure submissions
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D4A74B]" aria-hidden="true" />
                Built for schools &amp; colleges
              </li>
            </ul>
          </div>

          {/* Right hero image — natural aspect ratio (1740×904, ~1.92),
              sized so it stays large on desktop but never pushes the layout
              below the fold. Soft edge fade only on the bottom and the very
              left edge to dissolve it into the hero without ever cutting the
              subjects. */}
          <HeroVisual />
        </div>

        {/* Bottom feature strip — compact, fully inside the first viewport,
            seamlessly continues the hero composition. */}
        <div className="pb-5 sm:pb-6">
          <HeroMarquee />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  // The image is 1740×904 (aspect ~1.92). We render it at NATURAL aspect ratio
  // (no object-cover, no fixed container) so the image's own dark background
  // merges with the hero's #0B0F1A background into a single continuous
  // cinematic scene — no perceptible rectangle, no border, no shadow, no card.
  //
  // Width is `min(720px, 56vw)` so the image feels large but never dominates
  // the composition. The left edge fades to transparent over the first ~12%
  // and the bottom edge fades over the last ~10% — never touching the
  // subjects themselves (they sit center-right of the frame).
  //
  // The image is layered behind the left text column on large screens but
  // always with `z-0` / `pointer-events: none`, so it never intercepts clicks.
  return (
    <picture
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-0 select-none"
    >
      <img
        src="/assets/background.png"
        alt=""
        draggable={false}
        className={[
          // desktop: large, right-aligned, vertically centered
          "hero-fade-in hero-fade-in-delay-1",
          "absolute top-1/2 right-0 -translate-y-1/2",
          "h-auto w-[min(720px,56vw)] max-w-none",
          // tablet/mobile: stack below text, smaller, centered
          "max-[1023px]:!static max-[1023px]:!translate-y-0",
          "max-[1023px]:mt-8 max-[1023px]:h-auto max-[1023px]:w-[min(520px,82vw)] max-[1023px]:mx-auto",
        ].join(" ")}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          WebkitUserDrag: "none",
          // very soft edge fade so the image's dark background merges with
          // the hero's #0B0F1A. The fade never crosses the subjects — left
          // edge fades over the first 18% (the empty left side of the frame),
          // bottom edge fades over the last 12% (the lower edge / table).
          WebkitMaskImage:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)",
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      />
    </picture>
  );
}

function HeroMarquee() {
  const items = [
    { icon: <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />, label: "Smart Assignments" },
    { icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />, label: "Easy Grading" },
    { icon: <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />, label: "Academic Workflow" },
    { icon: <Users className="h-3.5 w-3.5" aria-hidden="true" />, label: "Real-time Feedback" },
    { icon: <LineChart className="h-3.5 w-3.5" aria-hidden="true" />, label: "Analytics & Reports" },
    { icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />, label: "Secure & Reliable" },
    { icon: <Building2 className="h-3.5 w-3.5" aria-hidden="true" />, label: "For Every Institution" },
  ];
  // Render the same list twice so an infinite -50% translate creates a
  // seamless loop without any visible jump.
  const track = items.concat(items);
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] backdrop-blur-sm"
      role="region"
      aria-label="Platform capabilities"
    >
      {/* left fade edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14"
        style={{
          background:
            "linear-gradient(to right, rgba(11,15,26,1), rgba(11,15,26,0))",
        }}
      />
      {/* right fade edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14"
        style={{
          background:
            "linear-gradient(to left, rgba(11,15,26,1), rgba(11,15,26,0))",
        }}
      />
      <div className="hero-marquee">
        {track.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            className="flex shrink-0 items-center gap-2 px-5 py-2.5 text-[12.5px] font-medium text-[#D8D3C5]"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.05] text-[#D4A74B] ring-1 ring-inset ring-white/10">
              {it.icon}
            </span>
            <span className="whitespace-nowrap">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
'''

def main() -> int:
    with io.open(PATH, "r", encoding="utf-8") as fh:
        src = fh.read()

    if "function Hero()" not in src:
        print("ERROR: START_MARKER not found", file=sys.stderr)
        return 1
    if "function Features()" not in src:
        print("ERROR: END_MARKER_PREFIX not found", file=sys.stderr)
        return 1

    start_idx = src.index(START_MARKER)
    end_idx = src.index(END_MARKER_PREFIX)

    new_src = src[:start_idx] + NEW_BLOCK + "\n" + src[end_idx:]

    with io.open(PATH, "w", encoding="utf-8") as fh:
        fh.write(new_src)
    print(f"OK: wrote {len(new_src)} bytes to {PATH}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())