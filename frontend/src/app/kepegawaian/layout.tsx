"use client";

import { useState, useEffect, useRef, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Users,
  UserPlus,
  Inbox,
  Menu,
  Calendar,
  LayoutDashboard,
  Settings,
  Archive,
  UtensilsCrossed,
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
import "./kepegawaian.css";

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
  { href: "/kepegawaian/cuti", label: "Inbox Surat Cuti", icon: Calendar, minRole: "admin", group: "Layanan & Persuratan" },
  { href: "/kepegawaian/uang-makan", label: "Hitung Uang Makan", icon: UtensilsCrossed, minRole: "admin", group: "Layanan & Persuratan" },
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
  const reducedMotion = useReducedMotion();
  const indicatorId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [isOpen]);
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
    if (href === "/kepegawaian/surat-tugas/inbox") {
      return (
        pathname === "/kepegawaian/surat-tugas/inbox" ||
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
      <div data-module="kepegawaian" className="kpg-shell">
      {/* Tombol Floating Mobile Hamburger */}
      <button
        ref={menuButton}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu Kepegawaian"
        aria-expanded={isOpen}
        aria-controls="kepegawaian-sidebar"
        className="md:hidden fixed z-50 bottom-6 right-6 p-3.5 rounded-2xl bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-xl hover:bg-[var(--ds-accent-hover)] transition-colors cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex h-screen bg-[var(--ds-surface)] text-[var(--ds-fg)] relative overflow-hidden">
        {/* Layar Gelap (Backdrop) saat laci ditarik di layar HP */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-[var(--ds-surface-muted)] backdrop-blur-xs   "
          />
        )}

        <aside
          id="kepegawaian-sidebar"
          data-open={isOpen}
          className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[var(--ds-surface)]  border-r border-[var(--ds-border-subtle)]  transform md:relative md:translate-x-0 ${
            isOpen ? "translate-x-0 w-72" : "-translate-x-full"
          } ${collapsed ? "md:w-20" : "md:w-64 xl:w-72"}`}
        >
          {/* Header */}
          <div className={`border-b border-[var(--ds-border-subtle)]  ${collapsed ? "p-3" : "p-4"}`}>
            <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--ds-accent-solid)] flex items-center justify-center text-[var(--ds-accent-on-solid)] shadow-sm">
                  <Users className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <h2 className="font-bold text-base text-[var(--ds-fg)] leading-tight truncate">
                      Kepegawaian
                    </h2>
                    <p className="text-xs font-medium text-[var(--ds-accent-fg)] leading-snug mt-0.5">
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
                    className="hidden md:flex p-2 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
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
                  className="p-2 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
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
                    <p className="px-3 pb-1 text-xs font-bold uppercase tracking-widest text-[var(--ds-fg-muted)]">
                      {groupName}
                    </p>
                  )}
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.href);

                    return (
                      <motion.div
                        key={item.href}
                        whileHover={reducedMotion ? undefined : { x: collapsed ? 0 : 2 }}
                        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                        transition={{ duration: reducedMotion ? 0 : 0.12 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          title={collapsed ? item.label : undefined}
                          aria-label={item.label}
                          aria-current={isActive ? "page" : undefined}
                          className={`group relative flex items-center ${
                            collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-3.5 py-2.5"
                          } rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer select-none ${
                            isActive
                              ? "text-[var(--ds-accent-fg)]  font-bold"
                              : "text-[var(--ds-fg-muted)]  hover:bg-[var(--ds-surface-muted)]  hover:text-[var(--ds-fg)] "
                          }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId={`${indicatorId}-sidebar`}
                              className="absolute inset-0 bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-xl shadow-2xs"
                              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                            />
                          )}
                          {isActive && (
                            <motion.span
                              layoutId={`${indicatorId}-accent`}
                              className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[var(--ds-accent-solid)] z-20"
                              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                            />
                          )}
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors relative z-10 ${
                              isActive
                                ? "text-[var(--ds-accent-fg)] "
                                : "text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-fg)] "
                            }`}
                          />
                          {!collapsed && (
                            <span className="truncate relative z-10">{item.label}</span>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3.5 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]">
            <div className={`flex items-center ${collapsed ? "justify-center mb-2" : "gap-3 mb-3"}`}>
              <div
                className="w-9 h-9 shrink-0 rounded-xl bg-[var(--ds-accent-solid)] flex items-center justify-center text-[var(--ds-accent-on-solid)] font-bold text-xs shadow-xs"
                title={user?.name || user?.nama_lengkap || "User"}
              >
                {(user?.name || user?.nama_lengkap || "U").charAt(0)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--ds-fg)] leading-tight truncate">
                    {user?.name || user?.nama_lengkap || "User"}
                  </p>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 font-bold uppercase">
                      {user?.role || "Pegawai"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            {!collapsed && <LogoutButton />}
          </div>
        </aside>

        <main className="flex-1 h-full overflow-y-auto bg-[var(--ds-surface)] [scrollbar-gutter:stable]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : -4 }}
              transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
              className="w-full min-h-full"
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
