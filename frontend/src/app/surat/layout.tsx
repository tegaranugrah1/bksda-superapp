"use client";

import { useState, useEffect, useRef, useId } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
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
import "../surat-tugas/surat-tugas.css";
import "../kepegawaian/kepegawaian.css";

type SuratSidebarGroup =
  | "Ringkasan"
  | "Penatausahaan Surat"
  | "Tata Naskah & Laporan"
  | "Pengaturan & Konfigurasi";

type SuratSidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole: "user" | "admin" | "super_admin";
  group: SuratSidebarGroup;
};

const SURAT_SIDEBAR_ITEMS: SuratSidebarItem[] = [
  // 1. Ringkasan
  { href: "/surat", label: "Dashboard", icon: Mail, minRole: "user", group: "Ringkasan" },

  // 2. Penatausahaan Surat
  { href: "/surat/masuk", label: "Agenda Surat Masuk", icon: Inbox, minRole: "admin", group: "Penatausahaan Surat" },
  { href: "/surat/masuk/create", label: "Input Surat Masuk & Disposisi", icon: Plus, minRole: "admin", group: "Penatausahaan Surat" },
  { href: "/surat/keluar", label: "Agenda Surat Keluar", icon: Send, minRole: "user", group: "Penatausahaan Surat" },
  { href: "/surat/keluar/create", label: "Input Surat Keluar", icon: Plus, minRole: "user", group: "Penatausahaan Surat" },

  // 3. Tata Naskah & Laporan
  { href: "/surat/keluar/dinas", label: "Tata Naskah Dinas", icon: FileText, minRole: "user", group: "Tata Naskah & Laporan" },
  { href: "/surat/laporan", label: "Rekapitulasi & Laporan", icon: Layers, minRole: "admin", group: "Tata Naskah & Laporan" },

  // 4. Pengaturan & Konfigurasi
  { href: "/surat/settings", label: "Pengaturan Template", icon: Settings2, minRole: "super_admin", group: "Pengaturan & Konfigurasi" },
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

  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission, canWrite, isSuperAdmin } = useRole();

  const isRouteForbidden =
    (pathname.startsWith("/surat/settings") && !isSuperAdmin && !hasPermission("surat.manage")) ||
    (!canWrite && (pathname.startsWith("/surat/masuk") || pathname.startsWith("/surat/laporan")));

  useEffect(() => {
    if (user && isRouteForbidden) {
      router.replace("/surat");
    }
  }, [user, isRouteForbidden, router]);

  const visibleItems = SURAT_SIDEBAR_ITEMS.filter((item) => {
    if (item.minRole === "user") return true;
    if (item.minRole === "admin") return canWrite;
    if (item.minRole === "super_admin") return isSuperAdmin || hasPermission("surat.manage");
    return false;
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
      <MotionConfig reducedMotion="user">
        <div
          data-module="persuratan"
          className="psr-shell flex h-screen bg-[var(--ds-canvas)] text-[var(--ds-fg)] relative overflow-hidden"
        >
          {/* Backdrop saat laci ditarik di layar HP */}
          {isOpen && (
            <div
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
            />
          )}

          {/* Sidebar Navigasi Utama */}
          <aside
            id="persuratan-sidebar"
            data-open={isOpen}
            onKeyDown={(event) => {
              if (event.key === "Escape" && isOpen) {
                setIsOpen(false);
                menuButton.current?.focus();
              }
            }}
            className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[var(--ds-surface)] border-r border-[var(--ds-border-subtle)] transform transition-[transform,width,visibility] duration-150 ease-out md:relative md:translate-x-0 ${
              isOpen ? "translate-x-0 w-72" : "-translate-x-full invisible md:visible"
            } ${collapsed ? "md:w-20" : "md:w-64 xl:w-72"}`}
          >
            {/* Header Sidebar */}
            <div className={`border-b border-[var(--ds-border-subtle)] ${collapsed ? "p-3" : "p-4"}`}>
              <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--ds-accent-solid)] flex items-center justify-center text-[var(--ds-accent-on-solid)]">
                    <Mail className="w-5 h-5" />
                  </div>
                  {!collapsed && (
                    <div className="min-w-0">
                      <h2 className="font-bold text-base text-[var(--ds-fg)] leading-tight truncate">
                        Persuratan
                      </h2>
                      <p className="text-xs font-bold text-[var(--ds-accent-fg)] uppercase tracking-widest mt-0.5 truncate">
                        Surat &amp; Disposisi
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
                      className="hidden md:flex p-2 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
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
                    className="p-2 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
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

            {/* Navigasi Menu Dikelompokkan Semantik */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
              {GROUP_ORDER.map((groupName) => {
                const groupItems = visibleItems.filter((i) => i.group === groupName);
                if (groupItems.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-1">
                    {!collapsed && (
                      <p className="px-3 pb-1 text-xs font-bold uppercase tracking-widest text-[var(--ds-fg-secondary)]">
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
                          aria-label={item.label}
                          aria-current={isActive ? "page" : undefined}
                          className={`group relative flex items-center ${
                            collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-3.5 py-2.5"
                          } rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer select-none ${
                            isActive
                              ? "text-[var(--ds-accent-fg)] font-bold"
                              : "text-[var(--ds-fg-secondary)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-fg)]"
                          }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId={`${indicatorId}-sidebar`}
                              className="absolute inset-0 bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-xl shadow-2xs"
                              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 35 }}
                            />
                          )}
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors relative z-10 ${
                              isActive
                                ? "text-[var(--ds-accent-fg)]"
                                : "text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-fg-secondary)]"
                            }`}
                          />
                          {!collapsed && (
                            <span className="truncate relative z-10 flex-1">{item.label}</span>
                          )}
                          {!collapsed && isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-accent-solid)] shrink-0 relative z-10" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            {/* Footer Profil Pengguna & Keluar */}
            <div className="p-3.5 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
              <div className={`flex items-center ${collapsed ? "justify-center mb-2" : "gap-3 mb-3"}`}>
                <div
                  className="w-9 h-9 shrink-0 rounded-xl bg-[var(--ds-accent-solid)] flex items-center justify-center text-[var(--ds-accent-on-solid)] font-bold text-xs"
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

          {/* Konten Utama */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Mobile Top Bar */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--ds-surface)] border-b border-[var(--ds-border-subtle)] z-20 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-solid)] flex items-center justify-center text-[var(--ds-accent-on-solid)]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[var(--ds-fg)] leading-none">Persuratan</span>
                  <span className="text-xs block font-bold text-[var(--ds-accent-fg)] uppercase tracking-wider">
                    Surat &amp; Disposisi
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  ref={menuButton}
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  aria-label="Toggle Menu Persuratan"
                  aria-expanded={isOpen}
                  aria-controls="persuratan-sidebar"
                  className="p-2 rounded-xl bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-accent-soft)] text-[var(--ds-fg-secondary)] transition-colors cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Viewport Konten Dinamis */}
            <main className="flex-1 overflow-y-auto bg-[var(--ds-canvas)] [scrollbar-gutter:stable]">
              <motion.div
                key={pathname}
                initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
                className="w-full min-h-full"
              >
                {isRouteForbidden ? null : children}
              </motion.div>
            </main>
          </div>
        </div>
      </MotionConfig>
    </RouteGuard>
  );
}
