"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, Handshake, Wrench, Trash2, FileText, Building2, FileUp, Menu, Gavel } from "lucide-react";
import { ModuleSwitcher } from "@/components/module-switcher";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from "@/components/RouteGuard";
import { cn } from "@/lib/utils";

const bmnMenus = [
  { title: "Dashboard", path: "/bmn", icon: LayoutDashboard, permission: "bmn.view" },
  { title: "Data Aset", path: "/bmn/assets", icon: Package, permission: "bmn.view" },
  { title: "Peminjaman", path: "/bmn/loans", icon: Handshake, permission: "bmn.view" },
  { title: "Pemeliharaan", path: "/bmn/maintenances", icon: Wrench, permission: "bmn.view" },
  { title: "Import Review", path: "/bmn/import-review", icon: FileUp, permission: "bmn.import.review" },
  { title: "Kandidat Rusak Berat", path: "/bmn/auction-candidates", icon: Gavel, permission: "bmn.auction.view" },
  { title: "Paket Lelang BMN", path: "/bmn/auction-batches", icon: FileText, permission: "bmn.auction.view" },
  { title: "Aset Dihapus", path: "/bmn/disposal", icon: Trash2, permission: "bmn.asset.dispose" },
  { title: "Laporan", path: "/bmn/reports", icon: FileText, permission: "bmn.document.history.view" },
];

export default function BmnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { hasPermission } = useRole();

  const visibleMenus = bmnMenus.filter(item => {
    return hasPermission(item.permission);
  });

  return (
    <RouteGuard requiredModule="bmn">
      {/* Tombol Floating Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed z-50 bottom-6 right-6 p-4 rounded-full bg-emerald-600 text-white shadow-2xl hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all duration-300"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative">
        {/* Layar Gelap (Backdrop) saat laci ditarik di layar HP */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-white dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-zinc-900 dark:text-white leading-none">BMN</h2>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.15em] mt-0.5">Barang Milik Negara</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
            <ModuleSwitcher />
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleMenus.map((menu) => {
              const Icon = menu.icon;
              const isActive = menu.path === "/bmn" ? pathname === "/bmn" : pathname.startsWith(menu.path);
              return (
                <Link
                  key={menu.path}
                  href={menu.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")} />
                  {menu.title}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight line-clamp-2">{user?.name || "User"}</p>
                <div className="mt-1">
                  <Badge variant="secondary" className="text-[10px]">{user?.role || "Pegawai"}</Badge>
                </div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
