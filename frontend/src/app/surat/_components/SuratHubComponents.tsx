"use client";

import React from "react";
import Link from "next/link";
import {
  Mail,
  Inbox,
  Send,
  Plus,
  FileCheck,
  CheckCircle2,
  Building2,
  ChevronRight,
  Calendar,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SuratMasukItem {
  id?: string | number;
  no_agenda?: string;
  tanggal_agenda?: string;
  no_surat?: string;
  tanggal_surat?: string;
  asal_surat?: string;
  isi_ringkas?: string;
  perihal?: string;
  tanggal_terima?: string;
  status_disposisi?: string;
  sifat?: string;
  sifat_json?: string[];
}

export interface SuratKeluarItem {
  id?: string | number;
  no_surat?: string;
  tanggal_surat?: string;
  tujuan_surat?: string;
  perihal?: string;
  sifat?: string;
  status?: string;
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const str = String(dateStr).trim();
  const rawDate = str.includes("T") ? str.split("T")[0] : str.includes(" ") ? str.split(" ")[0] : str;
  const parts = rawDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return rawDate;
}

export function HeaderBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 p-5 md:p-6 border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
            <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-bold tracking-wide uppercase">
              BKSDA KALIMANTAN TIMUR &bull; PERSURATAN RESMI
            </span>
          </div>

          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Pengelolaan Surat Masuk & Surat Keluar
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Pusat penatausahaan naskah dinas resmi, registrasi nomor agenda, penerusan lembar disposisi, dan pengarsipan digital Balai KSDA Kalimantan Timur.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href="/surat/masuk/create">
            <Button className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20 gap-2">
              <Plus className="h-4 w-4" />
              Input Surat Masuk
            </Button>
          </Link>
          <Link href="/surat/keluar/create">
            <Button
              variant="outline"
              className="h-10 px-4 text-xs font-bold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900/60 dark:text-blue-300 dark:bg-blue-950/30 dark:hover:bg-blue-950/60 rounded-xl gap-2"
            >
              <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Input Surat Keluar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function BentoStatCards({
  totalSuratMasuk,
  totalSuratKeluar,
}: {
  totalSuratMasuk: number;
  totalSuratKeluar: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: Total Surat Masuk */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Inbox className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
            Surat Masuk
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {totalSuratMasuk}
            </p>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
              Agenda Aktif
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
            Disposisi & Teragendakan
          </p>
        </div>
      </div>

      {/* Card 2: Total Surat Keluar */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
            <Send className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
            Surat Keluar
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {totalSuratKeluar}
            </p>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
              Terarsip
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
            Penomoran Naskah Resmi
          </p>
        </div>
      </div>

      {/* Card 3: Lembar Disposisi 2-Up */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <FileCheck className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
            Disposisi Cetak
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              2-Up Letter
            </p>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
              Standar
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
            2 Lembar Disposisi per Halaman
          </p>
        </div>
      </div>

      {/* Card 4: Penatausahaan */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:border-teal-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/60">
            Tata Kelola
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              100%
            </p>
            <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded">
              Terdata
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
            Penatausahaan Naskah Resmi
          </p>
        </div>
      </div>
    </div>
  );
}

export function RecentSuratWidget({
  suratMasukList,
  suratKeluarList,
}: {
  suratMasukList: SuratMasukItem[];
  suratKeluarList: SuratKeluarItem[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Kolom Kiri: Tabel Mini Surat Masuk Terbaru */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 md:px-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs md:text-sm text-zinc-900 dark:text-white">
                Surat Masuk Terbaru
              </h3>
              <p className="text-[10px] text-zinc-400">
                5 naskah dinas masuk & disposisi terakhir
              </p>
            </div>
          </div>
          <Link
            href="/surat/masuk"
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto flex-1">
          {suratMasukList.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs font-medium">
              Belum ada data Surat Masuk terbaru.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-100 dark:border-zinc-800/60 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-50/30 dark:bg-zinc-900/20">
                <tr>
                  <th className="py-2.5 px-4">No Agenda</th>
                  <th className="py-2.5 px-3">No & Tgl Surat</th>
                  <th className="py-2.5 px-3">Pengirim & Perihal</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {suratMasukList.slice(0, 5).map((item) => {
                  const perihalText = item.isi_ringkas || item.perihal || "-";
                  const sifatText = (item.sifat_json && item.sifat_json[0]) || item.sifat || "Biasa";
                  return (
                    <tr
                      key={item.id || item.no_agenda}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.no_agenda || "-"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          {formatDisplayDate(item.tanggal_agenda || item.tanggal_terima)}
                        </span>
                      </td>

                      <td className="py-3 px-3 align-top min-w-36">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate max-w-44">
                          {item.no_surat || "-"}
                        </span>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          {formatDisplayDate(item.tanggal_surat)}
                        </span>
                      </td>

                      <td className="py-3 px-3 align-top min-w-44 max-w-64">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-900 dark:text-white truncate">
                            {item.asal_surat || "Instansi Luar"}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium shrink-0">
                            {sifatText}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5 leading-tight">
                          {perihalText}
                        </p>
                      </td>

                      <td className="py-3 px-3 align-top text-right shrink-0">
                        <Link
                          href={`/surat/masuk/create?id=${item.id}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-colors"
                          title="Lihat / Edit Disposisi"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Kolom Kanan: Tabel Mini Surat Keluar Terbaru */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 md:px-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs md:text-sm text-zinc-900 dark:text-white">
                Surat Keluar Terbaru
              </h3>
              <p className="text-[10px] text-zinc-400">
                5 penomoran naskah dinas keluar terakhir
              </p>
            </div>
          </div>
          <Link
            href="/surat/keluar"
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto flex-1">
          {suratKeluarList.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs font-medium">
              Belum ada data Surat Keluar terbaru.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-100 dark:border-zinc-800/60 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-50/30 dark:bg-zinc-900/20">
                <tr>
                  <th className="py-2.5 px-4">No Surat</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Tujuan & Perihal</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {suratKeluarList.slice(0, 5).map((item) => (
                  <tr
                    key={item.id || item.no_surat}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-3 px-4 align-top min-w-36">
                      <span className="font-bold text-blue-600 dark:text-blue-400 block truncate max-w-44">
                        {item.no_surat || "-"}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium inline-block mt-0.5">
                        {item.status || "Terarsip"}
                      </span>
                    </td>

                    <td className="py-3 px-3 align-top text-zinc-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span>{formatDisplayDate(item.tanggal_surat)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 align-top min-w-44 max-w-64">
                      <span className="font-semibold text-zinc-900 dark:text-white block truncate">
                        {item.tujuan_surat || "Tujuan Resmi"}
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5 leading-tight">
                        {item.perihal || "-"}
                      </p>
                    </td>

                    <td className="py-3 px-3 align-top text-right shrink-0">
                      <Link
                        href={`/surat/keluar/create?id=${item.id}`}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 transition-colors"
                        title="Lihat Detail Surat Keluar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
