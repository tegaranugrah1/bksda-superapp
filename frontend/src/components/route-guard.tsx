"use client";

import React, { useEffect, useState } from "react";
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
  
  // State tunggal untuk mengelola status otentikasi dan loading
  const [authState, setAuthState] = useState({
    isLoading: true, // Selalu mulai dari true untuk match dengan SSR Hydration
    isAuthenticated: false,
    hasModuleAccess: false,
  });

  useEffect(() => {
    // 1. Baca token dari LocalStorage secara langsung (Bypass BFCache Issues)
    const token = localStorage.getItem("bksda_token");
    const userStr = localStorage.getItem("bksda_user");

    if (!token || !userStr) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      let hasAccess = true;

      // 2. Cek Module Access Control
      if (requiredModule && user?.role !== "super_admin") {
        const modules = user?.access_modules || [];
        if (!modules.includes(requiredModule)) {
          hasAccess = false;
          router.replace("/403");
        }
      }

      // 3. Jika semua lolos, izinkan render komponen
      if (hasAccess) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAuthState({ isLoading: false, isAuthenticated: true, hasModuleAccess: true });
      }
    } catch {
      // Jika JSON corrupt
      localStorage.clear();
      router.replace("/login");
    }
  }, [requiredModule, router]);

  // Tampilkan loading screen jika masih mengecek (atau sedang proses redirect)
  if (authState.isLoading || !authState.isAuthenticated || !authState.hasModuleAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"></div>
          <p className="text-emerald-500/50 text-sm font-medium animate-pulse">Memverifikasi Akses...</p>
        </div>
      </div>
    );
  }

  // Lolos verifikasi
  return <>{children}</>;
}
