"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, defaultPathFor } from "@/components/auth/AuthProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";

type DemoRole = "Admin" | "Teacher" | "Student";

interface DemoCredential {
  role: DemoRole;
  email: string;
  password: string;
}

const DEMO_CREDENTIALS: Record<DemoRole, DemoCredential> = {
  Admin: {
    role: "Admin",
    email: "demo.admin@eduassign.local",
    password: "Demo@123!",
  },
  Teacher: {
    role: "Teacher",
    email: "demo.teacher@eduassign.local",
    password: "Demo@123!",
  },
  Student: {
    role: "Student",
    email: "demo.student@eduassign.local",
    password: "Demo@123!",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { login, user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(defaultPathFor(user.role));
  }, [ready, user, router]);

  async function doLogin(emailValue: string, passwordValue: string) {
    const u = await login({ email: emailValue.trim(), password: passwordValue });
    router.push(defaultPathFor(u.role));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await doLogin(email, password);
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ?? "Sign-in failed. Check your details and try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDemoLogin(role: DemoRole) {
    const cred = DEMO_CREDENTIALS[role];
    setDemoRole(role);
    setEmail(cred.email);
    setPassword(cred.password);
    setShow(false);
    setError(null);
    setSubmitting(true);
    try {
      await doLogin(cred.email, cred.password);
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ??
        `Demo ${role.toLowerCase()} login failed. Register this account first.`;
      setError(msg);
    } finally {
      setSubmitting(false);
      setDemoRole(null);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top header */}
      <header className="flex items-center justify-between px-6 py-3 sm:px-10 lg:px-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            EA
          </span>
          <span className="text-base font-semibold tracking-tight">EduAssign Pro</span>
        </Link>
        <p className="text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Register
          </Link>
        </p>
      </header>

      {/* Main two-column content */}
      <div className="grid min-h-[calc(100vh-73px)] items-center justify-items-center px-6 pb-4 sm:px-10 lg:px-14 xl:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] xl:gap-10">
        {/* Left: form */}
        <div className="mx-auto w-full max-w-md xl:mx-0 xl:max-w-md xl:translate-x-2 xl:translate-y-4 xl:self-center xl:pl-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your EduAssign Pro workspace.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@school.edu"
            />
            <div className="relative">
              <Input
                label="Password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-[34px] inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                {show ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.6 19.6 0 0 1 4.06-5.94" />
                    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.7 19.7 0 0 1-3.27 4.59" />
                    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting && !demoRole}
              className="mt-2"
            >
              Sign in
            </Button>
          </form>

          {/* Quick demo login */}
          <div className="mt-5">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Quick demo login
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {(["Admin", "Teacher", "Student"] as DemoRole[]).map((r) => {
                const isLoading = submitting && demoRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onDemoLogin(r)}
                    disabled={submitting}
                    aria-label={`Sign in as demo ${r.toLowerCase()}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                        {r === "Admin" ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l3 7h7l-5.5 4.5L18 22l-6-4-6 4 1.5-8.5L2 9h7z" />
                          </svg>
                        ) : r === "Teacher" ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-5 9 5-9 5-9-5z" />
                            <path d="M7 11v5a5 5 0 0 0 10 0v-5" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 10L12 4 2 10l10 6 10-6z" />
                            <path d="M6 12v5c0 1.7 3.6 3 6 3s6-1.3 6-3v-5" />
                          </svg>
                        )}
                      </span>
                    )}
                    <span>{r}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Demo accounts use shared credentials. Sign-in errors mean the account has not been registered yet.
            </p>
          </div>
        </div>

        {/* Right: illustration */}
        <div className="mt-6 hidden w-full items-center justify-center self-center xl:mt-0 xl:flex xl:translate-x-4 xl:translate-y-4">
          <div className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200/60">
            <Image
              src="/assets/img1.png"
              alt="EduAssign Pro workspace preview"
              width={1600}
              height={900}
              sizes="(max-width: 1279px) 0vw, 55vw"
              priority
              // className="absolute inset-0 h-full w-full select-none object-cover"
               className="absolute inset-0 h-full w-full scale-125 object-cover select-none"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}