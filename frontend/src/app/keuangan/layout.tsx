"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, FileText, LayoutDashboard, Menu, PlusCircle, Users } from "lucide-react";
import { ModuleSwitcher } from "@/components/module-switcher";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from "@/components/RouteGuard";
import { cn } from "@/lib/utils";

const MENUS = [
  { href: "/keuangan", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/keuangan/spj", label: "SPJ", icon: FileText, adminOnly: false },
  { href: "/keuangan/spj/create", label: "Buat SPJ", icon: PlusCircle, adminOnly: true },
];

export default function KeuanganLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { canWrite } = useRole();

  const visibleMenus = MENUS.filter((menu) => !menu.adminOnly || canWrite);

  return (
    <RouteGuard requiredModule="keuangan">
      <button
        onClick={() => setIsOpen((value) => !value)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-amber-600 p-4 text-white shadow-2xl transition hover:bg-amber-500 md:hidden"
        aria-label="Buka menu Keuangan"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex min-h-screen overflow-hidden bg-[#fbfaf7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {isOpen && <div className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r print:hidden border-slate-200 bg-white transition-transform md:relative md:translate-x-0 dark:border-slate-800 dark:bg-slate-900",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}>
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold leading-tight">Keuangan</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">SPJ & Pembayaran</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
            <ModuleSwitcher />
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {visibleMenus.map((menu) => {
              const Icon = menu.icon;
              const active = menu.href === "/keuangan"
                ? pathname === menu.href
                : pathname === menu.href || pathname.startsWith(`${menu.href}/`);
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-amber-50 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {menu.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-sm font-bold text-white">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold">{user?.name || user?.nama_lengkap || "User"}</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">{user?.role || "Pegawai"}</Badge>
              </div>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </RouteGuard>
  );
}
