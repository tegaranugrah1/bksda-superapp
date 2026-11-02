"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Inbox,
  Send,
  Plus,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
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
    iconStyle:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    title: "Input Surat Masuk",
    description: "Register Agenda & Disposisi",
    href: "/surat/masuk/create",
    icon: Plus,
    iconStyle:
      "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  },
  {
    title: "Daftar Surat Keluar",
    description: "Pengagendaan Naskah Keluar",
    href: "/surat/keluar",
    icon: Send,
    iconStyle:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    title: "Input Surat Keluar",
    description: "Form Penomoran Surat Keluar",
    href: "/surat/keluar/create",
    icon: Plus,
    iconStyle:
      "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
];

export default function SuratHubPage() {
  const { data: hubData, isLoading } = useQuery({
    queryKey: ["surat-hub-summary"],
    queryFn: async () => {
      const [resMasuk, resKeluar] = await Promise.allSettled([
        api.get("/surat-masuk?per_page=5"),
        api.get("/surat-keluar?per_page=5"),
      ]);

      const masukRaw = resMasuk.status === "fulfilled" ? resMasuk.value.data : null;
      const keluarRaw = resKeluar.status === "fulfilled" ? resKeluar.value.data : null;

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

  return (
    <div className="w-full p-5 md:p-7 space-y-5 text-slate-900 dark:text-zinc-100 font-sans">
      {/* 1. Header Banner Bersih & Formal */}
      <HeaderBanner />

      {/* 2. Kartu Statistik Operasional (4 Cards) */}
      <BentoStatCards
        totalSuratMasuk={totalSuratMasuk}
        totalSuratKeluar={totalSuratKeluar}
      />

      {/* 3. Akses Pintas Modul Persuratan (4 Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Akses Pintas Modul Persuratan
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href + item.title} href={item.href}>
                <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-200 group hover:shadow-xs flex flex-col justify-between h-full min-h-24">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.iconStyle} group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs md:text-sm text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      {item.description}
                    </p>
                  </div>
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
      />
    </div>
  );
}
