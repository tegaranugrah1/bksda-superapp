"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  Inbox,
  Send,
  Plus,
  Menu,
  FileText,
  Settings2,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { ModuleSwitcher } from "@/components/module-switcher";
import { RouteGuard } from "@/components/RouteGuard";

type SuratSidebarGroup =
  | "Ringkasan"
  | "Penatausahaan Surat"
  | "Tata Naskah & Laporan"
  | "Pengaturan & Konfigurasi";

type SuratSidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
  group: SuratSidebarGroup;
};

const SURAT_SIDEBAR_ITEMS: SuratSidebarItem[] = [
  // 1. Ringkasan
  { href: "/surat", label: "Dashboard", icon: Mail, permission: "surat.view", group: "Ringkasan" },

  // 2. Penatausahaan Surat
  { href: "/surat/masuk", label: "Agenda Surat Masuk", icon: Inbox, permission: "surat.view", group: "Penatausahaan Surat" },
  { href: "/surat/masuk/create", label: "Input Agenda Masuk", icon: Plus, permission: "surat.create", group: "Penatausahaan Surat" },
  { href: "/surat/keluar", label: "Agenda Surat Keluar", icon: Send, permission: "surat.view", group: "Penatausahaan Surat" },
  { href: "/surat/keluar/create", label: "Input Agenda Keluar", icon: Plus, permission: "surat.create", group: "Penatausahaan Surat" },

  // 3. Tata Naskah & Laporan
  { href: "/surat/keluar/dinas", label: "Tata Naskah Dinas", icon: FileText, permission: "surat.create", group: "Tata Naskah & Laporan" },
  { href: "/surat/laporan", label: "Rekapitulasi & Laporan", icon: Layers, permission: "surat.view", group: "Tata Naskah & Laporan" },

  // 4. Pengaturan & Konfigurasi
  { href: "/surat/settings", label: "Pengaturan Template", icon: Settings2, permission: "surat.manage", group: "Pengaturan & Konfigurasi" },
];

const GROUP_ORDER: SuratSidebarGroup[] = [
  "Ringkasan",
  "Penatausahaan Surat",
  "Tata Naskah & Laporan",
  "Pengaturan & Konfigurasi",
];

export default function SuratLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { hasPermission, canWrite } = useRole();

  const visibleItems = SURAT_SIDEBAR_ITEMS.filter((item) => {
    if (item.permission === "surat.view") return true;
    if (item.permission === "surat.create") return canWrite || hasPermission("surat.create");
    if (item.permission === "surat.manage") return user?.role === "super_admin" || hasPermission("surat.manage");
    return true;
  });

  const isItemActive = (href: string) => {
    if (href === "/surat") return pathname === "/surat";
    if (href === "/surat/masuk") {
      return (
        pathname === "/surat/masuk" ||
        (pathname.startsWith("/surat/masuk/") && !pathname.startsWith("/surat/masuk/create"))
      );
    }
    if (href === "/surat/keluar") {
      return (
        pathname === "/surat/keluar" ||
        (pathname.startsWith("/surat/keluar/") &&
          !pathname.startsWith("/surat/keluar/create") &&
          !pathname.startsWith("/surat/keluar/dinas"))
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <RouteGuard requiredModule="surat">
      <div className="flex h-screen bg-slate-50/70 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative overflow-hidden">
        {/* Backdrop saat laci ditarik di layar HP */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
          />
        )}

        {/* Sidebar Navigasi Utama */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-zinc-900 border-r border-slate-200/80 dark:border-zinc-800/80 transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
            isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          } ${collapsed ? "md:w-20" : "md:w-72"}`}
        >
          {/* Header Sidebar */}
          <div className="p-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
                  <Mail className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <h2 className="font-bold text-base text-slate-900 dark:text-white truncate">
                      Persuratan
                    </h2>
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest truncate">
                      Surat & Disposisi
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!collapsed && <ThemeToggle />}
                {/* Tombol ciut/bentang desktop */}
                <button
                  type="button"
                  onClick={() => setCollapsed(!collapsed)}
                  title={collapsed ? "Bentangkan Sidebar" : "Ciutkan Sidebar"}
                  className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {collapsed ? (
                    <PanelLeftOpen className="w-4 h-4" />
                  ) : (
                    <PanelLeftClose className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {!collapsed && <ModuleSwitcher />}
          </div>

          {/* Navigasi Menu Dikelompokkan Semantik */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {GROUP_ORDER.map((group) => {
              const groupItems = visibleItems.filter((i) => i.group === group);
              if (groupItems.length === 0) return null;

              return (
                <div key={group} className="space-y-1">
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                      {group}
                    </p>
                  )}
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          collapsed ? "justify-center" : ""
                        } ${
                          active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold"
                            : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-100"
                        }`}
                      >
                        {/* Aksen garis vertikal emerald aktif */}
                        {active && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-emerald-600 dark:bg-emerald-400" />
                        )}
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                            active
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-500 dark:text-zinc-400"
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Footer Profil Pengguna & Keluar */}
          <div className="p-3 border-t border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50">
            {!collapsed ? (
              <div>
                <div className="flex items-center gap-3 mb-2.5 px-1">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user?.name || user?.nama_lengkap || "User"}
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 mt-0.5 capitalize bg-slate-200/60 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                    >
                      {user?.role || "Pegawai"}
                    </Badge>
                  </div>
                </div>
                <LogoutButton />
              </div>
            ) : (
              <div className="flex justify-center">
                <LogoutButton />
              </div>
            )}
          </div>
        </aside>

        {/* Konten Utama */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Top Bar (Tanpa FAB yang mengganggu) */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800/80 z-30">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Buka Menu Persuratan"
              className="p-2 rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Mail className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Persuratan
              </span>
            </div>
            <ThemeToggle />
          </header>

          {/* Viewport Konten Dinamis */}
          <main className="flex-1 overflow-y-auto bg-slate-50/70 dark:bg-zinc-950">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
