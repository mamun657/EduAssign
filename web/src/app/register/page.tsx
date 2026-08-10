"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, defaultPathFor } from "@/components/auth/AuthProvider";
import { AcademicLevels } from "@/lib/api";
import type { AcademicLevel, Role } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";

type PwdStrength = "empty" | "weak" | "fair" | "good" | "strong";

function passwordScore(p: string): PwdStrength {
  if (!p) return "empty";
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 2) return "weak";
  if (score === 3) return "fair";
  if (score === 4) return "good";
  return "strong";
}

function pwdRules(p: string) {
  return [
    { label: "8+ characters", ok: p.length >= 8 },
    { label: "Number", ok: /\d/.test(p) },
    { label: "Uppercase letter", ok: /[A-Z]/.test(p) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(p) },
    { label: "Lowercase letter", ok: /[a-z]/.test(p) },
  ];
}

const strengthLabel: Record<PwdStrength, string> = {
  empty: "",
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};
const strengthBar: Record<PwdStrength, string> = {
  empty: "bg-slate-200",
  weak: "bg-rose-500",
  fair: "bg-amber-500",
  good: "bg-sky-500",
  strong: "bg-emerald-500",
};
const strengthWidth: Record<PwdStrength, string> = {
  empty: "w-0",
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
};

const UserIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.31 0-8 1.67-8 5v1h16v-1c0-3.33-4.69-5-8-5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const MailIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2.4-.5 6.6 5.2L18.6 6H5.4Zm15.1 1.7-7.2 5.7a1 1 0 0 1-1.26 0L5 7.7v9.8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V7.7Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);
const PhoneIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M5 4.5A1.5 1.5 0 0 1 6.5 3h2.6c.6 0 1.13.4 1.3.98l1 3.4a1.3 1.3 0 0 1-.36 1.38l-1.6 1.4a12 12 0 0 0 4.4 4.4l1.4-1.6a1.3 1.3 0 0 1 1.38-.36l3.4 1c.58.17.98.7.98 1.3v2.6A1.5 1.5 0 0 1 19.5 19h-1C10.5 19 4 12.5 4 4.5v-0Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);
const LockIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M6 10V8a6 6 0 1 1 12 0v2M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const EyeIcon = ({ off }: { off?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    {off ? (
      <>
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M10.6 6.1A10.3 10.3 0 0 1 12 6c5 0 9 4.2 10 6-.4.7-1.3 1.9-2.7 3M6.6 6.6C4.7 8 3.3 9.9 2.9 11.5 3.7 13 7.7 18 12 18c1.6 0 3-.4 4.3-1.1"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </>
    ) : (
      <>
        <path
          d="M2.9 11.5C3.9 9.6 7.9 5.5 12 5.5s8.1 4.1 9.1 6c-1 1.9-5 6-9.1 6s-8.1-4.1-9.1-6Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11.5" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      </>
    )}
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, ready } = useAuth();
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [levelsError, setLevelsError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: "" as "" | Exclude<Role, "Admin">,
    academicLevelId: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    AcademicLevels.list()
      .then((list) => {
        if (cancelled) return;
        setLevels(list.filter((l) => l.isActive));
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          (err as { message?: string })?.message ??
          "Unable to load academic levels. Please try again.";
        setLevelsError(msg);
        setLevels([]);
      })
      .finally(() => {
        if (!cancelled) setLevelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready && user) router.replace(defaultPathFor(user.role));
  }, [ready, user, router]);

  const pwdStrength = useMemo(() => passwordScore(form.password), [form.password]);
  const rules = useMemo(() => pwdRules(form.password), [form.password]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "role" && v !== "Student" && p.academicLevelId) {
        next.academicLevelId = "";
      }
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (form.password.length < 8) errs.password = "Minimum 8 characters";
    if (!/[A-Z]/.test(form.password)) errs.password = errs.password ?? "Add an uppercase letter";
    if (!/[a-z]/.test(form.password)) errs.password = errs.password ?? "Add a lowercase letter";
    if (!/\d/.test(form.password)) errs.password = errs.password ?? "Add a digit";
    if (!/[^A-Za-z0-9]/.test(form.password)) errs.password = errs.password ?? "Add a special character";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (!form.role) errs.role = "Select a role";
    if (form.role === "Student" && !form.academicLevelId) errs.academicLevelId = "Select your academic level";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const u = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phoneNumber: form.phoneNumber.trim() || undefined,
        role: form.role as Exclude<Role, "Admin">,
        academicLevelId: form.role === "Student" ? form.academicLevelId : undefined,
      });
      router.push(defaultPathFor(u.role));
    } catch (err) {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> };
      if (anyErr?.errors) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(anyErr.errors)) {
          flat[k.toLowerCase()] = v.join(" ");
        }
        setFieldErrors(flat);
      }
      setError(anyErr?.message ?? "Registration failed. Please review the form.");
    } finally {
      setSubmitting(false);
    }
  }

  const passwordEyeButton = (
    <button
      type="button"
      aria-label={showPwd ? "Hide password" : "Show password"}
      onClick={() => setShowPwd((v) => !v)}
      className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-600"
    >
      <EyeIcon off={showPwd} />
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            EA
          </span>
          <span className="text-base font-semibold tracking-tight">EduAssign Pro</span>
        </Link>
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </header>

      <div className="grid min-h-[calc(100vh-73px)] items-center gap-10 px-6 pb-12 pt-2 sm:px-10 lg:px-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] xl:gap-12">
        <div className="mx-auto w-full max-w-xl xl:mx-0 xl:max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Create your account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Join EduAssign Pro to author, submit, and grade with confidence.
          </p>

          <form onSubmit={onSubmit} className="mt-8 w-full">
            {error ? (
              <Alert tone="error" className="mb-5">
                {error}
              </Alert>
            ) : null}

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Input
                label="First name"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                autoComplete="given-name"
                error={fieldErrors.firstName}
                placeholder="Abir"
                leftIcon={UserIcon}
                required
              />
              <Input
                label="Last name"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                autoComplete="family-name"
                error={fieldErrors.lastName}
                placeholder="Khan"
                leftIcon={UserIcon}
                required
              />
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
                error={fieldErrors.email}
                placeholder="abir@example.com"
                leftIcon={MailIcon}
                required
              />
              <Input
                label="Phone number (optional)"
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => set("phoneNumber", e.target.value)}
                autoComplete="tel"
                placeholder="+8801888888888"
                leftIcon={PhoneIcon}
              />
              <Input
                label="Password"
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete="new-password"
                error={fieldErrors.password}
                placeholder="At least 8 characters"
                leftIcon={LockIcon}
                rightAdornment={passwordEyeButton}
                required
              />
              <Input
                label="Confirm password"
                type={showPwd ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                autoComplete="new-password"
                error={fieldErrors.confirmPassword}
                placeholder="Re-enter your password"
                leftIcon={LockIcon}
                rightAdornment={passwordEyeButton}
                required
              />
              <Select
                label="Role"
                value={form.role}
                onChange={(e) => set("role", e.target.value as typeof form.role)}
                error={fieldErrors.role}
                required
              >
                <option value="">Select a role</option>
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </Select>
              <Select
                label="Academic level"
                value={form.academicLevelId}
                onChange={(e) => set("academicLevelId", e.target.value)}
                error={fieldErrors.academicLevelId}
                required={form.role === "Student"}
                disabled={form.role !== "Student" || levelsLoading}
              >
                <option value="">
                  {form.role !== "Student"
                    ? "Select a role first"
                    : levelsLoading
                      ? "Loading academic levels…"
                      : levelsError
                        ? "Unable to load academic levels"
                        : "Select academic level"}
                </option>
                {!levelsLoading && !levelsError
                  ? levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))
                  : null}
              </Select>
            </div>

            {/* Password strength meter + checklist */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Password strength</span>
                <span className="font-medium text-slate-500">
                  {strengthLabel[pwdStrength] || "0/5"}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full transition-all ${strengthBar[pwdStrength]} ${strengthWidth[pwdStrength]}`}
                />
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-500 sm:grid-cols-3">
                {rules.map((r) => (
                  <li key={r.label} className="flex items-center gap-2">
                    <span
                      className={[
                        "inline-flex h-1.5 w-1.5 flex-none rounded-full",
                        r.ok ? "bg-emerald-500" : "bg-slate-300",
                      ].join(" ")}
                    />
                    <span className={r.ok ? "text-slate-700" : ""}>{r.label}</span>
                  </li>
                ))}
              </ul>
              {levelsError ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
                  onClick={() => {
                    setLevelsLoading(true);
                    setLevelsError(null);
                    AcademicLevels.list()
                      .then((list) => {
                        setLevels(list.filter((l) => l.isActive));
                      })
                      .catch((err) => {
                        const msg =
                          (err as { message?: string })?.message ??
                          "Unable to load academic levels. Please try again.";
                        setLevelsError(msg);
                      })
                      .finally(() => setLevelsLoading(false));
                  }}
                >
                  Retry loading academic levels
                </button>
              ) : null}
            </div>

            <Button type="submit" size="md" className="mt-8" loading={submitting}>
              Create account
            </Button>
          </form>
        </div>

   
        <div className="mx-auto hidden w-full max-w-2xl xl:block xl:justify-self-end">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200/60">
            <Image
              src="/assets/img2.png"
              alt="EduAssign Pro workspace preview"
              width={1600}
              height={900}
              sizes="(max-width: 1279px) 0vw, 55vw"
              priority
              className="absolute inset-0 h-full w-full select-none object-cover"
              draggable={false}
            />
          </div>
        </div>
      </div>

      <footer className="px-6 pb-6 text-center text-xs text-slate-400 sm:px-10 lg:px-14">
        © 2026 EduAssign Pro · All rights reserved.
      </footer>
    </div>
  );
}