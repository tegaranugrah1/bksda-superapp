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
    // Jalankan pengecekan secara sinkron, namun bungkus pembaruan state
    // dalam setTimeout untuk mengeluarkan pembaruan dari Next.js popstate transition batch!
    const token = localStorage.getItem("bksda_token");
    const userStr = localStorage.getItem("bksda_user");

    if (!token || !userStr) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      let hasAccess = true;

      // Cek Module Access Control
      if (requiredModule && user?.role !== "super_admin") {
        const modules = user?.access_modules || [];
        if (!modules.includes(requiredModule)) {
          hasAccess = false;
          router.replace("/403");
        }
      }

      // Jika lolos, izinkan render komponen, tapi keluarkan dari Transition
      if (hasAccess) {
        setTimeout(() => {
          setAuthState({ isLoading: false, isAuthenticated: true, hasModuleAccess: true });
        }, 0);
      }
    } catch {
      localStorage.clear();
      router.replace("/login");
    }
  }, [requiredModule, router]);

  // Tampilkan loading screen jika masih mengecek
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
