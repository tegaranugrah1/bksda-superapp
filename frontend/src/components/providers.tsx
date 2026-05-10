"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { useEffect, useState } from "react";
import { AuthSync } from "@/components/AuthSync";

export function Providers({ children }: { children: React.ReactNode }) {
  const [restoreKey, setRestoreKey] = useState(0);
  // Gunakan useState agar QueryClient tidak dibuat ulang setiap kali render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    const restoreActiveState = () => {
      document.body.style.pointerEvents = "";
      window.dispatchEvent(new Event("auth-change"));
      queryClient.invalidateQueries({ refetchType: "active" });
      queryClient.refetchQueries({ type: "active" });
      setRestoreKey((key) => key + 1);
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) restoreActiveState();
    };

    const handlePopState = () => {
      window.setTimeout(restoreActiveState, 0);
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ConfirmDialogProvider>
          <AuthSync />
          <div key={restoreKey} className="contents">
            {children}
          </div>
        </ConfirmDialogProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
