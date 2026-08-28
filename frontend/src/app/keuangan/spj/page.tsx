"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Eye,
  FileText,
  Filter,
  Pencil,
  Plus,
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
import {
  MOCK_SPJ,
  SpjStatus,
  formatRupiah,
  statusClass,
} from "@/app/keuangan/_components/finance-data";

const STATUS_FILTERS: Array<SpjStatus | "Semua"> = [
  "Semua",
  "Draft",
  "Diajukan",
  "Diproses",
  "Disetujui",
  "Selesai",
];

export default function SpjListPage() {
  const [records, setRecords] = useState(MOCK_SPJ);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SpjStatus | "Semua">("Semua");
  const { canWrite } = useRole();
  const confirm = useConfirm();

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const query = search.toLowerCase().trim();
        const matchesSearch =
          !query ||
          [record.number, record.activity, record.creator].some((value) =>
            value.toLowerCase().includes(query)
          );
        return matchesSearch && (status === "Semua" || record.status === status);
      }),
    [records, search, status]
  );

  const handleDelete = async (id: string) => {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    const confirmed = await confirm({
      title: "Hapus draft SPJ?",
      description: `Draft ${record.number} akan dihapus dari daftar preview. Aksi ini hanya simulasi frontend sampai endpoint tersedia.`,
      confirmText: "Ya, hapus",
      variant: "danger",
    });
    if (!confirmed) return;
    setRecords((items) => items.filter((item) => item.id !== id));
    toast.success("Draft SPJ dihapus dari preview.");
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
            Semua SPJ yang dibuat pegawai, dari draft sampai selesai. Pada fase berikutnya data
            ini akan terhubung ke backend.
          </p>
        </div>

        {canWrite && (
          <Button
            asChild
            className="h-10 rounded-xl bg-amber-600 px-4 text-xs font-semibold hover:bg-amber-500"
          >
            <Link href="/keuangan/spj/create">
              <Plus className="mr-1.5 h-4 w-4" /> Buat SPJ
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row dark:border-slate-800 dark:bg-slate-900">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor, kegiatan, atau pembuat..."
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 shrink-0 text-slate-400" />
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setStatus(item)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
                    status === item
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
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
                {filteredRecords.length}
              </span>{" "}
              SPJ ditampilkan
            </p>
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
            >
              Preview frontend
            </Badge>
          </div>

          <div className="grid gap-4">
            {filteredRecords.map((record) => (
              <article
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-700"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={statusClass[record.status]}>
                        {record.status}
                      </Badge>
                      <span className="text-xs text-slate-400">Diperbarui {record.updatedAt}</span>
                    </div>
                    <h2 className="text-base font-bold leading-6">{record.activity}</h2>
                    <p className="mt-1 break-all text-xs text-slate-500">{record.number}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-slate-500">Total SPJ</p>
                    <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">
                      {formatRupiah(record.total)}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {record.employeeCount} pegawai
                      </strong>
                      <br />
                      dalam satu SPJ
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {record.period}
                      </strong>
                      <br />
                      periode perjalanan
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span>Pembuat</span>
                    <br />
                    <strong className="text-slate-800 dark:text-slate-200">{record.creator}</strong>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Eye className="mr-2 h-3.5 w-3.5" /> Lihat paket{" "}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                  {canWrite && record.status === "Draft" && (
                    <>
                      <Button variant="outline" size="sm" className="rounded-lg">
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {filteredRecords.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-semibold">SPJ tidak ditemukan</p>
                <p className="mt-1 text-sm text-slate-500">
                  Coba ubah kata kunci atau filter status.
                </p>
              </div>
            )}
          </div>
    </div>
  );
}
