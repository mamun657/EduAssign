"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, defaultPathFor } from "@/components/auth/AuthProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(defaultPathFor(user.role));
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login({ email: email.trim(), password });
      router.push(defaultPathFor(u.role));
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ?? "Sign-in failed. Check your details and try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
              EA
            </span>
            <span className="text-base font-semibold">EduAssign Pro</span>
          </div>
          <h2 className="mt-16 text-3xl font-semibold leading-tight">
            A focused workspace for your classroom.
          </h2>
          <p className="mt-3 max-w-md text-slate-300">
            Sign in to continue managing assignments, subjects and curriculum
            for your institution.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Role-based access for Admin, Teacher and Student
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            School and College curricula out of the box
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Secure JWT auth, BCrypt-hashed passwords
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              EA
            </span>
            <span className="text-base font-semibold">EduAssign Pro</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            New here?{" "}
            <Link href="/register" className="font-medium text-slate-900 underline-offset-4 hover:underline">
              Create an account
            </Link>
            .
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <div>
              <Input
                label="Password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={show}
                  onChange={(e) => setShow(e.target.checked)}
                />
                Show password
              </label>
            </div>
            <Button type="submit" size="lg" fullWidth loading={submitting}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}