"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * AuthSync Component
 * 
 * Menangani sinkronisasi sesi antar tab (cross-tab session).
 * Komponen ini mendeteksi perubahan state autentikasi dari localStorage/cookies
 * dan melakukan redirect yang sesuai.
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
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");
  
  // Menggunakan ref untuk melacak state sebelumnya agar kita tahu kapan terjadi TRANSISI
  const prevAuth = useRef<boolean | null>(null);

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
        PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));

      if (!isPublic) {
        toast.info("Sesi Anda telah berakhir. Silakan login kembali.", {
          id: "auth-sync-logout",
        });
        router.push("/login");
      }
    }

    // 2. Deteksi LOGIN di tab lain (Transition: false -> true).
    // Jangan redirect dari /login berdasarkan snapshot lokal saja; halaman
    // login memvalidasi session ke backend agar cookie stale tidak membuat loop.
    if (prevAuth.current === false && isAuthenticated === true) {
      if (!isLoginRoute) {
        toast.success(`Selamat datang kembali, ${user?.name || 'User'}!`, {
          id: "auth-sync-login",
        });
      }
    }

    // Update ref untuk deteksi transisi berikutnya
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated, isLoginRoute, pathname, router, user]);

  return null;
}
