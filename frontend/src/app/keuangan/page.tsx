"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardCheck,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { formatRupiah, statusClass } from "@/app/keuangan/_components/finance-data";
import { BackendSpjRecord } from "@/app/keuangan/spj/page";

const toneClasses: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

export default function KeuanganDashboardPage() {
  const [records, setRecords] = useState<BackendSpjRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/keuangan/spj", { params: { per_page: 5 } })
      .then((res) => setRecords(res.data?.data || []))
      .catch(() => setRecords([]))
      .finally(() => setIsLoading(false));
  }, []);

  const totalCount = records.length;
  const draftCount = records.filter((r) => r.status === "Draft").length;
  const processCount = records.filter((r) => r.status === "Diajukan" || r.status === "Diproses").length;
  const approvedCount = records.filter((r) => r.status === "Disetujui" || r.status === "Selesai").length;

  const stats = [
    { label: "Total SPJ", value: String(totalCount), detail: "Tersimpan di sistem", icon: ReceiptText, tone: "amber" },
    { label: "Draft", value: String(draftCount), detail: "Perlu dilanjutkan", icon: FilePlus2, tone: "slate" },
    { label: "Dalam proses", value: String(processCount), detail: "Menunggu persetujuan", icon: ClipboardCheck, tone: "blue" },
    { label: "Disetujui", value: String(approvedCount), detail: "Selesai verifikasi", icon: FileCheck2, tone: "emerald" },
  ];

  return (
    <div className="space-y-8 p-5 md:p-10">
      <section className="relative overflow-hidden rounded-4xl bg-slate-950 px-6 py-8 text-white shadow-xl md:px-10 md:py-10">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge className="mb-4 border-amber-300/20 bg-amber-400/15 text-amber-200 hover:bg-amber-400/15">MODUL KEUANGAN · SISTEM SPJ</Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Kelola SPJ dalam satu alur yang rapi.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Pantau pengajuan, susun dokumen pembayaran, dan siapkan satu paket SPJ yang mengikuti format workbook resmi.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="h-11 rounded-xl bg-amber-500 px-5 text-slate-950 hover:bg-amber-400">
              <Link href="/keuangan/spj/create"><FilePlus2 className="mr-2 h-4 w-4" /> Buat SPJ</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl border-amber-400/30 bg-amber-500/10 px-5 text-amber-200 hover:bg-amber-500/20 hover:text-white">
              <Link href="/keuangan/visum"><FileSpreadsheet className="mr-2 h-4 w-4 text-amber-400" /> Cetak Lembar Visum</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl border-white/20 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white">
              <Link href="/keuangan/spj">Lihat daftar SPJ <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${toneClasses[stat.tone]}`}><Icon className="h-5 w-5" /></div>
              </div>
              <p className="mt-4 text-xs text-slate-500">{stat.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="font-bold">SPJ terbaru</h2>
              <p className="mt-1 text-xs text-slate-500">Aktivitas terbaru di modul Keuangan</p>
            </div>
            <Link href="/keuangan/spj" className="text-xs font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-300">Lihat semua</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="p-5 text-center text-xs text-slate-400">Memuat data...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Belum ada SPJ tersimpan di database.</div>
            ) : (
              records.map((record) => (
                <div key={record.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{record.nama_kegiatan}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{record.nomor_spj || "Draft SPJ"} · {record.creator_name || "Pegawai"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{formatRupiah(record.total_anggaran)}</span>
                    <Badge variant="outline" className={statusClass[record.status] || "bg-slate-100"}>{record.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><Landmark className="h-5 w-5" /></div>
            <div><h2 className="font-bold">Alur dokumen</h2><p className="text-xs text-slate-500">Satu paket sampai akhir</p></div>
          </div>
          <div className="space-y-4">
            {[
              ["01", "SPT Panduan", "Pilih dari SPT atau isi nomor manual"],
              ["02", "Pegawai & penerima", "Bisa lebih dari satu pegawai"],
              ["03", "Rincian pembayaran", "Pegawai atau pihak ketiga"],
              ["04", "Paket dokumen", "SPTJB, SPB, Kuitansi, Rinba, SPD"],
            ].map(([number, title, detail]) => (
              <div key={number} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{number}</span>
                <div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"><UsersRound className="mb-2 h-4 w-4" />Semua pegawai dapat melihat daftar SPJ. Edit dan hapus dibatasi untuk admin dan superadmin.</div>
        </div>
      </section>
    </div>
  );
}
