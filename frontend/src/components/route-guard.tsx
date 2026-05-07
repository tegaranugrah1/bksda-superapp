"use client";

import React from "react";
import { useRouter } from "next/navigation";

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

  // Karena komponen ini akan di-load secara dinamis dengan ssr: false,
  // kita bisa langsung membaca localStorage secara sinkron saat render!
  // Tidak perlu useEffect, tidak perlu state, tidak ada bug popstate!
  
  if (typeof window === "undefined") {
    // Fallback aman jika dipanggil di server (meski ssr: false seharusnya mencegah ini)
    return null;
  }

  const token = localStorage.getItem("bksda_token");
  const userStr = localStorage.getItem("bksda_user");

  if (!token || !userStr) {
    // Gunakan setTimeout agar router.replace tidak dipanggil saat fase render React
    setTimeout(() => router.replace("/login"), 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"></div>
          <p className="text-emerald-500/50 text-sm font-medium animate-pulse">Mengalihkan ke Login...</p>
        </div>
      </div>
    );
  }

  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch {
    localStorage.clear();
    setTimeout(() => router.replace("/login"), 0);
    return null;
  }

  if (requiredModule && user?.role !== "super_admin") {
    const modules = user?.access_modules || [];
    if (!modules.includes(requiredModule)) {
      setTimeout(() => router.replace("/403"), 0);
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-900">
          <p className="text-red-500 text-sm animate-pulse">Akses Ditolak...</p>
        </div>
      );
    }
  }

  // Lolos verifikasi, langsung render secepat kilat!
  return <>{children}</>;
}
