"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Library,
  LineChart,
  ShieldCheck,
  Users,
  UsersRound,
  Building2,
  ScanSearch,
  Network,
  PieChart,
  Layers,
  Lock,
  MessageCircle,
  FileCheck2,
} from "lucide-react";
import LandingNav from "./LandingNav";

/* ────────────────────────────────────────────────────────────────────────────
   Small primitives
   ──────────────────────────────────────────────────────────────────────────── */

// the previous 7xl so the layout doesn't feel wider than the hero — but
// horizontal padding is more generous so the type can breathe.
function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["mx-auto w-full max-w-[1280px] px-6 sm:px-10 lg:px-14", className].join(" ")}>
      {children}
    </div>
  );
}

// Section label / eyebrow. Two intents:
//   • on a WHITE section  → muted dark gray
//   • on a BLACK section  → muted white
// uppercase tracking on a small horizontal divider.
function SectionLabel({
  index,
  children,
  tone = "dark",
  dash = true,
}: {
  index?: string;
  children: React.ReactNode;
  tone?: "dark" | "light";
  dash?: boolean;
}) {
  const isLight = tone === "light";
  return (
    <div
      className={[
        "flex items-center gap-3 text-[11px] font-medium uppercase",
        "tracking-[0.22em]",
        isLight ? "text-white/55" : "text-[#666666]",
      ].join(" ")}
    >
      <span>{children}</span>
    </div>
  );
}

// between dark text on white sections and white text on black sections.
function SectionHeading({
  children,
  tone = "dark",
  size = "lg",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
  size?: "md" | "lg" | "xl";
}) {
  const isLight = tone === "light";
  const sizes =
    size === "xl"
      ? "text-[44px] sm:text-[64px] lg:text-[80px]"
      : size === "md"
      ? "text-[36px] sm:text-[44px] lg:text-[52px]"
      : "text-[40px] sm:text-[52px] lg:text-[64px]";
  return (
    <h2
      className={[
        "font-semibold leading-[1.04] tracking-[-0.02em]",
        sizes,
        isLight ? "text-white" : "text-[#111111]",
      ].join(" ")}
    >
      {children}
    </h2>
  );
}

