"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [totalSuratMasuk, setTotalSuratMasuk] = useState<number>(0);
  const [totalSuratKeluar, setTotalSuratKeluar] = useState<number>(0);
  const [suratMasukList, setSuratMasukList] = useState<SuratMasukItem[]>([]);
  const [suratKeluarList, setSuratKeluarList] = useState<SuratKeluarItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [resMasuk, resKeluar] = await Promise.allSettled([
          api.get("/surat-masuk?per_page=5"),
          api.get("/surat-keluar?per_page=5"),
        ]);

        if (resMasuk.status === "fulfilled") {
          const apiRes = resMasuk.value.data;
          const apiData = apiRes?.data || apiRes || [];
          const totalMasuk = apiRes?.meta?.total ?? apiRes?.total ?? (Array.isArray(apiData) ? apiData.length : 0);

          if (Array.isArray(apiData)) {
            let localMasuk: SuratMasukItem[] = [];
            try {
              const saved = localStorage.getItem("bksda_saved_surat_masuk");
              if (saved) localMasuk = JSON.parse(saved) || [];
            } catch {}

            const map = new Map<string, SuratMasukItem>();
            localMasuk.forEach((item) => {
              if (item.no_agenda) map.set(String(item.no_agenda), item);
            });
            apiData.forEach((d: any) => {
              map.set(String(d.no_agenda || d.id), {
                ...d,
                perihal: d.isi_ringkas || d.perihal || "",
              });
            });

            const list = Array.from(map.values()).sort(
              (a, b) => (Number(b.no_agenda) || Number(b.id) || 0) - (Number(a.no_agenda) || Number(a.id) || 0)
            );
            setTotalSuratMasuk(Math.max(totalMasuk, list.length));
            setSuratMasukList(list.slice(0, 5));
          }
        }

        if (resKeluar.status === "fulfilled") {
          const apiRes = resKeluar.value.data;
          const keluarData = apiRes?.data || apiRes || [];
          const totalKeluar = apiRes?.meta?.total ?? apiRes?.total ?? (Array.isArray(keluarData) ? keluarData.length : 0);

          if (Array.isArray(keluarData)) {
            setTotalSuratKeluar(totalKeluar);
            setSuratKeluarList(keluarData.slice(0, 5));
          }
        }
      } catch (err) {
        console.error("Gagal memuat ringkasan surat:", err);
      }
    }

    loadData();
  }, []);

  return (
    <div className="w-full p-4 md:p-6 space-y-6 text-zinc-900 dark:text-zinc-100 font-sans">
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
                <div className="relative overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-200 group hover:shadow-md flex flex-col justify-between h-full min-h-24">
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
