"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearAuth as clearAuthStorage,
  getToken,
  getUser,
  isTokenExpired,
  setAuth as setAuthStorage,
  setUser as setUserStorage,
  dashboardPathFor,
} from "@/lib/auth";
import { Auth } from "@/lib/api";
import type { LoginRequest, RegisterRequest, Role, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (req: LoginRequest) => Promise<User>;
  register: (req: RegisterRequest) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    const u = getUser();
    if (t && u && !isTokenExpired(t)) {
      setToken(t);
      setUserState(u);
    } else if (t) {
      clearAuthStorage();
    }
    setReady(true);
  }, []);

  const login = useCallback<AuthContextValue["login"]>(async (req) => {
    const res = await Auth.login(req);
    setAuthStorage(res);
    setToken(res.token);
    setUserState(res.user);
    return res.user;
  }, []);

  const register = useCallback<AuthContextValue["register"]>(async (req) => {
    const res = await Auth.register(req);
    setAuthStorage(res);
    setToken(res.token);
    setUserState(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUserState(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const u = await Auth.me();
    setUserStorage(u);
    setUserState(u);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, ready, login, register, logout, refreshUser }),
    [user, token, ready, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function defaultPathFor(role: Role): string {
  return dashboardPathFor(role);
}