"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { ModuleSwitcher } from "@/components/module-switcher";
import type { User } from "@/hooks/useAuth";

export function Topbar({ serverUser }: { serverUser?: User | null }) {
  const { user: clientUser } = useAuth();
  const user = clientUser || serverUser;

  const displayName = user?.nama_lengkap || user?.name || user?.username || "Admin SuperApp";
  const displayRole = user?.role || "Administrator";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200/50 bg-white/80 px-4 shadow-sm backdrop-blur-3xl transition-all duration-500 dark:border-zinc-800/50 dark:bg-zinc-950/80 dark:shadow-none md:h-20 md:px-8">
      <div className="flex items-center gap-4">
        <ModuleSwitcher />
      </div>

      <div className="flex items-center gap-4 md:gap-5">
        <ThemeToggle />

        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-sm font-bold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400 md:h-10 md:w-10">
            {initial}
          </div>
          <div className="hidden text-sm md:block">
            <p className="font-bold leading-none text-zinc-900 dark:text-zinc-100">
              {displayName}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {displayRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
