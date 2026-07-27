"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Inbox, Send, Plus, ArrowRight, FileCheck, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function SuratHubPage() {
  const [totalSuratMasuk, setTotalSuratMasuk] = useState<number>(0);
  const [totalSuratKeluar, setTotalSuratKeluar] = useState<number>(0);

  useEffect(() => {
    async function loadStats() {
      let localItems: any[] = [];
      if (typeof window !== "undefined") {
        const savedMasuk = localStorage.getItem("bksda_saved_surat_masuk");
        if (savedMasuk) {
          try {
            const parsed = JSON.parse(savedMasuk);
            if (Array.isArray(parsed)) {
              localItems = parsed;
            }
          } catch (e) {}
        }
      }

      let countMasuk = localItems.length;

      try {
        const resMasuk = await api.get("/api/surat-masuk");
        const apiData = resMasuk.data?.data || [];
        if (Array.isArray(apiData) && apiData.length > 0) {
          const combined = [...localItems];
          apiData.forEach((apiItem: any) => {
            if (!combined.some((item) => String(item.no_agenda) === String(apiItem.no_agenda))) {
              combined.push(apiItem);
            }
          });
          countMasuk = combined.length;
        }
      } catch (err) {}

      setTotalSuratMasuk(countMasuk);
      setTotalSuratKeluar(0);
    }

    loadStats();
  }, []);
  return (
    <div className="space-y-6 p-6">
      {/* ── Header Banner ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-3xl border border-zinc-200 bg-gradient-to-br from-emerald-900 via-zinc-900 to-zinc-950 p-6 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
            <Mail className="h-3.5 w-3.5" />
            <span>Modul Persuratan Digital</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Pengelolaan Surat Masuk & Surat Keluar
          </h1>
          <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
            Penatausahaan surat resmi BKSDA Kalimantan Timur, penerusan lembar disposisi presisi (Letter divided by 2), dan penomoran agenda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/surat/masuk/create">
            <Button className="h-10 px-4 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-xl shadow-lg shadow-emerald-500/20">
              <Plus className="mr-1.5 h-4 w-4" />
              Input Surat Masuk
            </Button>
          </Link>
          <Link href="/surat/keluar/create">
            <Button variant="outline" className="h-10 px-4 text-xs font-bold border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-white rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" />
              Input Surat Keluar
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Quick Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Total Surat Masuk</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Inbox className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">{totalSuratMasuk}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <FileCheck className="h-3 w-3" /> Disposisi Aktif & Teragendakan
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Total Surat Keluar</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Send className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">{totalSuratKeluar}</p>
          <p className="mt-1 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
            <Layers className="h-3 w-3" /> Terarsip Otomatis
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Kertas Disposisi Cetak</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Mail className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">2-Up Letter</p>
          <p className="mt-1 text-[11px] text-amber-600 font-semibold">
            Presisi 2 Lembar Disposisi per Halaman
          </p>
        </div>
      </div>

      {/* ── Main Modules Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Surat Masuk Card */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Modul Surat Masuk
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Pencatatan surat masuk, penerbitan nomor agenda, penerusan disposisi pimpinan, dan pencetakan Lembar Disposisi 2-Up (Letter Divided by 2).
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link href="/surat/masuk" className="flex-1">
              <Button variant="outline" className="w-full h-10 text-xs font-semibold rounded-xl">
                Lihat Daftar Surat Masuk
              </Button>
            </Link>
            <Link href="/surat/masuk/create">
              <Button className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                Input Surat Masuk
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Surat Keluar Card */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
              <Send className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Modul Surat Keluar
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Pengagendaan nomor surat keluar, pencatatan tujuan & perihal, serta pengunggahan naskah dinas resmi.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link href="/surat/keluar" className="flex-1">
              <Button variant="outline" className="w-full h-10 text-xs font-semibold rounded-xl">
                Lihat Daftar Surat Keluar
              </Button>
            </Link>
            <Link href="/surat/keluar/create">
              <Button className="h-10 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                Input Surat Keluar
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
