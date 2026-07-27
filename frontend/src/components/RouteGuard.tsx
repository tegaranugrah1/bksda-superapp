"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// Map route paths to module names
const MODULE_ROUTES: Record<string, string> = {
  "/bmn": "bmn",
  "/inventory": "inventory",
  "/kepegawaian": "kepegawaian",
  "/dereporting": "dereporting",
  "/cms": "cms",
  "/surat": "surat",
};

interface RouteGuardProps {
  children: React.ReactNode;
  /** Optional: Force a specific module check instead of using current route */
  requiredModule?: string;
}

type AccessStatus = "loading" | "allowed" | "denied";

export function RouteGuard({ children, requiredModule }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine access status synchronously using useMemo
  const accessStatus = useMemo((): AccessStatus => {
    if (!mounted) {
      return "loading";
    }

    // Not authenticated yet
    if (!isAuthenticated || !user) {
      return "loading";
    }

    // Super admin bypasses all access checks
    if (user?.role === "super_admin") {
      return "allowed";
    }

    // Determine which module to check
    const moduleToCheck = requiredModule || getModuleFromPath(pathname);

    if (!moduleToCheck) {
      // No module mapping for this path - allow access
      return "allowed";
    }

    // Check if user has access to this module
    const userModules = user?.access_modules || [];
    if (!userModules.includes(moduleToCheck)) {
      return "denied";
    }

    return "allowed";
  }, [mounted, user, isAuthenticated, pathname, requiredModule]);

  // Handle redirect for unauthenticated or denied access
  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated && !user) {
      router.replace("/login");
      return;
    }

    if (accessStatus === "denied") {
      router.replace("/portal?unauthorized=1");
    }
  }, [mounted, accessStatus, isAuthenticated, user, router]);

  // Show loading spinner while checking auth
  if (accessStatus === "loading" || accessStatus === "denied") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Memeriksa akses...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Extract module name from pathname
 * e.g., "/bmn/assets" → "bmn"
 */
function getModuleFromPath(pathname: string): string | null {
  // Remove trailing slash and get first segment
  const cleanPath = pathname.replace(/\/$/, "");
  const segment = cleanPath.split("/")[1] || "";

  return MODULE_ROUTES[`/${segment}`] || null;
}
