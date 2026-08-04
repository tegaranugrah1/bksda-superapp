"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Send,
  Plus,
  Layers,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  HeaderBanner,
  BentoStatCards,
  RecentSuratWidget,
} from "./_components/SuratHubComponents";

interface SuratMasukItem {
  id?: string | number;
  no_agenda?: string;
  asal_surat?: string;
  perihal?: string;
  tanggal_terima?: string;
  status_disposisi?: string;
  sifat?: string;
}

interface SuratKeluarItem {
  id?: string | number;
  no_surat?: string;
  tujuan_surat?: string;
  perihal?: string;
  tanggal_surat?: string;
  status?: string;
}

export default function SuratHubPage() {
  const [totalSuratMasuk, setTotalSuratMasuk] = useState<number>(0);
  const [totalSuratKeluar, setTotalSuratKeluar] = useState<number>(0);
  const [suratMasukList, setSuratMasukList] = useState<SuratMasukItem[]>([]);
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
        const resMasuk = await api.get("/surat-masuk");
        const apiData = resMasuk.data?.data || [];
        if (Array.isArray(apiData) && apiData.length > 0) {
          apiData.forEach((apiItem: any) => {
            if (
              !combinedMasuk.some(
                (item) => String(item.no_agenda) === String(apiItem.no_agenda)
              )
            ) {
              combinedMasuk.push(apiItem);
            }
          });
        }
      } catch (err) {}

      setTotalSuratMasuk(combinedMasuk.length);
      setSuratMasukList(combinedMasuk.slice(0, 4));

      // 2. Load Surat Keluar
      try {
        const resKeluar = await api.get("/surat-keluar");
        const keluarData = resKeluar.data?.data || [];
        if (Array.isArray(keluarData)) {
          setTotalSuratKeluar(keluarData.length);
          setSuratKeluarList(keluarData.slice(0, 4));
        }
      } catch (err) {
        setTotalSuratKeluar(0);
        setSuratKeluarList([]);
      }
    }

    loadData();
  }, []);

  const quickLinks = [
    {
      title: "Daftar Surat Masuk",
      description: "Penatausahaan & Disposisi",
      href: "/surat/masuk",
      icon: Inbox,
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconStyle:
        "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
    },
    {
      title: "Input Surat Masuk",
      description: "Register Agenda & Disposisi",
      href: "/surat/masuk/create",
      icon: Plus,
      gradient: "from-teal-500/20 via-teal-500/10 to-transparent",
      iconStyle:
        "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/20",
    },
    {
      title: "Disposisi Pimpinan",
      description: "Lembar Disposisi 2-Up",
      href: "/surat/masuk",
      icon: FileText,
      gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
      iconStyle:
        "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20",
    },
    {
      title: "Daftar Surat Keluar",
      description: "Pengagendaan Naskah Keluar",
      href: "/surat/keluar",
      icon: Send,
      gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
      iconStyle:
        "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20",
    },
    {
      title: "Input Surat Keluar",
      description: "Form Penomoran Surat Keluar",
      href: "/surat/keluar/create",
      icon: Plus,
      gradient: "from-sky-500/20 via-sky-500/10 to-transparent",
      iconStyle:
        "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/20",
    },
    {
      title: "Arsip Digital",
      description: "Penyimpanan Berkas Resmi",
      href: "/surat/keluar",
      icon: Layers,
      gradient: "from-purple-500/20 via-purple-500/10 to-transparent",
      iconStyle:
        "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/20",
    },
  ];

  return (
    <div className="w-full p-4 md:p-6 space-y-5 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* 1. Ultra-Aesthetic Mesh Gradient Header Banner */}
      <HeaderBanner />

      {/* 2. Glassmorphism Bento Stat Cards (4 Cards) */}
      <BentoStatCards
        totalSuratMasuk={totalSuratMasuk}
        totalSuratKeluar={totalSuratKeluar}
      />

      {/* 3. Dynamic Quick Actions Grid (6 Compact Premium Cards) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-500" /> Akses Pintas Modul Persuratan
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href + item.title} href={item.href}>
                <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 rounded-2xl hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 group hover:shadow-xl hover:shadow-emerald-500/5 flex flex-col justify-between h-full min-h-[96px]">
                  <div
                    className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none`}
                  />
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shadow-md ${item.iconStyle} group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors leading-tight truncate">
                      {item.title}
                    </h3>
                    <p className="text-[9.5px] text-zinc-400 mt-0.5 truncate font-medium">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Split Cards (Surat Masuk Terkini + Surat Keluar Terkini) */}
      <RecentSuratWidget
        suratMasukList={suratMasukList}
        suratKeluarList={suratKeluarList}
      />
    </div>
  );
}
