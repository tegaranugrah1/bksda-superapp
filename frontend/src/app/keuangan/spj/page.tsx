"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRole } from "@/hooks/useRole";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  SpjStatus,
  formatRupiah,
  statusClass,
} from "@/app/keuangan/_components/finance-data";

export interface BackendSpjRecord {
  id: number | string;
  nomor_spj: string;
  tipe_anggaran: "FOLU" | "DIPA";
  nama_kegiatan: string;
  nomor_spt?: string;
  sumber_dana?: string;
  asal?: string;
  tujuan?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  employee_count: number;
  total_anggaran: number;
  status: SpjStatus;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_FILTERS: Array<SpjStatus | "Semua"> = [
  "Semua",
  "Draft",
  "Diajukan",
  "Diproses",
  "Disetujui",
  "Selesai",
];

const BUDGET_FILTERS = [
  { key: "Semua", label: "Semua Anggaran" },
  { key: "FOLU", label: "FOLU Net Sink" },
  { key: "DIPA", label: "DIPA" },
] as const;

export default function SpjListPage() {
  const [records, setRecords] = useState<BackendSpjRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SpjStatus | "Semua">("Semua");
  const [budgetType, setBudgetType] = useState<"Semua" | "FOLU" | "DIPA">("Semua");
  const { canWrite } = useRole();
  const confirm = useConfirm();

  const fetchSpjList = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (status !== "Semua") params.status = status;
      if (budgetType !== "Semua") params.tipe_anggaran = budgetType;

      const res = await api.get("/api/keuangan/spj", { params });
      setRecords(res.data?.data || []);
    } catch (err) {
      console.error("Gagal memuat daftar SPJ:", err);
      toast.error("Gagal memuat daftar SPJ dari server.");
    } finally {
      setIsLoading(false);
    }
  }, [search, status, budgetType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSpjList();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSpjList]);

  const handleDelete = async (id: number | string, number: string) => {
    const confirmed = await confirm({
      title: "Hapus SPJ?",
      description: `Data SPJ ${number || ""} akan dihapus dari sistem.`,
      confirmText: "Ya, hapus",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/api/keuangan/spj/${id}`);
      setRecords((items) => items.filter((item) => item.id !== id));
      toast.success("SPJ berhasil dihapus.");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Gagal menghapus SPJ.");
    }
  };

  const formatPeriod = (startDate?: string, endDate?: string) => {
    if (!startDate) return "-";
    try {
      const d1 = new Date(startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const d2 = endDate ? new Date(endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
      return d2 ? `${d1} — ${d2}` : d1;
    } catch {
      return startDate;
    }
  };

  return (
    <div className="space-y-7 p-5 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <FileText className="h-4 w-4" /> KEUANGAN / SPJ
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Daftar SPJ</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Daftar Surat Pertanggungjawaban Belanja (FOLU Net Sink 2030 &amp; DIPA) yang telah dibuat oleh pegawai.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSpjList}
            title="Segarkan data"
            className="h-10 w-10 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canWrite && (
            <Button
              asChild
              className="h-10 rounded-xl bg-amber-600 px-4 text-xs font-semibold hover:bg-amber-500 text-white"
            >
              <Link href="/keuangan/spj/create">
                <Plus className="mr-1.5 h-4 w-4" /> Buat SPJ Baru
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor SPJ, nama kegiatan, atau pembuat..."
            className="h-10 rounded-xl pl-9 text-xs"
          />
        </div>

        {/* Budget Type Selector Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 border-r border-slate-200 pr-3 dark:border-slate-800">
          {BUDGET_FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setBudgetType(item.key as "Semua" | "FOLU" | "DIPA")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                budgetType === item.key
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Status Selector Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" />
          {STATUS_FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setStatus(item)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                status === item
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-bold"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-900 dark:text-white">
            {records.length}
          </span>{" "}
          SPJ tersimpan di sistem
        </p>
      </div>

      {/* RECORD LIST */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 font-bold text-slate-700 dark:text-slate-300">Belum ada data SPJ</p>
          <p className="mt-1 text-sm text-slate-500">
            SPJ yang dibuat melalui form akan otomatis muncul di daftar ini.
          </p>
          {canWrite && (
            <Button asChild className="mt-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs">
              <Link href="/keuangan/spj/create">
                <Plus className="mr-1.5 h-4 w-4" /> Buat SPJ Sekarang
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-700"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={statusClass[record.status] || "bg-slate-100 text-slate-700"}>
                      {record.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        record.tipe_anggaran === "FOLU"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px]"
                          : "border-blue-300 bg-blue-50 text-blue-700 text-[10px]"
                      }
                    >
                      {record.tipe_anggaran === "FOLU" ? "FOLU Net Sink" : "DIPA"}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      ID #{record.id} · Diperbarui {record.updated_at ? new Date(record.updated_at).toLocaleDateString("id-ID") : "-"}
                    </span>
                  </div>

                  <h2 className="text-base font-bold leading-snug text-slate-900 dark:text-slate-100">
                    {record.nama_kegiatan}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                      {record.nomor_spj || "Belum ada nomor"}
                    </span>
                    {record.nomor_spt && (
                      <span>SPT: <span className="font-mono">{record.nomor_spt}</span></span>
                    )}
                  </div>
                </div>

                <div className="text-left lg:text-right shrink-0">
                  <p className="text-xs text-slate-400">Total Anggaran SPJ</p>
                  <p className="mt-0.5 text-lg font-bold text-amber-700 dark:text-amber-300">
                    {formatRupiah(record.total_anggaran)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {record.employee_count} Penerima
                    </strong>
                    <br />
                    rincian dalam rekap
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatPeriod(record.tanggal_mulai, record.tanggal_selesai)}
                    </strong>
                    <br />
                    {record.asal || "Samarinda"} ➔ {record.tujuan || "Kab. Kutai Barat"}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  <span>Dibuat Oleh:</span>
                  <br />
                  <strong className="text-slate-800 dark:text-slate-200">
                    {record.creator_name || "Admin"}
                  </strong>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button asChild variant="outline" size="sm" className="rounded-xl border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-200 font-semibold">
                  <Link href={`/keuangan/spj/${record.id}`}>
                    <Eye className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Buka &amp; Cetak Dokumen
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>

                {canWrite && record.status === "Draft" && (
                  <Button asChild variant="outline" size="sm" className="rounded-xl border-slate-300 hover:bg-slate-100 dark:border-slate-700 font-medium">
                    <Link href={`/keuangan/spj/${record.id}/edit`}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5 text-slate-600" /> Edit Draft
                    </Link>
                  </Button>
                )}

                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                    onClick={() => handleDelete(record.id, record.nomor_spj)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
