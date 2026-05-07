"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Jika tidak ada user setelah diparsing oleh useAuth
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (requiredModule) {
      const role = user?.role;
      const modules = user?.access_modules || [];

      if (role !== "super_admin" && !modules.includes(requiredModule)) {
        router.replace("/403");
      }
    }
  }, [isAuthenticated, user, requiredModule, router]);

  // Selama belum terautentikasi, tampilkan loading.
  // useSyncExternalStore di useAuth sudah otomatis handle SSR hydration.
  const isPendingModuleCheck = requiredModule && user?.role !== "super_admin" && !user?.access_modules?.includes(requiredModule);
  
  if (!isAuthenticated || isPendingModuleCheck) {
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
