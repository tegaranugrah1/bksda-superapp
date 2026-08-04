"use client";

import React from "react";
import Link from "next/link";
import { Plus, Loader2, ClipboardList, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuratTugasItem {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  file_surat_path: string | null;
}

interface SuratTugasTabProps {
  stLoading: boolean;
  suratTugas: SuratTugasItem[];
  fetchSTDetail: (id: string) => void;
  stDetailLoading: boolean;
}

export function SuratTugasTab({
  stLoading,
  suratTugas,
  fetchSTDetail,
  stDetailLoading,
}: SuratTugasTabProps) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Surat Tugas Saya</h3>
          <p className="text-xs text-slate-500">Ajukan permohonan surat tugas pegawai.</p>
        </div>
        <Link href="/surat-tugas">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-sm gap-1.5">
            <Plus className="w-4 h-4" />
            Ajukan Surat Tugas Baru
          </Button>
        </Link>
      </div>
      {stLoading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Memuat surat tugas...</p>
        </div>
      ) : suratTugas.length === 0 ? (
        <div className="p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada surat tugas yang diterbitkan</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {suratTugas.map((st) => (
            <div key={st.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{st.maksud_tujuan}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {st.nomor_surat && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{st.nomor_surat}</span>}
                  <span className="text-xs text-slate-400">
                    {new Date(st.tanggal_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => fetchSTDetail(st.id)} disabled={stDetailLoading} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 transition-colors disabled:opacity-50" title="Lihat">
                  {stDetailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