// than the previous design so the type can carry the editorial weight.
function SectionLede({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  const isLight = tone === "light";
  return (
    <p
      className={[
        "max-w-[640px] text-[16px] leading-[1.65] sm:text-[18px] sm:leading-[1.6]",
        isLight ? "text-white/65" : "text-[#666666]",
      ].join(" ")}
    >
      {children}
    </p>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Hero
   ──────────────────────────────────────────────────────────────────────────── */

function Hero() {
  // ---------------------------------------------------------------------
  // and the subtle bottom marquee — fits inside the first viewport.
  //
  // Composition intent: TEXT + IMAGE = ONE VISUAL, not two columns.
  //   • Left column widened (≈50% on desktop) so the headline reads as two
  //     lines and creates a stronger horizontal relationship with the image.
  //   • Image sized to roughly 48–58% of hero width on desktop and allowed
  //     to overlap toward the center.
  //   • Image dissolves on all four edges so the source's dark background
  //     becomes indistinguishable from the hero background.
  //   • No colored gradient halos behind the image; the image's own
  //     warm tones are the only color in the hero.
  // ---------------------------------------------------------------------
  return (
    <section
      data-nav-tone="light"
      className="relative isolate overflow-hidden bg-black text-white"
      aria-label="Introduction"
    >
      {/* Subtle top vignette only — for navbar contrast. No warm halos, no
          colored gradients, no glow. The hero is intentionally black. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className="absolute inset-x-0 top-0 h-24"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0))",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-65px)] max-w-[1480px] flex-col px-6 pt-[64px] sm:px-10 sm:pt-[68px] lg:px-14 lg:pt-[72px]">
        <div className="relative flex flex-1 items-center">
          <div className="hero-fade-in relative z-10 w-full max-w-[640px] lg:w-[50%]">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
              Assignment &amp; Submission Platform
            </span>

            <h1 className="mt-6 text-[42px] font-semibold leading-[1.04] tracking-[-0.02em] text-white sm:text-[56px] lg:text-[68px] lg:leading-[1.02]">
              Manage Assignments.
              <br />
              <span className="text-white/85">Empower Learning.</span>
            </h1>

            <p className="mt-6 max-w-[440px] text-[14.5px] leading-[1.65] text-white/60 sm:text-[15px]">
              EduAssign Pro gives schools and colleges one secure workspace to
              manage classes, assignments, submissions, grading, feedback, and
              academic workflows — built for Admins, Teachers, and Students.
            </p>

            <ul className="hero-fade-in hero-fade-in-delay-1 mt-10 flex flex-wrap gap-x-7 gap-y-2 text-[13px] text-white/55 sm:mt-12">
              <li className="inline-flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
                Role-based access
              </li>
              <li className="inline-flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
                Secure submissions
              </li>
              <li className="inline-flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
                Built for schools &amp; colleges
              </li>
            </ul>
          </div>

          <HeroVisual />
        </div>

        <div className="pb-4 sm:pb-5">
          <HeroMarquee />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  // Phase 10 — fullscreen monochrome hero.
  //
  // The image is 1740×904 (aspect ≈ 1.92). We render it at NATURAL aspect
  // ratio (no object-cover, no fixed container) so the image's own dark
  // continuous cinematic scene — NO perceptible rectangle, NO border, NO
  //
  // image is vertically centered and extends naturally toward the right
  //
  // own dark pixels become indistinguishable from the hero background.
  // No warm halo behind the image — the hero is intentionally monochrome.
  //
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
          "hero-fade-in hero-fade-in-delay-1",
          // desktop: large, right-aligned, slightly extends past the right
          "absolute top-1/2 right-[-2%] -translate-y-1/2",
          "h-auto w-[min(880px,58vw)] max-w-none",
          // tablet/mobile: stack below text, smaller, centered
          "max-[1023px]:!static max-[1023px]:!translate-y-0",
          "max-[1023px]:mt-10 max-[1023px]:h-auto max-[1023px]:w-[min(560px,86vw)] max-[1023px]:mx-auto",
        ].join(" ")}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          //            asset, so the right side dissolves into the page)
          WebkitMaskImage:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)",
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        } as React.CSSProperties}
      />
    </picture>
  );
}

function HeroMarquee() {
  // is duplicated (A B C D E F G A B C D E F G) and translated by exactly
  // -50%, so when the first copy scrolls off the left the second copy is in
  // the identical position the first copy started at — no visible jump,
  // infinite loop.
  //
  // proof points, not feature chips.
  const items: Array<{ icon: React.ReactNode; label: string }> = [
    { icon: <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />, label: "Smart Assignments" },
    { icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />, label: "Easy Grading" },
    { icon: <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />, label: "Academic Workflow" },
    { icon: <Users className="h-3.5 w-3.5" aria-hidden="true" />, label: "Real-time Feedback" },
    { icon: <LineChart className="h-3.5 w-3.5" aria-hidden="true" />, label: "Analytics & Reports" },
    { icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />, label: "Secure & Reliable" },
    { icon: <Building2 className="h-3.5 w-3.5" aria-hidden="true" />, label: "For Every Institution" },
  ];
  const track = items.concat(items);
  return (
    <div
      className="relative w-full overflow-hidden"
      role="region"
      aria-label="Platform capabilities"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 sm:w-28"
        style={{
          background:
            "linear-gradient(to right, #000000 0%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 sm:w-28"
        style={{
          background:
            "linear-gradient(to left, #000000 0%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div className="hero-marquee-track">
        {track.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            className="flex shrink-0 items-center gap-2.5 px-7 py-1 text-[12.5px] font-medium text-white/55 sm:gap-3 sm:px-9 sm:text-[13px]"
          >
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-white/55">
              {it.icon}
            </span>
            <span className="whitespace-nowrap tracking-wide">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Features() {
  // a "hero feature" — a larger two-column row. The remaining features are
  // listed below as an asymmetric editorial grid (1 + 2 + 2) with thin gray
  // separators instead of rounded cards.
  //
  //
  // Phase 12c: Compact content (one short sentence per feature), tighter
  // typography, and a landscape (3:2) fig3.png illustration placed
  // inline with the section header so it does NOT push the feature cards
  // further down the page.
  const heroFeature = {
    index: "01",
    icon: <ClipboardList className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />,
    title: "Assignment Management",
    body: "Create and manage class assignments.",
  };
  const features = [
    {
      index: "02",
      icon: <Users className="h-5 w-5" aria-hidden="true" />,
      title: "Student Management",
      body: "Organize students by level and subject.",
    },
    {
      index: "03",
      icon: <UsersRound className="h-5 w-5" aria-hidden="true" />,
      title: "Teacher Management",
      body: "Assign teachers to classes and subjects.",
    },
    {
      index: "04",
      icon: <FileCheck2 className="h-5 w-5" aria-hidden="true" />,
      title: "Submission & Grading",
      body: "Review submissions, marks, and feedback.",
    },
    {
      index: "05",
      icon: <Library className="h-5 w-5" aria-hidden="true" />,
      title: "Curriculum Management",
      body: "Manage subjects, levels, and electives.",
    },
    {
      index: "06",
      icon: <ScanSearch className="h-5 w-5" aria-hidden="true" />,
      title: "AI-Powered Similarity Detection",
      body: "Detect similar submissions with AI.",
    },
  ];

  return (
    <section
      id="features"
      data-nav-tone="dark"
      className="bg-[#FFFFFF] text-[#111111]"
      aria-label="Features"
    >
      <Container className="py-14 sm:py-16 lg:py-20">
        {/* Section header — 2-column editorial intro. The eyebrow + heading
            live on the left so the section reads as a strong statement.
            The landscape (3:2) fig3.png illustration lives on the right
            inside the same header band, so it does NOT push the feature
            cards further down the page. */}
        <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <SectionLabel index="01" tone="dark">
              Features
            </SectionLabel>
            <div className="mt-4">
              <SectionHeading size="md" tone="dark">
                Everything you need
                <br />
                to run assignments.
              </SectionHeading>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="mx-auto w-full max-w-[440px] lg:mx-0 lg:ml-auto lg:max-w-[520px]">
              <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: "3 / 2" }}
              >
                <img
                  src="/assets/fig3.png"
                  alt="EduAssign Pro features overview illustration"
                  draggable={false}
                  className="absolute inset-0 h-full w-full select-none object-contain"
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-black/10 sm:mt-10">
          <article className="grid gap-6 border-b border-black/10 py-7 sm:py-9 lg:grid-cols-12 lg:items-start lg:gap-12">
            <div className="lg:col-span-5">
              <div className="text-[#111111]">
                {heroFeature.icon}
              </div>
            </div>
            <div className="lg:col-span-7">
              <h3 className="text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#111111] sm:text-[24px]">
                {heroFeature.title}
              </h3>
              <p className="mt-2 max-w-[560px] text-[13.5px] leading-[1.55] text-[#666666]">
                {heroFeature.body}
              </p>
            </div>
          </article>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 lg:divide-x lg:divide-black/10">
            {features.map((f, i) => (
              <article
                key={f.title}
                className={[
                  "border-b border-black/10 py-6 sm:py-8 lg:px-10",
                  "lg:first:pl-0",
                  i % 2 === 0 ? "lg:pr-10" : "lg:pl-10",
                  "px-0 sm:px-0",
                ].join(" ")}
              >
                <div className="text-[#111111]">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold leading-[1.25] tracking-[-0.01em] text-[#111111] sm:text-[16px]">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.55] text-[#666666]">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   How It Works
   ──────────────────────────────────────────────────────────────────────────── */

function HowItWorks() {
  // BLACK section — editorial workflow showcase. Two-column header:
  // eyebrow + heading + supporting paragraph on the LEFT, smaller fig7.png
  // illustration on the RIGHT. Compact 4-step row at the bottom. No
  // dashboard card, no border, no shadow, no large numbers, no decorative
  // dash beside the eyebrow.
  const steps = [
    {
      title: "Setup",
      body: "Set up your institution.",
    },
    {
      title: "Assign",
      body: "Create and assign work.",
    },
    {
      title: "Submit",
      body: "Submit assignments easily.",
    },
    {
      title: "Review",
      body: "Review and give feedback.",
    },
  ];

  return (
    <section
      id="how-it-works"
      data-nav-tone="light"
      className="bg-black text-white"
      aria-label="How it works"
    >
      <Container className="py-14 sm:py-16 lg:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
              Workflow
            </div>
            <h2 className="mt-4 text-[36px] font-semibold leading-[1.04] tracking-[-0.02em] text-white sm:text-[44px] lg:text-[52px]">
              One clear workflow
              <br />
              for every institution.
            </h2>
            <p className="mt-5 max-w-[420px] text-[14px] leading-[1.6] text-white/60 sm:text-[15px]">
              Bring classes, assignments, submissions, review, and academic
              management into one dependable workspace. Less switching tools,
              more teaching.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="mx-auto w-full max-w-[420px] lg:ml-auto lg:mr-0">
              <img
                src="/assets/fig7.png"
                alt="EduAssign Pro workflow illustration"
                draggable={false}
                className="block h-auto w-full select-none"
                style={{
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            </div>
          </div>
        </div>

        <ol className="mt-10 grid grid-cols-1 divide-y divide-white/10 border-t border-white/10 sm:mt-12 sm:grid-cols-2 sm:divide-white/10 lg:mt-14 lg:grid-cols-4 lg:divide-x lg:divide-y-0 lg:divide-white/10">
          {steps.map((s) => (
            <li
              key={s.title}
              className="px-0 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-6 lg:first:pl-0 lg:last:pr-0"
            >
              <h3 className="text-[15px] font-semibold leading-[1.2] tracking-[-0.01em] text-white sm:text-[16px]">
                {s.title}
              </h3>
              <p className="mt-1.5 max-w-[220px] text-[12.5px] leading-[1.5] text-white/55 sm:text-[13px]">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Roles
   ──────────────────────────────────────────────────────────────────────────── */

function Roles() {
  // vertical lines.
  const roles = [
    {
      role: "Admin",
      tagline: "Manage your institution",
      points: [
        "Manage teachers",
        "Manage students",
        "Manage subjects",
        "Manage curriculum",
      ],
    },
    {
      role: "Teacher",
      tagline: "Teach and evaluate",
      points: [
        "Create assignments",
        "Review submissions",
        "Analyze similarity",
        "Give marks and feedback",
      ],
    },
    {
      role: "Student",
      tagline: "Learn and submit",
      points: [
        "View assignments",
        "Submit work",
        "Track status",
        "View grades and feedback",
      ],
    },
  ];

  return (
    <section
      id="roles"
      data-nav-tone="dark"
      className="bg-[#F7F7F5] text-[#111111]"
      aria-label="Roles"
    >
      <Container className="py-20 sm:py-24 lg:py-32">
        <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionLabel tone="dark" dash={false}>
              Solutions
            </SectionLabel>
            <h2 className="mt-6 text-[40px] font-semibold leading-[1.04] tracking-[-0.02em] text-[#111111] sm:text-[52px] lg:text-[64px]">
              One workspace,
              <br />
              three clear roles.
            </h2>
            <p className="mt-6 max-w-[420px] text-[16px] leading-[1.6] text-[#666666] sm:text-[18px] sm:leading-[1.55]">
              One workspace for admins, teachers, and students.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="mx-auto w-full max-w-[440px] lg:mx-0 lg:ml-auto lg:max-w-[560px]">
              <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: "1 / 1" }}
              >
                <img
                  src="/assets/admin.png"
                  alt="EduAssign Pro workspace connecting admin, teacher, and student roles"
                  draggable={false}
                  className="absolute inset-0 h-full w-full select-none object-contain"
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 border-y border-black/10 sm:mt-20 lg:mt-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:divide-x lg:divide-black/10">
            {roles.map((r, i) => (
              <article
                key={r.role}
                className={[
                  "px-0 py-12 sm:px-8 lg:py-16",
                  i > 0 ? "border-t border-black/10 sm:border-t-0" : "",
                  i === 2 ? "sm:col-span-2 sm:border-t sm:border-black/10 lg:col-span-1 lg:border-t-0" : "",
                  "lg:first:pl-0 lg:last:pr-0",
                ].join(" ")}
              >
                <h3 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#111111] sm:text-[44px]">
                  {r.role}
                </h3>
                <p className="mt-3 text-[16px] text-[#666666]">
                  {r.tagline}
                </p>
                <ul className="mt-8 space-y-3 text-[15px] text-[#151515]">
                  {r.points.map((p, idx) => (
                    <li
                      key={p}
                      className="leading-[1.55]"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Product Showcase (dark navy)
   ──────────────────────────────────────────────────────────────────────────── */

function ProductShowcase() {
  // itself stays dark (charcoal, not navy) so it feels like a real
  // decorative halos.
  return (
    <section
      data-nav-tone="light"
      className="bg-black text-white"
      aria-label="Product showcase"
    >
      <Container className="py-28 sm:py-36 lg:py-44">
        {/* Editorial section header — same two-column pattern as elsewhere. */}
        <div className="grid gap-10 sm:gap-14 lg:grid-cols-12 lg:items-end lg:gap-20">
          <div className="lg:col-span-7">
            <SectionLabel index="04" tone="light">
              Workflow
            </SectionLabel>
            <div className="mt-6">
              <SectionHeading size="lg" tone="light">
                One clear workflow
                <br />
                for every institution.
              </SectionHeading>
            </div>
          </div>
          <div className="lg:col-span-5">
            <SectionLede tone="light">
              Bring classes, assignments, submissions, review, and academic
              management into one dependable workspace. Less switching tools,
              more teaching.
            </SectionLede>
          </div>
        </div>

        <div className="mt-20 sm:mt-24">
          <div className="overflow-hidden rounded-md border border-white/10 bg-[#0A0A0A]">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="ml-3 text-[12px] font-medium text-white/40">
                eduassign / workflow
              </span>
            </div>
            <div className="grid divide-y divide-white/10 border-b border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              <DarkStat label="Classes" value="3 levels" sub="School · College" />
              <DarkStat label="Workflows" value="End-to-end" sub="Setup → Review" />
              <DarkStat label="Roles" value="3" sub="Admin · Teacher · Student" />
              <DarkStat label="Access" value="Role-based" sub="Server enforced" />
            </div>
            <div className="px-5 py-6 sm:px-7 sm:py-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">
                Workflow
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:gap-4">
                {["Setup", "Assign", "Submit", "Review"].map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-3 sm:gap-4">
                    <span className="inline-flex h-9 items-center rounded-sm border border-white/15 bg-white/[0.04] px-4 text-[13px] font-medium text-white">
                      {s}
                    </span>
                    {i < arr.length - 1 ? (
                      <ArrowRight
                        className="h-3.5 w-3.5 text-white/30"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ul className="mt-12 grid grid-cols-1 gap-4 text-[14.5px] text-white/55 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-white/10">
            {[
              {
                label: "Centralized assignments",
                icon: <Layers className="h-5 w-5" aria-hidden="true" />,
              },
              {
                label: "Structured submission flow",
                icon: <FileText className="h-5 w-5" aria-hidden="true" />,
              },
              {
                label: "Marks & feedback in one place",
                icon: <MessageCircle className="h-5 w-5" aria-hidden="true" />,
              },
              {
                label: "Role-based authorization",
                icon: <Lock className="h-5 w-5" aria-hidden="true" />,
              },
            ].map((p) => (
              <li
                key={p.label}
                className="flex items-center gap-3 lg:px-6 lg:first:pl-0 lg:last:pr-0"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-white/85">
                  {p.icon}
                </span>
                <span className="text-white/80">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

function DarkStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-[20px] font-semibold leading-[1.15] tracking-[-0.01em] text-white">
        {value}
      </p>
      <p className="mt-1 text-[12px] text-white/40">{sub}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   AI Similarity
   ──────────────────────────────────────────────────────────────────────────── */

function AISimilarity() {
  // visualization on the right. No gradient blurs, no rounded glow
  // halos behind the mockup. The product artifact reads as a real
  // surface, not a decorative card.
  return (
    <section
      id="ai"
      data-nav-tone="dark"
      className="bg-[#FFFFFF] text-[#111111]"
      aria-label="AI similarity"
    >
      <Container className="py-28 sm:py-36 lg:py-44">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <SectionLabel index="05" tone="dark">
              Similarity Analysis
            </SectionLabel>
            <div className="mt-6">
              <SectionHeading size="md" tone="dark">
                Smarter submission
                <br />
                review.
              </SectionHeading>
            </div>
            <div className="mt-8">
              <SectionLede tone="dark">
                EduAssign Pro compares submitted documents using lexical and
                semantic similarity analysis to help teachers identify
                potentially similar work — supporting academic review, not
                replacing it.
              </SectionLede>
            </div>

            <ul className="mt-10 space-y-4 text-[15px] text-[#151515]">
              {[
                {
                  label: "Lexical similarity",
                  icon: <FileText className="h-4 w-4" aria-hidden="true" />,
                },
                {
                  label: "Semantic similarity",
                  icon: <Network className="h-4 w-4" aria-hidden="true" />,
                },
                {
                  label: "Overall similarity score",
                  icon: <PieChart className="h-4 w-4" aria-hidden="true" />,
                },
              ].map((p) => (
                <li
                  key={p.label}
                  className="flex items-center gap-3 leading-[1.55]"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/15 text-[#111111]"
                  >
                    {p.icon}
                  </span>
                  <span>{p.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white transition-[transform,filter,background-color] duration-200 hover:-translate-y-0.5 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Explore the workflow
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <SimilarityIllustration />
          </div>
        </div>
      </Container>
    </section>
  );
}

function SimilarityIllustration() {
  //
  // The new asset (`/assets/plagarism1.png`) is a self-contained editorial
  // illustration of AI-powered plagiarism/similarity analysis — it
  // already conveys the AI/robot, documents, and warning visual
  // concept, so the section no longer needs a separate "Similarity
  // the metric concept on their own).
  //
  // The source image is 1536×1536 (square). We render it at its NATURAL
  // aspect ratio with `object-fit: contain` so it is never stretched or
  // cropped. The wrapper is a 1:1 frame whose width responds to the
  // primary visual without dominating the section.
  //
  // same 1:1 aspect ratio so the illustration scales cleanly without
  // horizontal overflow.
  return (
    <div
      className="relative mx-auto w-full max-w-[520px] lg:mx-0 lg:max-w-[560px]"
      aria-label="AI-powered plagiarism and similarity analysis illustration"
      role="img"
    >
      {/* 1:1 illustration frame. The image is rendered with
          `object-fit: contain` so the 1536×1536 source is shown end-to-end
          — no cropping, no stretching, no distortion. */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "1 / 1" }}
      >
        <img
          src="/assets/plagarism1.png"
          alt="AI-powered plagiarism and similarity analysis illustration"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-contain"
          style={{
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      </div>
    </div>
  );
}

function SimilarityBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[#151515]">{label}</span>
        <span className="tabular-nums font-medium text-[#666666]">
          {value}%
        </span>
      </div>
      <div className="mt-2 h-[2px] w-full overflow-hidden bg-black/10">
        <div
          className="h-full bg-black"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Security
   ──────────────────────────────────────────────────────────────────────────── */

function Security() {
  // containers, no icon tiles. Just typographic rows separated by
  // hairline dividers.
  const items = [
    {
      title: "Authentication",
      body: "Secure sign-in and identity controls.",
    },
    {
      title: "Authorization",
      body: "Role-based access for Admins, Teachers and Students.",
    },
    {
      title: "Secure Submissions",
      body: "Protected assignment and submission workflow.",
    },
    {
      title: "Privacy",
      body: "Controlled access to academic data, scoped to role.",
    },
    {
      title: "Defensive Validation",
      body: "Inputs validated on both client and server.",
    },
    {
      title: "Audit-friendly",
      body: "Server-enforced role checks on every protected action.",
    },
  ];

  return (
    <section
      data-nav-tone="light"
      className="bg-black text-white"
      aria-label="Security and reliability"
    >
      <Container className="py-28 sm:py-36 lg:py-44">
        <div className="grid gap-10 sm:gap-14 lg:grid-cols-12 lg:items-end lg:gap-20">
          <div className="lg:col-span-7">
            <SectionLabel index="06" tone="light">
              Security &amp; Reliability
            </SectionLabel>
            <div className="mt-6">
              <SectionHeading size="lg" tone="light">
                Built for schools
                <br />
                and colleges.
              </SectionHeading>
            </div>
          </div>
          <div className="lg:col-span-5">
            <SectionLede tone="light">
              Authorization, authentication and access control are first-class
              concerns — not afterthoughts. Every protected action is checked
              server-side, every role is partitioned, every submission is
              scoped.
            </SectionLede>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 border-t border-white/10 sm:mt-24 lg:grid-cols-2 lg:divide-x lg:divide-white/10">
          {items.map((it, i) => (
            <div
              key={it.title}
              className={[
                "px-0 py-10 sm:py-12 lg:px-12 lg:py-14",
                i % 2 === 0 ? "lg:pr-12" : "lg:pl-12",
                i > 0 ? "border-t border-white/10 sm:border-t" : "",
                // On 2-col layout, every 2nd item starts a new column pair
                i >= 2 ? "lg:border-t lg:border-white/10" : "",
                "lg:first:pl-0 lg:last:pr-0",
              ].join(" ")}
            >
              <h3 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-white sm:text-[24px]">
                {it.title}
              </h3>
              <p className="mt-3 max-w-[420px] text-[15px] leading-[1.65] text-white/55">
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   FAQ
   ──────────────────────────────────────────────────────────────────────────── */

function FAQ() {
  // dividers between items. No card containers, no blue, no shadows.
  const items = [
    {
      q: "What is EduAssign Pro?",
      a: "EduAssign Pro is an assignment and submission management platform for schools and colleges. It gives Admins, Teachers, and Students a single workspace to manage classes, assignments, submissions, grading, and feedback.",
    },
    {
      q: "Who can use EduAssign Pro?",
      a: "Three roles: Admin (manages institution, curriculum, teachers, students), Teacher (creates assignments, reviews submissions, gives marks and feedback), and Student (views assignments, submits work, tracks grades).",
    },
    {
      q: "How does assignment submission work?",
      a: "Teachers create assignments for the classes they teach. Students see assignments for the classes they are enrolled in, submit answers with supporting files, and can track status. Teachers then review and grade.",
    },
    {
      q: "Can teachers review and grade submissions?",
      a: "Yes. Teachers review submissions for their own classes, provide marks and feedback, and the system keeps a record per student and per assignment.",
    },
    {
      q: "What is similarity analysis?",
      a: "EduAssign Pro compares submitted documents using lexical and semantic similarity analysis to help teachers identify potentially similar content. It is a review aid — not a verdict.",
    },
    {
      q: "Does similarity analysis automatically determine plagiarism?",
      a: "No. Similarity analysis provides evidence of potentially similar content. The teacher makes the final academic judgment.",
    },
  ];

  return (
    <section
      id="faq"
      data-nav-tone="dark"
      className="bg-[#F7F7F5] text-[#111111]"
      aria-label="Frequently asked questions"
    >
      <Container className="py-28 sm:py-36 lg:py-44">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <SectionLabel index="07" tone="dark">
              FAQ
            </SectionLabel>
            <div className="mt-6">
              <SectionHeading size="lg" tone="dark">
                Your questions
                <br />
                answered.
              </SectionHeading>
            </div>
            <div className="mt-8">
              <SectionLede tone="dark">
                Short answers to the questions we hear most often. If
                something isn&apos;t covered here, our team is happy to help.
              </SectionLede>
            </div>

            <div className="mt-10">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white transition-[transform,filter,background-color] duration-200 hover:-translate-y-0.5 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F7F5]"
              >
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ul className="border-t border-black/10">
              {items.map((it, i) => (
                <li key={it.q} className="border-b border-black/10">
                  <details
                    className="group"
                    {...(i === 0 ? { open: true } : {})}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 sm:py-7">
                      <span className="text-[16px] font-medium leading-[1.4] text-[#111111] sm:text-[18px]">
                        {it.q}
                      </span>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[#666666] transition-transform duration-200 group-open:rotate-45"
                      >
                        <span className="absolute h-px w-3 bg-current" />
                        <span className="absolute h-3 w-px bg-current" />
                      </span>
                    </summary>
                    <div className="pb-6 sm:pb-7">
                      <p className="max-w-[560px] text-[15px] leading-[1.65] text-[#666666]">
                        {it.a}
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Footer
   ──────────────────────────────────────────────────────────────────────────── */

// Build-time constant so the rendered footer is byte-equal on server and
// client. Avoids `new Date().getFullYear()` (which is also SSR-incompatible
// per Next.js App Router) and keeps hydration deterministic.
const COPYRIGHT_YEAR = 2026;

function Footer() {
  // (#050505) so the two adjacent dark sections read as distinct areas.
  // boundary. Three levels of typographic contrast:
  //   • Logo + brand name       → white
  //   • Column headings + links → soft white (white/85)
  //   • Description + meta      → muted gray (white/50)
  const year = COPYRIGHT_YEAR;
  return (
    <footer
      data-nav-tone="light"
      className="text-white"
      style={{ backgroundColor: "#111111" }}
    >
      <div
        aria-hidden="true"
        className="h-px w-full"
        style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
      />
      <Container className="pt-20 pb-10 sm:pt-24 sm:pb-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-black">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-white">
                EduAssign Pro
              </span>
            </div>
            <p className="mt-5 max-w-md text-[14.5px] leading-[1.65] text-white/50">
              Assignment &amp; Submission Management Platform — built for
              schools and colleges.
            </p>
          </div>

          <div className="lg:col-span-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/85">
              Product
            </p>
            <ul className="mt-5 space-y-3 text-[14.5px]">
              <li>
                <a
                  href="#features"
                  className="text-white/55 transition-colors hover:text-white"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#roles"
                  className="text-white/55 transition-colors hover:text-white"
                >
                  Solutions
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-white/55 transition-colors hover:text-white"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/85">
              Account
            </p>
            <ul className="mt-5 space-y-3 text-[14.5px]">
              <li>
                <Link
                  href="/login"
                  className="text-white/55 transition-colors hover:text-white"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-white/55 transition-colors hover:text-white"
                >
                  Create account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <p className="text-[12.5px] text-white/45">
            © {year} EduAssign Pro
          </p>
          <p className="text-[12.5px] text-white/45">
            Assignment &amp; Submission Management Platform
          </p>
        </div>
      </Container>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Page composition
   ──────────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  // Note: we intentionally do NOT set a global page background here.
  // so the alternating B/W rhythm of the page is rendered correctly even
  // at the very edges of the viewport.
  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Roles />
        <ProductShowcase />
        <AISimilarity />
        <Security />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
