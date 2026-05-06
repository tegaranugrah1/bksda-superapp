"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface RouteGuardProps {
  children: React.ReactNode;
  /** 
   * Jika diisi (misal: 'inventory'), guard akan mengecek 
   * apakah user memiliki izin ke modul tersebut.
   */
  requiredModule?: string; 
}

export function RouteGuard({ children, requiredModule }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Ambil Identitas dari Brankas Lokal
    const token = localStorage.getItem("bksda_token");
    const userStr = localStorage.getItem("bksda_user");

    // 2. Jika tidak ada tiket masuk sama sekali, usir ke gerbang depan
    if (!token || !userStr) {
      router.replace("/login");
      return;
    }

    // 3. Pengecekan Ekstra (Module Based Access Control di Frontend)
    if (requiredModule) {
      try {
        const user = JSON.parse(userStr);
        const role = user?.role;
        const modules = user?.access_modules || [];

        // super_admin adalah bos besar, selalu izinkan
        if (role !== "super_admin") {
          // Jika bukan super_admin dan tidak punya modul terkait, tendang ke /403
          if (!modules.includes(requiredModule)) {
            router.replace("/403"); // Mengarah ke halaman "Akses Ditolak"
            return;
          }
        }
      } catch {
        // Jika data JSON corrupt, anggap sebagai bahaya dan usir
        localStorage.clear();
        router.replace("/login");
        return;
      }
    }

    // 4. Jika semua tes lolos, persilakan tampilkan isi halaman
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthorized(true);

    // Dependency array: jika URL berubah, periksa lagi keamanan
  }, [pathname, requiredModule, router]);

  // Selama pengecekan (Authorized belum true), tampilkan layar tunggu (Loading state)
  // Ini menghindari isi halaman "bocor" sekian milidetik sebelum redirect
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"></div>
          <p className="text-emerald-500/50 text-sm font-medium animate-pulse">Memverifikasi Akses...</p>
        </div>
      </div>
    );
  }

  // Lolos sensor: tampilkan halamannya
  return <>{children}</>;
}
