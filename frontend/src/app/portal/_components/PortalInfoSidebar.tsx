"use client";

import React from "react";
import { Megaphone, BookOpen, HelpCircle, FileCheck2, ArrowRight } from "lucide-react";

export function PortalInfoSidebar() {
  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-4">
      {/* WIDGET 1: PENGUMUMAN BALAI */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          <Megaphone className="w-4 h-4 text-emerald-600" />
          <span>Pengumuman Resmi</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
              DIPA 2026
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 pt-1">
              Pembaruan Tata Kerja & DIPA TA 2026
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              DIPA Balai KSDA Kalimantan Timur Nomor: DIPA-143.04.2.693614/2026 terbit 08 Juli 2026.
            </p>
          </div>

          <div className="space-y-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded">
              ASET BMN
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 pt-1">
              Inventarisasi BMN Berkala
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              Pelaksanaan opname fisik ATK & BMN di Seksi KSDA Wilayah I Berau dan Seksi Wilayah II Tenggarong.
            </p>
          </div>
        </div>
      </div>

      {/* WIDGET 2: PANDUAN LAPORAN SURAT TUGAS */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <BookOpen className="w-4 h-4" />
          <span>Panduan Laporan ST</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Setiap Surat Tugas wajib dibuatkan Laporan Pelaksanaan paling lambat <span className="text-emerald-400 font-bold">7 hari kerja</span> setelah selesai kegiatan.
        </p>
        <div className="pt-1">
          <a
            href="#laporan-st"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Format Laporan Resmi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* WIDGET 3: PUSAT BANTUAN */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>Pusat Bantuan Subbag TU</span>
        </div>
        <p className="text-slate-500 text-[11px]">
          Kendala akun, reset password, atau modul akses? Hubungi Admin Subbag Tata Usaha BKSDA Kaltim.
        </p>
        <p className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[11px] pt-1">
          tu.bksdakaltim@ksdae.go.id
        </p>
      </div>
    </aside>
  );
}
