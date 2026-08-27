"use client";

import { useEffect, useState, useMemo } from "react";
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
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    iconStyle:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    title: "Input Surat Masuk",
    description: "Register Agenda & Disposisi",
    href: "/surat/masuk/create",
    icon: Plus,
    gradient: "from-teal-500/20 via-teal-500/10 to-transparent",
    iconStyle:
      "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  },
  {
    title: "Daftar Surat Keluar",
    description: "Pengagendaan Naskah Keluar",
    href: "/surat/keluar",
    icon: Send,
    gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
    iconStyle:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    title: "Input Surat Keluar",
    description: "Form Penomoran Surat Keluar",
    href: "/surat/keluar/create",
    icon: Plus,
    gradient: "from-sky-500/20 via-sky-500/10 to-transparent",
    iconStyle:
      "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
];

function getInitialMasuk(): SuratMasukItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("bksda_saved_surat_masuk");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export default function SuratHubPage() {
  const initialMasuk = useMemo(() => getInitialMasuk(), []);
  const [totalSuratMasuk, setTotalSuratMasuk] = useState<number>(initialMasuk.length);
  const [totalSuratKeluar, setTotalSuratKeluar] = useState<number>(0);
  const [suratMasukList, setSuratMasukList] = useState<SuratMasukItem[]>(initialMasuk.slice(0, 5));
  const [suratKeluarList, setSuratKeluarList] = useState<SuratKeluarItem[]>([]);

  useEffect(() => {
    async function loadData() {
      // 1. Load Surat Masuk (from API + localStorage fallback)
      let localMasukItems: SuratMasukItem[] = [];
      if (typeof window !== "undefined") {
        const savedMasuk = localStorage.getItem("bksda_saved_surat_masuk");
        if (savedMasuk) {
          try {
            const parsed = JSON.parse(savedMasuk);
            if (Array.isArray(parsed)) {
              localMasukItems = parsed;
            }
          } catch (e) {}
        }
      }

      let combinedMasuk: SuratMasukItem[] = [...localMasukItems];

      try {
        const resMasuk = await api.get("/surat-masuk?per_page=all");
        const apiData = resMasuk.data?.data || resMasuk.data || [];
        if (Array.isArray(apiData) && apiData.length > 0) {
          const apiFormatted = apiData.map((d: any) => ({
            id: d.id,
            no_agenda: d.no_agenda || "",
            tanggal_agenda: d.tanggal_agenda || "",
            no_surat: d.no_surat || "",
            tanggal_surat: d.tanggal_surat || "",
            asal_surat: d.asal_surat || "",
            isi_ringkas: d.isi_ringkas || "",
            perihal: d.isi_ringkas || "",
            sifat_json: d.sifat_json || ["Biasa"],
          }));

          apiFormatted.forEach((apiItem: SuratMasukItem) => {
            const existingIdx = combinedMasuk.findIndex(
              (item) => String(item.no_agenda) === String(apiItem.no_agenda)
            );
            if (existingIdx === -1) {
              combinedMasuk.push(apiItem);
            } else {
              combinedMasuk[existingIdx] = apiItem;
            }
          });
        }
      } catch (err) {}

      // Sort descending by no_agenda / id (newest first)
      combinedMasuk.sort((a, b) => {
        const numA = parseInt(a.no_agenda || "0", 10);
        const numB = parseInt(b.no_agenda || "0", 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numB - numA;
        }
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

      setTotalSuratMasuk(combinedMasuk.length);
      setSuratMasukList(combinedMasuk.slice(0, 5));

      // 2. Load Surat Keluar
      try {
        const resKeluar = await api.get("/surat-keluar?per_page=all");
        const keluarData = resKeluar.data?.data || resKeluar.data || [];
        if (Array.isArray(keluarData)) {
          const formattedKeluar = keluarData.map((d: any) => ({
            id: d.id,
            no_surat: d.no_surat || "",
            tanggal_surat: d.tanggal_surat || "",
            tujuan_surat: d.tujuan_surat || "",
            perihal: d.perihal || "",
            sifat: d.sifat || "Biasa",
            status: "Terarsip",
          }));

          setTotalSuratKeluar(formattedKeluar.length);
          setSuratKeluarList(formattedKeluar.slice(0, 5));
        }
      } catch (err) {
        setTotalSuratKeluar(0);
        setSuratKeluarList([]);
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
