"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, defaultPathFor } from "@/components/auth/AuthProvider";
import LandingPage from "./_landing/LandingPage";

/**
 * Public landing route.
 *
 * If a session is active, the visitor is sent to the dashboard for their
 * role so they don't see marketing copy after they have already signed in.
 * The actual landing-page UI lives in `_landing/LandingPage.tsx`.
 */
export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace(defaultPathFor(user.role));
  }, [ready, user, router]);

  return <LandingPage />;
}
