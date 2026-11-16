"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Inbox,
  Send,
  Plus,
  Layers,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import {
  HeaderBanner,
  BentoStatCards,
  RecentSuratWidget,
  type SuratMasukItem,
  type SuratKeluarItem,
} from "./_components/SuratHubComponents";

const QUICK_LINKS = [
  {
    title: "Daftar Surat Masuk",
    description: "Penatausahaan & Disposisi",
    href: "/surat/masuk",
    icon: Inbox,
    iconStyle: "text-[var(--ds-accent-fg)]",
    minRole: "admin" as const,
  },
  {
    title: "Input Surat Masuk",
    description: "Register Agenda & Disposisi",
    href: "/surat/masuk/create",
    icon: Plus,
    iconStyle: "text-[var(--ds-accent-fg)]",
    minRole: "admin" as const,
  },
  {
    title: "Daftar Surat Keluar",
    description: "Pengagendaan Naskah Keluar",
    href: "/surat/keluar",
    icon: Send,
    iconStyle: "text-blue-700 dark:text-blue-300",
    minRole: "user" as const,
  },
  {
    title: "Input Surat Keluar",
    description: "Penomoran & Registrasi Manual",
    href: "/surat/keluar/create",
    icon: Plus,
    iconStyle: "text-blue-700 dark:text-blue-300",
    minRole: "user" as const,
  },
  {
    title: "Tata Naskah Dinas",
    description: "Generator 20 Format Permen 1/2025",
    href: "/surat/keluar/dinas",
    icon: FileText,
    iconStyle: "text-amber-700 dark:text-amber-300",
    minRole: "user" as const,
  },
];

export default function SuratHubPage() {
  const reducedMotion = useReducedMotion();
  const { canWrite, hasPermission } = useRole();
  const canCreate = canWrite || hasPermission("surat.create");

  const {
    data: hubData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["surat-hub-summary", canWrite ? "admin" : "user"],
    queryFn: async () => {
      const [resMasuk, resKeluar] = await Promise.all([
        canWrite ? api.get("/surat-masuk?per_page=5") : Promise.resolve({ data: { data: [], meta: { total: 0 } } }),
        api.get("/surat/surat-keluar?per_page=5").catch(() => api.get("/surat-keluar?per_page=5")),
      ]);

      const masukRaw = resMasuk.data;
      const keluarRaw = resKeluar.data;

      const masukItems: SuratMasukItem[] = (masukRaw?.data || masukRaw || []).map((d: any) => ({
        ...d,
        perihal: d.isi_ringkas || d.perihal || "-",
      }));
      const keluarItems: SuratKeluarItem[] = keluarRaw?.data || keluarRaw || [];

      const totalMasuk = masukRaw?.meta?.total ?? masukRaw?.total ?? masukItems.length;
      const totalKeluar = keluarRaw?.meta?.total ?? keluarRaw?.total ?? keluarItems.length;

      return {
        totalSuratMasuk: totalMasuk,
        totalSuratKeluar: totalKeluar,
        suratMasukList: masukItems.slice(0, 5),
        suratKeluarList: keluarItems.slice(0, 5),
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const totalSuratMasuk = hubData?.totalSuratMasuk ?? 0;
  const totalSuratKeluar = hubData?.totalSuratKeluar ?? 0;
  const suratMasukList = hubData?.suratMasukList ?? [];
  const suratKeluarList = hubData?.suratKeluarList ?? [];

  const visibleQuickLinks = QUICK_LINKS.filter((item) => item.minRole === "user" || canWrite);

  return (
    <div className="psr-ui psr-dashboard w-full p-4 md:p-6 space-y-6 text-[var(--ds-fg)] font-sans">
      {/* 1. Header Banner Bersih & Formal */}
      <HeaderBanner canCreate={canCreate} canManageMasuk={canWrite} />

      {/* 2. Kartu Statistik Operasional */}
      <BentoStatCards
        totalSuratMasuk={totalSuratMasuk}
        totalSuratKeluar={totalSuratKeluar}
        canManageMasuk={canWrite}
      />

      {/* 3. Akses Pintas Modul Persuratan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            Akses Pintas Modul Persuratan
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {visibleQuickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.href + item.title}
                whileHover={reducedMotion ? undefined : { y: -2.5 }}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="h-full"
              >
                <Link
                  href={item.href}
                  className="group relative overflow-hidden bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 p-4 rounded-3xl shadow-xs hover:border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)]/70 transition-colors duration-150 flex flex-col justify-between h-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`kpg-support-icon w-10 h-10 rounded-lg border flex items-center justify-center group-hover:scale-105 transition-transform duration-150 ${item.iconStyle}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-accent-fg)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--ds-fg)] group-hover:text-[var(--ds-accent-fg)] transition-colors leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[var(--ds-fg-muted)] mt-1 truncate">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4. Tabel Mini Interaktif 2 Kolom (Surat Masuk Terbaru + Surat Keluar Terbaru) */}
      <RecentSuratWidget
        suratMasukList={suratMasukList}
        suratKeluarList={suratKeluarList}
        canManageMasuk={canWrite}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
      />
    </div>
  );
}
