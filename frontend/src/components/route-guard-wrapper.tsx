"use client";

import dynamic from "next/dynamic";
import React from "react";

// Wrapper ini diperlukan karena Next.js melarang penggunaan `ssr: false` 
// langsung di dalam Server Component (layout.tsx).
// Dengan ini, RouteGuard akan murni dieksekusi di Client-Side secara sinkronus.
export const RouteGuardWrapper = dynamic(
  () => import("./route-guard").then((mod) => mod.RouteGuard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"></div>
          <p className="text-emerald-500/50 text-sm font-medium animate-pulse">Memuat Modul...</p>
        </div>
      </div>
    ),
  }
);
