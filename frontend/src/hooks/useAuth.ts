"use client";

import { useSyncExternalStore } from "react";
import { authStore } from "@/lib/auth-store";

export function useAuth() {
  // Hook sakti React 18: otomatis re-render komponen jika snapshot berubah
  const userStr = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    () => null // Server-side fallback
  );

  // Parse JSON dengan aman
  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      console.error("Gagal membaca profil pengguna.");
    }
  }

  return {
    user,
    isAuthenticated: !!user,
    login: authStore.login,
    logout: authStore.logout,
  };
}
