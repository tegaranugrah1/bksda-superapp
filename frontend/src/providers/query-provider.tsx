"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Best Practice Next.js 13+: Gunakan useState agar QueryClient 
  // hanya diinisialisasi SATU KALI per siklus hidup aplikasi.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dianggap fresh selama 60 detik. Dalam 60 detik ini, 
            // query yang sama tidak akan menembak server backend lagi.
            staleTime: 60 * 1000, 
            
            // Jika backend error (500), coba ulang 1 kali sebelum menyerah
            retry: 1, 
            
            // Mencegah auto-fetch ketika user Alt+Tab atau ganti tab browser
            refetchOnWindowFocus: false, 
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Tombol debugging ini HANYA akan muncul saat kita 'npm run dev' */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
