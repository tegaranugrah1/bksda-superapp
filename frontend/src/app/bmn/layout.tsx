"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Handshake,
  Wrench,
  Trash2,
  FileText,
  Building2,
  FileUp,
  Menu,
  Gavel,
  Settings,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ModuleSwitcher } from "@/components/module-switcher";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from "@/components/RouteGuard";
import { motion, AnimatePresence } from "framer-motion";

type BmnSidebarGroup =
  | "Ringkasan"
  | "Inventaris & Transaksi"
  | "Penghapusan & Lelang"
  | "Dokumen & Pengaturan";

type BmnSidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
  group: BmnSidebarGroup;
};

const BMN_SIDEBAR_ITEMS: BmnSidebarItem[] = [
  // 1. Ringkasan
  { href: "/bmn", label: "Dashboard", icon: LayoutDashboard, permission: "bmn.view", group: "Ringkasan" },

  // 2. Inventaris & Transaksi
  { href: "/bmn/assets", label: "Data Aset", icon: Package, permission: "bmn.view", group: "Inventaris & Transaksi" },
  { href: "/bmn/loans", label: "Peminjaman", icon: Handshake, permission: "bmn.view", group: "Inventaris & Transaksi" },
  { href: "/bmn/maintenances", label: "Pemeliharaan", icon: Wrench, permission: "bmn.view", group: "Inventaris & Transaksi" },
  { href: "/bmn/import-review", label: "Import Review", icon: FileUp, permission: "bmn.import.review", group: "Inventaris & Transaksi" },

  // 3. Penghapusan & Lelang
  { href: "/bmn/auction-candidates", label: "Kandidat Rusak Berat", icon: Gavel, permission: "bmn.auction.view", group: "Penghapusan & Lelang" },
  { href: "/bmn/auction-batches", label: "Paket Lelang BMN", icon: Layers, permission: "bmn.auction.view", group: "Penghapusan & Lelang" },
  { href: "/bmn/disposal", label: "Aset Dihapus", icon: Trash2, permission: "bmn.asset.dispose", group: "Penghapusan & Lelang" },

  // 4. Dokumen & Pengaturan
  { href: "/bmn/reports", label: "Dokumen & Laporan", icon: FileText, permission: "bmn.document.history.view", group: "Dokumen & Pengaturan" },
  { href: "/bmn/settings", label: "Pengaturan Master", icon: Settings, permission: "bmn.view", group: "Dokumen & Pengaturan" },
];

const GROUP_ORDER: BmnSidebarGroup[] = [
  "Ringkasan",
  "Inventaris & Transaksi",
  "Penghapusan & Lelang",
  "Dokumen & Pengaturan",
];

export default function BmnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { hasPermission } = useRole();

  const visibleItems = BMN_SIDEBAR_ITEMS.filter((item) => {
    return hasPermission(item.permission);
  });

  const isItemActive = (href: string) => {
    if (href === "/bmn") return pathname === "/bmn";
    if (href === "/bmn/assets") {
      return (
        pathname === "/bmn/assets" ||
        (pathname.startsWith("/bmn/assets/") && !pathname.startsWith("/bmn/assets/create"))
      );
    }
    if (href === "/bmn/auction-batches") {
      return pathname.startsWith("/bmn/auction-batches");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <RouteGuard requiredModule="bmn">
      <div className="flex h-screen bg-slate-50/70 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative overflow-hidden">
        {/* Backdrop saat laci ditarik di layar HP */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          />
        )}

        {/* Sidebar Navigasi Responsif */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-zinc-900 border-r border-slate-200/80 dark:border-zinc-800/80 transform transition-all duration-200 ease-in-out md:relative md:translate-x-0 ${
            isOpen ? "translate-x-0 w-72" : "-translate-x-full"
          } ${collapsed ? "md:w-20" : "md:w-72"}`}
        >
          {/* Header Sidebar */}
          <div className={`border-b border-slate-200/80 dark:border-zinc-800/80 ${collapsed ? "p-3" : "p-4"}`}>
            <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
                  <Building2 className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                      BMN
                    </h2>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5 truncate">
                      Barang Milik Negara
                    </p>
                  </div>
                )}
              </div>

              {!collapsed && (
                <div className="flex items-center gap-1 shrink-0">
                  <ThemeToggle />
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    title="Ciutkan Sidebar"
                    className="hidden md:flex p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {collapsed ? (
              <div className="mt-2 hidden md:flex flex-col items-center gap-1.5">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  title="Perluas Sidebar"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="mt-3.5">
                <ModuleSwitcher />
              </div>
            )}
          </div>

          {/* Navigasi Terkelompok */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {GROUP_ORDER.map((groupName) => {
              const groupItems = visibleItems.filter((i) => i.group === groupName);
              if (groupItems.length === 0) return null;

              return (
                <div key={groupName} className="space-y-1">
                  {!collapsed && (
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                      {groupName}
                    </p>
                  )}
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`group relative flex items-center ${
                          collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-3.5 py-2.5"
                        } rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                          isActive
                            ? "text-emerald-800 dark:text-emerald-300 font-bold"
                            : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="activeBmnNavIndicator"
                            className="absolute inset-0 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl shadow-2xs"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors relative z-10 ${
                            isActive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                          }`}
                        />
                        {!collapsed && <span className="truncate relative z-10 flex-1">{item.label}</span>}
                        {!collapsed && isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 relative z-10" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Footer User Profile */}
          <div className="p-3.5 border-t border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/50">
            <div className={`flex items-center ${collapsed ? "justify-center mb-2" : "gap-3 mb-3"}`}>
              <div
                className="w-9 h-9 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs"
                title={user?.name || user?.nama_lengkap || "User"}
              >
                {(user?.name || user?.nama_lengkap || "U").charAt(0)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {user?.name || user?.nama_lengkap || "User"}
                  </p>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-bold uppercase">
                      {user?.role || "Pegawai"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            {!collapsed && <LogoutButton />}
          </div>
        </aside>

        {/* Area Utama Konten */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header Mobile Bersih (Pengganti FAB Melayang yang Menabrak Pagination) */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800/80 z-20 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white leading-none">BMN</span>
                <span className="text-[9px] block font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Katalog &amp; Aset
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle Menu BMN"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-slate-50/70 dark:bg-zinc-950">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="min-h-full w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
