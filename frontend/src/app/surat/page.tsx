"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
    iconStyle: "text-emerald-700 dark:text-emerald-300",
    writeOnly: false,
  },
  {
    title: "Input Surat Masuk",
    description: "Register Agenda & Disposisi",
    href: "/surat/masuk/create",
    icon: Plus,
    iconStyle: "text-indigo-700 dark:text-indigo-300",
    writeOnly: true,
  },
  {
    title: "Daftar Surat Keluar",
    description: "Pengagendaan Naskah Keluar",
    href: "/surat/keluar",
    icon: Send,
    iconStyle: "text-blue-700 dark:text-blue-300",
    writeOnly: false,
  },
  {
    title: "Tata Naskah Dinas",
    description: "Generator 20 Format Permen 1/2025",
    href: "/surat/keluar/dinas",
    icon: FileText,
    iconStyle: "text-amber-700 dark:text-amber-300",
    writeOnly: true,
  },
];

export default function SuratHubPage() {
  const { canWrite, hasPermission } = useRole();
  const canCreate = canWrite || hasPermission("surat.create");

  const {
    data: hubData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["surat-hub-summary"],
    queryFn: async () => {
      const [resMasuk, resKeluar] = await Promise.all([
        api.get("/surat-masuk?per_page=5"),
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

  const visibleQuickLinks = QUICK_LINKS.filter((item) => !item.writeOnly || canCreate);

  return (
    <div className="psr-ui psr-dashboard w-full p-4 md:p-5 space-y-4 text-[var(--ds-fg)] font-sans">
      {/* 1. Header Banner Bersih & Formal */}
      <HeaderBanner canCreate={canCreate} />

      {/* 2. Kartu Statistik Operasional (4 Cards) */}
      <BentoStatCards
        totalSuratMasuk={totalSuratMasuk}
        totalSuratKeluar={totalSuratKeluar}
      />

      {/* 3. Akses Pintas Modul Persuratan */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            Akses Pintas Modul Persuratan
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {visibleQuickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href + item.title}
                href={item.href}
                className="group relative overflow-hidden bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] p-3.5 rounded-2xl hover:border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)] transition-colors duration-150 flex flex-col justify-between h-full min-h-22"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`kpg-support-icon w-9 h-9 rounded-xl border flex items-center justify-center ${item.iconStyle}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-accent-fg)] transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-xs md:text-sm text-[var(--ds-fg)] group-hover:text-[var(--ds-accent-fg)] transition-colors leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5 truncate">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Tabel Mini Interaktif 2 Kolom (Surat Masuk Terbaru + Surat Keluar Terbaru) */}
      <RecentSuratWidget
        suratMasukList={suratMasukList}
        suratKeluarList={suratKeluarList}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
      />
    </div>
  );
}
