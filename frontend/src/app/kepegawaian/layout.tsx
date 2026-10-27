"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  UserPlus,
  Inbox,
  FileText,
  Menu,
  Calendar,
  LayoutDashboard,
  Settings,
  Archive,
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

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole: "user" | "admin" | "super_admin";
  group: "Ringkasan" | "Manajemen SDM" | "Layanan & Persuratan" | "Konfigurasi";
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { href: "/kepegawaian", label: "Dashboard", icon: LayoutDashboard, minRole: "user", group: "Ringkasan" },
  { href: "/kepegawaian/employees", label: "Daftar Pegawai", icon: Users, minRole: "user", group: "Manajemen SDM" },
  { href: "/kepegawaian/employees/create", label: "Tambah Pegawai", icon: UserPlus, minRole: "admin", group: "Manajemen SDM" },
  { href: "/kepegawaian/surat-tugas/inbox", label: "Inbox Surat Tugas", icon: Inbox, minRole: "admin", group: "Layanan & Persuratan" },
  { href: "/kepegawaian/surat-tugas/create", label: "Buat Surat Tugas", icon: FileText, minRole: "admin", group: "Layanan & Persuratan" },
  { href: "/kepegawaian/cuti", label: "Inbox Surat Cuti", icon: Calendar, minRole: "admin", group: "Layanan & Persuratan" },
  { href: "/kepegawaian/surat-masuk", label: "Arsip Surat Masuk", icon: Archive, minRole: "user", group: "Layanan & Persuratan" },
  { href: "/kepegawaian/settings", label: "Setting", icon: Settings, minRole: "super_admin", group: "Konfigurasi" },
];

const GROUP_ORDER: SidebarItem["group"][] = [
  "Ringkasan",
  "Manajemen SDM",
  "Layanan & Persuratan",
  "Konfigurasi",
];

export default function KepegawaianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { canWrite } = useRole();

  const visibleItems = SIDEBAR_ITEMS.filter((item) => {
    if (item.minRole === "user") return true;
    if (item.minRole === "admin") return canWrite;
    if (item.minRole === "super_admin") return user?.role === "super_admin";
    return false;
  });

  const isItemActive = (href: string) => {
    if (href === "/kepegawaian") return pathname === "/kepegawaian";
    if (href === "/kepegawaian/surat-tugas/create") {
      return (
        pathname === "/kepegawaian/surat-tugas/create" ||
        pathname.startsWith("/kepegawaian/surat-tugas/builder")
      );
    }
    if (href === "/kepegawaian/employees") {
      return (
        pathname === "/kepegawaian/employees" ||
        (pathname.startsWith("/kepegawaian/employees/") &&
          !pathname.startsWith("/kepegawaian/employees/create"))
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <RouteGuard requiredModule="kepegawaian">
      {/* Tombol Floating Mobile Hamburger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu Kepegawaian"
        className="md:hidden fixed z-50 bottom-6 right-6 p-3.5 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex h-screen bg-slate-50/70 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative overflow-hidden">
        {/* Layar Gelap (Backdrop) saat laci ditarik di layar HP */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-zinc-900 border-r border-slate-200/80 dark:border-zinc-800/80 transform transition-all duration-200 ease-in-out md:relative md:translate-x-0 ${
            isOpen ? "translate-x-0 w-72" : "-translate-x-full"
          } ${collapsed ? "md:w-20" : "md:w-72"}`}
        >
          {/* Header */}
          <div className={`border-b border-slate-200/80 dark:border-zinc-800/80 ${collapsed ? "p-3" : "p-4"}`}>
            <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
                  <Users className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                      Kepegawaian
                    </h2>
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5 truncate">
                      SDM &amp; Administrasi
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

          {/* Navigation Grouped */}
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
                            ? "bg-blue-50/90 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20 shadow-2xs"
                            : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-blue-600 dark:bg-blue-400" />
                        )}
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200"
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

          {/* Footer */}
          <div className="p-3.5 border-t border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/50">
            <div className={`flex items-center ${collapsed ? "justify-center mb-2" : "gap-3 mb-3"}`}>
              <div
                className="w-9 h-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs"
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

        <main className="flex-1 h-full overflow-y-auto bg-slate-50/70 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
