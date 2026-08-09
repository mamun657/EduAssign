"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, defaultPathFor } from "@/components/auth/AuthProvider";
import Button from "@/components/ui/Button";
import Topbar from "@/components/layout/Topbar";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace(defaultPathFor(user.role));
  }, [ready, user, router]);

  return (
    <div className="min-h-screen">
      <Topbar />
      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-900/10">
              Assignment & submission platform
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              EduAssign Pro
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-600">
              A clean, secure workspace for schools and colleges. Admins manage
              curriculum and teachers, teachers create assignments, and students
              focus on learning.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Create an account</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">Sign in</Button>
              </Link>
            </div>
            <dl className="mt-12 grid grid-cols-3 gap-6 text-sm">
              <div>
                <dt className="text-slate-500">Roles</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">3</dd>
              </div>
              <div>
                <dt className="text-slate-500">Levels</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">School · College</dd>
              </div>
              <div>
                <dt className="text-slate-500">Workflows</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">End-to-end</dd>
              </div>
            </dl>
          </div>
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-slate-200 via-white to-slate-100" />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-slate-500">
                  eduassign.local / dashboard
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Today
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    3 new assignments
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Pending review
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    5 submissions
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Active students
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    28 enrolled this term
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
            <Feature
              title="Admin"
              body="Manage academic levels, subjects, teachers, students and the curriculum in one place."
            />
            <Feature
              title="Teacher"
              body="Create assignments for the students you teach, review submissions, leave feedback."
            />
            <Feature
              title="Student"
              body="Pick your optional subjects, submit work, and track grades by subject."
            />
          </div>
        </section>

        <footer className="border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} EduAssign Pro.
          </div>
        </footer>
      </main>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
