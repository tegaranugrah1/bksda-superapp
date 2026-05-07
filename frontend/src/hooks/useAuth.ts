"use client";

import { useMemo, useSyncExternalStore } from "react";
import { authStore, parseAuthSnapshot, type StoredUser } from "@/lib/auth-store";

export type User = StoredUser;

export function useAuth() {
  const snapshot = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    () => ""
  );
  const { token, user } = useMemo(() => parseAuthSnapshot(snapshot), [snapshot]);

  return { user, isAuthenticated: Boolean(token && user) };
}
