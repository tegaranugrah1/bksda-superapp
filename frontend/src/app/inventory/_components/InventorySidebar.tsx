"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackageSearch,
  Building2,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Menu,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { ModuleSwitcher } from "@/components/module-switcher";

const menuItems = [
  { title: "Dashboard", href: "/inventory", icon: LayoutDashboard, minRole: "user" as const },
  { title: "Katalog Barang", href: "/inventory/items", icon: PackageSearch, minRole: "user" as const },
  { title: "Jaringan Kantor", href: "/inventory/offices", icon: Building2, minRole: "admin" as const },
  { title: "Stok Masuk", href: "/inventory/stock-in", icon: ArrowDownToLine, minRole: "admin" as const },
  { title: "Distribusi Keluar", href: "/inventory/stock-out", icon: ArrowUpFromLine, minRole: "admin" as const },
  { title: "Riwayat Mutasi", href: "/inventory/transactions", icon: History, minRole: "user" as const },
];

export function InventorySidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { canWrite } = useRole();

  const visibleMenus = menuItems.filter(item => {
    if (item.minRole === "user") return true;
    if (item.minRole === "admin") return canWrite;
    return false;
  });

  return (
    <>
      {/* Tombol Floating Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed z-50 bottom-6 right-6 p-4 rounded-full bg-emerald-600 text-white shadow-2xl hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all duration-300"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Layar Gelap (Backdrop) saat laci ditarik di layar HP */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <PackageSearch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white">
                Inventory
              </h2>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Inventaris & Stok
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <ModuleSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleMenus.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${isActive ? "text-emerald-500" : "text-zinc-500"}`}
              />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight line-clamp-2">
              {user?.name || user?.nama_lengkap || "User"}
            </p>
            <div className="mt-1">
              <Badge variant="secondary" className="text-[10px]">
                {user?.role || "Pegawai"}
              </Badge>
            </div>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
    </>
  );
}
