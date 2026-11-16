"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authStore } from "@/lib/auth-store";
import api from "@/lib/api";
import { toast } from "sonner";

/**
 * AuthSync Component
 *
 * Menangani sinkronisasi sesi antar tab (cross-tab session) dan penyegaran
 * profil/role/access_modules terbaru dari server agar perubahan IAM langsung aktif.
 */

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_PREFIXES = [
  "/informasi",
  "/kawasan",
  "/tsl",
  "/galeri",
  "/profil",
  "/publikasi",
  "/hubungi-kami",
  "/verifikasi",
];

export function AuthSync() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Menggunakan ref untuk melacak state sebelumnya agar kita tahu kapan terjadi TRANSISI
  const prevAuth = useRef<boolean | null>(null);
  const lastSyncRef = useRef<{ at: number; path: string; username: string }>({ at: 0, path: "", username: "" });
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.username || PUBLIC_ROUTES.includes(pathname)) {
      return;
    }

    let cancelled = false;
    const syncUser = async (forceOnPathChange = false) => {
      const now = Date.now();
      const sameUser = lastSyncRef.current.username === user.username;
      const samePath = lastSyncRef.current.path === pathname;
      if (syncingRef.current) return;
      if (sameUser && (!forceOnPathChange || samePath) && now - lastSyncRef.current.at < 3000) {
        return;
      }

      syncingRef.current = true;
      try {
        const base = (api.defaults.baseURL || "/api").replace(/\/$/, "");
        const headers: Record<string, string> = { Accept: "application/json" };
        const token = localStorage.getItem("bksda_token");
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${base}/user`, { credentials: "include", headers });
        lastSyncRef.current = { at: Date.now(), path: pathname, username: user.username };
        if (!res.ok || cancelled) return;

        const json = await res.json().catch(() => null);
        const freshUser = json?.data;
        if (
          !freshUser ||
          typeof freshUser !== "object" ||
          Array.isArray(freshUser) ||
          !freshUser.username ||
          !freshUser.role
        ) {
          return;
        }

        if (freshUser.is_active === false) {
          authStore.logout();
          return;
        }
        authStore.updateUser(freshUser);
      } catch {
        // Ignore transient sync errors so route API calls own auth failure handling.
      } finally {
        syncingRef.current = false;
      }
    };

    syncUser(true);

    const onFocusOrVisible = () => {
      if (document.visibilityState === "hidden") return;
      syncUser(false);
    };
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [isAuthenticated, pathname, user?.username]);

  useEffect(() => {
    // Inisialisasi pada mount pertama
    if (prevAuth.current === null) {
      // Kita hanya inisialisasi state awal. JANGAN lakukan redirect di sini
      // karena berisiko race condition dengan hidrasi Next.js.
      // Proteksi awal biarkan ditangani oleh RouteGuard di level layout/page.
      prevAuth.current = isAuthenticated;
      return;
    }

    // 1. Deteksi LOGOUT di tab lain (Transition: true -> false)
    if (prevAuth.current === true && isAuthenticated === false) {
      const isPublic =
        pathname === "/" ||
        PUBLIC_ROUTES.includes(pathname) ||
        PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

      if (!isPublic) {
        toast.info("Sesi Anda telah berakhir. Silakan login kembali.", {
          id: "auth-sync-logout",
        });
        router.push("/login");
      }
    }

    // Update ref untuk deteksi transisi berikutnya
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated, pathname, router]);

  return null;
}
