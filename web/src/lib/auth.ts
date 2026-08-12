

"use client";

import { jwtDecode } from "jwt-decode";
import type { Role, AuthResponse, User } from "./types";

const TOKEN_KEY = "eduassign.token";
const USER_KEY = "eduassign.user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setAuth(payload: AuthResponse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, payload.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function isTokenExpired(token: string): boolean {
  try {
    const claims = jwtDecode<{ exp?: number }>(token);
    if (!claims.exp) return true;
    return Date.now() >= claims.exp * 1000;
  } catch {
    return true;
  }
}

export function hasRole(user: User | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function dashboardPathFor(role: Role): string {
  switch (role) {
    case "Admin":
      return "/admin";
    case "Teacher":
      return "/teacher";
    case "Student":
      return "/student";
  }
}