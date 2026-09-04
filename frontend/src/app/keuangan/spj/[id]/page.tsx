"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  DOCUMENT_LABELS,
  DOCUMENT_LABELS_DIPA,
  formatRupiah,
  statusClass,
  SpjStatus,
} from "@/app/keuangan/_components/finance-data";
import { DocumentTemplates } from "@/app/keuangan/_components/DocumentTemplates";
import { Official, RecipientRow } from "@/app/keuangan/_components/templates/shared";

interface SpjDetailData {
  id: number;
  nomor_spj: string;
  tipe_anggaran: "FOLU" | "DIPA";
  nama_kegiatan: string;
  nomor_spt?: string;
  surat_tugas_id?: string;
  sumber_dana?: string;
  kode_awp?: string;
  satuan_kerja?: string;
  asal?: string;
  tujuan?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  pejabat_ppk?: Official;
  pejabat_pdo?: Official;
  pejabat_verifikator?: Official;
  pejabat_kasubbag?: Official;
  recipients?: RecipientRow[];
  total_anggaran: number;
  employee_count: number;
  status: SpjStatus;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export default function SpjDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [spj, setSpj] = useState<SpjDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState("sptjb");

  const fetchDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/api/keuangan/spj/${id}`);
      const data: SpjDetailData = res.data?.data || null;
      setSpj(data);
      if (data) {
        setSelectedDocument(data.tipe_anggaran === "DIPA" ? "spby-dipa" : "sptjb");
      }
    } catch (err: unknown) {
      console.error("Gagal memuat detail SPJ:", err);
      toast.error("Gagal memuat detail data SPJ dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const isDipa = spj?.tipe_anggaran === "DIPA";
  const documentLabels = isDipa ? DOCUMENT_LABELS_DIPA : DOCUMENT_LABELS;

  const previewRecipients = useMemo(() => {
    if (!spj?.recipients) return [];
    return spj.recipients.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      evidence: r.evidenceNo
        ? `${r.evidenceNo}${r.evidenceSuffix || ""}`
        : `          ${r.evidenceSuffix || (isDipa ? "/K.18-TU/KEU/01/2026" : "/K.18/FOLU.NC-23/08/2026")}`,
      amount: r.amount,
      rinba: r.rinba,
      dipa: r.dipa,
      bankName: r.bankName,
      accountNo: r.accountNo,
      accountHolder: r.accountHolder,
      nip: r.nip,
      rank: r.rank,
      position: r.position,
      satuanKerja: r.satuanKerja,
      mengetahui: r.mengetahui
        ? {
            name: r.mengetahui.name,
            nik: r.mengetahui.nik,
            position: r.mengetahui.position || "Pejabat Pengawas",
          }
        : undefined,
    }));
  }, [spj, isDipa]);

  const documentCounts = useMemo(() => {
    const recCount = spj?.recipients?.length || 0;
    return documentLabels.map((document) => ({
      ...document,
      count: ["rinba", "spd", "spb", "kuitansi", "rinba-dipa", "spd-dipa"].includes(document.key) ? recCount : 1,
    }));
  }, [documentLabels, spj?.recipients?.length]);

  const selectedDocumentLabel =
    documentLabels.find((document) => document.key === selectedDocument)?.label || (isDipa ? "SPBy" : "SPTJB / Rekap");

  const printDocument = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-8 text-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-3" />
        <p className="font-semibold text-sm">Memuat Dokumen SPJ...</p>
      </div>
    );
  }

  if (!spj) {
    return (
      <div className="p-10">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-lg font-bold">SPJ Tidak Ditemukan</h2>
          <p className="mt-1 text-xs text-slate-500">
            Data SPJ dengan ID #{id} tidak ada atau telah dihapus.
          </p>
          <Button asChild className="mt-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs">
            <Link href="/keuangan/spj">Kembali ke Daftar SPJ</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 p-5 md:p-10 print:p-0">
      {/* HEADER NAVBAR */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/keuangan/spj" aria-label="Kembali">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                KEUANGAN / SPJ / DETAIL
              </p>
              <Badge variant="outline" className={statusClass[spj.status] || "bg-slate-100"}>
                {spj.status}
              </Badge>
              <Badge
                variant="outline"
                className={
                  spj.tipe_anggaran === "FOLU"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px]"
                    : "border-blue-300 bg-blue-50 text-blue-700 text-[10px]"
                }
              >
                {spj.tipe_anggaran === "FOLU" ? "FOLU Net Sink" : "DIPA"}
              </Badge>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{spj.nama_kegiatan}</h1>
            <p className="font-mono text-xs text-slate-500 mt-0.5">{spj.nomor_spj}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchDetail}
            title="Segarkan data"
            className="h-10 w-10 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            className="h-10 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
            onClick={printDocument}
          >
            <Printer className="mr-1.5 h-4 w-4" /> Print {selectedDocumentLabel}
          </Button>
        </div>
      </div>

      {/* SUMMARY STATS BANNER */}
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Anggaran</p>
          <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">
            {formatRupiah(spj.total_anggaran)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jumlah Penerima</p>
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            {spj.employee_count} Personil / Penerima
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rute Perjalanan</p>
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            {spj.asal || "Samarinda"} ➔ {spj.tujuan || "Kab. Kutai Barat"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SPT Panduan</p>
          <p className="mt-1 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {spj.nomor_spt || "-"}
          </p>
        </div>
      </div>

      {/* 6 DOKUMEN SELECTOR CARDS */}
      <div className="print:hidden space-y-3">
        <div>
          <h2 className="text-lg font-bold">Pilih Dokumen untuk Dicetak</h2>
          <p className="text-xs text-slate-500">
            Klik jenis dokumen untuk melihat pratinjau layout sebelum dicetak ke format A4.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documentCounts.map((document) => (
            <button
              key={document.key}
              onClick={() => setSelectedDocument(document.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedDocument === document.key
                  ? "border-amber-400 bg-amber-50 shadow-sm dark:border-amber-600 dark:bg-amber-500/10"
                  : "border-slate-200 bg-white hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <FileSpreadsheet
                  className={`h-5 w-5 ${selectedDocument === document.key ? "text-amber-600" : "text-slate-400"}`}
                />
                <Badge variant="outline">{document.count} output</Badge>
              </div>
              <p className="mt-3 text-sm font-bold">{document.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{document.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* LIVE DOCUMENT PREVIEW */}
      <DocumentTemplates
        selectedDocument={selectedDocument}
        recipients={previewRecipients}
        activity={{
          awpCode: spj.kode_awp || (isDipa ? "524111" : "C.1.1.2.01"),
          name: spj.nama_kegiatan,
        }}
        travel={{
          origin: spj.asal || "Samarinda",
          destination: spj.tujuan || "Kabupaten Kutai Barat",
          startDate: spj.tanggal_mulai || "2026-07-10",
          endDate: spj.tanggal_selesai || "2026-07-17",
        }}
        sptNumber={spj.nomor_spt || spj.nomor_spj}
        ppk={spj.pejabat_ppk || { name: isDipa ? "RUSMANTO, S.Hut" : "Ahmad Hidayat, S.PKP., M.Ling", nik: isDipa ? "19810907 200012 1 004" : "19820301 200012 1 001", position: "Pejabat Pembuat Komitmen" }}
        pdo={spj.pejabat_pdo || { name: isDipa ? "SOERENDENG, SE" : "Dilemma Ferti Hidayah, S.E.", nik: isDipa ? "19790721 200701 2 001" : "19870130 201012 2 005", position: isDipa ? "Bendahara Pengeluaran" : "Pemegang Dana Operasional" }}
        verifikator={spj.pejabat_verifikator || { name: "Sukma Mawarni, S.E.", nik: "19930425 202421 2 053", position: "Verifikator Keuangan" }}
        total={spj.total_anggaran}
        tipeAnggaran={spj.tipe_anggaran || "FOLU"}
      />
    </div>
  );
}
