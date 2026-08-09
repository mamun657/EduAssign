"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, defaultPathFor } from "@/components/auth/AuthProvider";
import { AcademicLevels, Auth } from "@/lib/api";
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
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
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
        setLevels([]);
      })
      .finally(() => setLevelsLoading(false));
  }, []);

  useEffect(() => {
    if (ready && user) router.replace(defaultPathFor(user.role));
  }, [ready, user, router]);

  const pwdStrength = useMemo(() => passwordScore(form.password), [form.password]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => {
      // If role changes away from Student, drop any stale academicLevelId so
      // we never submit academicLevelId=undefined for a Student.
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

    // client-side quick validation
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              EA
            </span>
            <span className="text-base font-semibold">EduAssign Pro</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-slate-700 hover:underline">
            Already have an account?
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Choose a role to get started. Admin accounts are created by an
              existing administrator.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-600">
              <li>· Email and password are required.</li>
              <li>· Password must be at least 8 characters with upper, lower, digit, and symbol.</li>
              <li>· Students must select School or College.</li>
            </ul>
          </div>

          <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                autoComplete="given-name"
                error={fieldErrors.firstName}
                required
              />
              <Input
                label="Last name"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                autoComplete="family-name"
                error={fieldErrors.lastName}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
                error={fieldErrors.email}
                required
                className="sm:col-span-2"
              />
              <Input
                label="Phone (optional)"
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => set("phoneNumber", e.target.value)}
                autoComplete="tel"
                className="sm:col-span-2"
              />
              <Select
                label="Role"
                value={form.role}
                onChange={(e) => set("role", e.target.value as typeof form.role)}
                error={fieldErrors.role}
                required
                className="sm:col-span-2"
              >
                <option value="">Select a role…</option>
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </Select>
              {form.role === "Student" ? (
                <div className="sm:col-span-2">
                  <Select
                    label="Academic level"
                    value={form.academicLevelId}
                    onChange={(e) => set("academicLevelId", e.target.value)}
                    error={fieldErrors.academicLevelId}
                    required
                    disabled={levelsLoading}
                  >
                    <option value="">
                      {levelsLoading
                        ? "Loading academic levels…"
                        : levelsError
                          ? "Unable to load academic levels"
                          : "Select your level…"}
                    </option>
                    {!levelsLoading && !levelsError
                      ? levels.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))
                      : null}
                  </Select>
                  {levelsError ? (
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
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
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Input
                  label="Password"
                  type={show ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="new-password"
                  error={fieldErrors.password}
                  required
                />
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full transition-all ${strengthBar[pwdStrength]} ${strengthWidth[pwdStrength]}`} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Strength: <span className="font-medium text-slate-700">{strengthLabel[pwdStrength] || "—"}</span>
                </p>
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Confirm password"
                  type={show ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  autoComplete="new-password"
                  error={fieldErrors.confirmPassword}
                  required
                />
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={show}
                    onChange={(e) => setShow(e.target.checked)}
                  />
                  Show passwords
                </label>
              </div>
            </div>
            <Button type="submit" size="lg" fullWidth className="mt-6" loading={submitting}>
              Create account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}