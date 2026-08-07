"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Layers,
  Search,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GeneralReportPrint, GeneralReportData } from "./GeneralReportPrint";

interface GeneralReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MySuratTugasOption {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  tempat_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dateStr || "-";
  }
}

function getDurationInDays(startStr: string, endStr: string): number {
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  } catch {
    return 1;
  }
}

function numberToTerbilang(num: number): string {
  const terbilangMap: Record<number, string> = {
    1: "satu",
    2: "dua",
    3: "tiga",
    4: "empat",
    5: "lima",
    6: "enam",
    7: "tujuh",
    8: "delapan",
    9: "sembilan",
    10: "sepuluh",
  };
  return terbilangMap[num] || String(num);
}

function formatJudulLaporan(rawText: string): string {
  let cleaned = (rawText || "").split(";")[0].trim();
  cleaned = cleaned.replace(/[,;]?\s*selama\s+\d+.*$/i, "").trim();

  const matchDalamRangka = cleaned.match(/dalam\s+rangka\s+(.+)$/i);
  if (matchDalamRangka && matchDalamRangka[1]) {
    cleaned = matchDalamRangka[1].trim();
  } else {
    cleaned = cleaned.replace(/^(melaksanakan\s+perjalanan\s+dinas\s+dari\s+[^\s]+\s+ke\s+[^\s]+|melaksanakan\s+kegiatan|melaksanakan\s+perjalanan\s+dinas|menugaskan\s+staf|melaksanakan)\s+/i, "");
  }

  cleaned = cleaned.replace(/^(dari\s+[^\s]+\s+ke\s+[^\s]+\s+)/i, "").trim();
  return `LAPORAN PELAKSANAAN ${cleaned.toUpperCase()}`;
}

function extractShortActivity(rawText: string): string {
  let cleaned = (rawText || "").split(";")[0].trim();
  cleaned = cleaned.replace(/[,;]?\s*selama\s+\d+.*$/i, "").trim();

  const matchDalamRangka = cleaned.match(/dalam\s+rangka\s+(.+)$/i);
  if (matchDalamRangka && matchDalamRangka[1]) {
    cleaned = matchDalamRangka[1].trim();
  } else {
    cleaned = cleaned.replace(/^(melaksanakan\s+perjalanan\s+dinas\s+dari\s+[^\s]+\s+ke\s+[^\s]+|melaksanakan\s+kegiatan|melaksanakan\s+perjalanan\s+dinas|menugaskan\s+staf|melaksanakan)\s+/i, "");
  }

  cleaned = cleaned.replace(/^(dari\s+[^\s]+\s+ke\s+[^\s]+\s+)/i, "").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function extractAgendaPelaksanaan(rawText: string): string {
  let cleaned = (rawText || "").split(";")[0].trim();
  cleaned = cleaned.replace(/[,;]?\s*selama\s+\d+.*$/i, "").trim();
  cleaned = cleaned.replace(/[\.\s]+$/, "");
  return cleaned;
}

function formatMaksudDanTujuan(maksud: string, tujuan: string): string {
  const cleanMaksud = (maksud || "").trim().replace(/[\.\s]+$/, "");
  const cleanTujuan = (tujuan || "").trim().replace(/[\.\s]+$/, "");

  if (cleanMaksud && cleanTujuan) {
    return `Maksud kegiatan ini adalah ${cleanMaksud} dan dengan tujuan untuk ${cleanTujuan}.`;
  }
  if (cleanMaksud) {
    return `Maksud kegiatan ini adalah ${cleanMaksud}.`;
  }
  if (cleanTujuan) {
    return `dengan tujuan untuk ${cleanTujuan}.`;
  }
  return "";
}

function formatWaktuDanTempatPelaksanaan(
  rawMaksud: string,
  tanggalMulai: string,
  tanggalSelesai: string,
  tempatTujuan?: string
): string {
  const daysCount = getDurationInDays(tanggalMulai, tanggalSelesai);
  const daysTerbilang = numberToTerbilang(daysCount);
  const tglMulaiStr = formatDateIndo(tanggalMulai);
  const tglSelesaiStr = formatDateIndo(tanggalSelesai);

  let cleaned = (rawMaksud || "").split(";")[0].trim();
  cleaned = cleaned.replace(/[,;]?\s*selama\s+\d+.*$/i, "").trim();

  const isPerjalananDinas = /perjalanan\s+dinas/i.test(rawMaksud);

  // Extract short activity title
  let shortActivity = cleaned;
  const matchDalamRangka = cleaned.match(/dalam\s+rangka\s+(.+)$/i);
  if (matchDalamRangka && matchDalamRangka[1]) {
    shortActivity = matchDalamRangka[1].trim();
  } else {
    shortActivity = shortActivity.replace(
      /^(melaksanakan\s+perjalanan\s+dinas\s+dari\s+[^\s]+\s+ke\s+[^\s]+|melaksanakan\s+kegiatan|melaksanakan\s+perjalanan\s+dinas|menugaskan\s+staf|melaksanakan)\s+/i,
      ""
    );
  }
  shortActivity = shortActivity.replace(/^(dari\s+[^\s]+\s+ke\s+[^\s]+\s+)/i, "").trim();

  // Handle prepositions "di Seksi KSDA...", "pada Balai KSDA...", "di KPKNL..." in activity title
  let locationClause = "";
  const matchLocationInActivity = shortActivity.match(/(.+?)\s+((?:pada|di)\s+.+)$/i);
  if (matchLocationInActivity && matchLocationInActivity[1] && matchLocationInActivity[2]) {
    shortActivity = matchLocationInActivity[1].trim();
    locationClause = matchLocationInActivity[2].trim();
  } else if (tempatTujuan) {
    locationClause = tempatTujuan;
  }

  shortActivity = shortActivity.replace(/^kegiatan\s+/i, "").trim();
  shortActivity = shortActivity.charAt(0).toUpperCase() + shortActivity.slice(1);

  // Date Clause: single-day vs multi-day
  const isSingleDay = daysCount === 1 || tglMulaiStr === tglSelesaiStr;
  const dateClause = isSingleDay
    ? `pada tanggal ${tglMulaiStr}`
    : `terhitung mulai tanggal ${tglMulaiStr} sampai dengan ${tglSelesaiStr}`;

  // Location Clause
  let locationFormatted = "";
  if (locationClause) {
    if (locationClause.toLowerCase().startsWith("pada ") || locationClause.toLowerCase().startsWith("di ")) {
      locationFormatted = locationClause;
    } else if (isPerjalananDinas) {
      locationFormatted = `di ${locationClause}`;
    } else {
      locationFormatted = `pada ${locationClause}`;
    }
  } else {
    locationFormatted = isPerjalananDinas
      ? `di Kalimantan Timur`
      : `pada Balai KSDA Kalimantan Timur di Samarinda`;
  }

  return `Kegiatan ${shortActivity} ini dilaksanakan selama ${daysCount} (${daysTerbilang}) hari ${dateClause} ${locationFormatted}.`;
}

export function GeneralReportDialog({
  open,
  onOpenChange,
}: GeneralReportDialogProps) {
  // State for Surat Tugas Options
  const [stOptions, setStOptions] = useState<MySuratTugasOption[]>([]);
  const [loadingSTOptions, setLoadingSTOptions] = useState(false);
  const [selectedSTId, setSelectedSTId] = useState<string>("");

  // Report Form States
  const [judulLaporan, setJudulLaporan] = useState("");
  const [kotaLaporan, setKotaLaporan] = useState("Samarinda");
  const [tanggalLaporan, setTanggalLaporan] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [agendaPelaksanaan, setAgendaPelaksanaan] = useState("");
  const [dasarPelaksanaan, setDasarPelaksanaan] = useState<string[]>([
    "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam Kalimantan Timur.",
    "Pengesahan DIPA Tahun Anggaran 2026 Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: DIPA-143.04.2.693614/2026 tanggal 08 Juli 2026.",
  ]);

  const [maksudText, setMaksudText] = useState("");
  const [tujuanText, setTujuanText] = useState("");

  const [pelaksana, setPelaksana] = useState<
    Array<{ no: number; nama_lengkap: string; nip: string; jabatan: string }>
  >([]);

  const [waktuTempat, setWaktuTempat] = useState("");

  const [hasilPelaksanaan, setHasilPelaksanaan] = useState<string[]>([
    "Pada hari pertama, mendatangi lokasi penugasan resmi untuk berkoordinasi dan memverifikasi berkas.",
    "Pada hari kedua, menghadiri serta memantau penutupan pelaksanaan lelang/kegiatan secara tertib.",
  ]);

  const [dokumentasiFoto, setDokumentasiFoto] = useState<
    Array<{ url: string; caption?: string }>
  >([]);

  const [stSearch, setStSearch] = useState("");
  const [stPopoverOpen, setStPopoverOpen] = useState(false);

  // Print Mode State
  const [isPrintMode, setIsPrintMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const fetchMySuratTugas = useCallback(async () => {
    setLoadingSTOptions(true);
    try {
      const resp = await api.get("/surat-tugas/my", { params: { per_page: 50 } });
      const dataArray = resp.data?.data || resp.data || [];
      setStOptions(Array.isArray(dataArray) ? dataArray : []);
    } catch {
      toast.error("Gagal memuat daftar Surat Tugas.");
    } finally {
      setLoadingSTOptions(false);
    }
  }, []);

  // Fetch ST list on dialog open
  useEffect(() => {
    if (open) {
      fetchMySuratTugas();
    }
  }, [open, fetchMySuratTugas]);

  // Auto-populate when selecting a Surat Tugas
  const handleSelectSuratTugas = async (stId: string) => {
    setSelectedSTId(stId);
    if (!stId) return;

    try {
      const resp = await api.get(`/surat-tugas/my/${stId}`);
      const st = resp.data?.data || resp.data;
      if (!st) return;

      const rawMaksud = st.maksud_tujuan || "";

      // 1. Judul Laporan Auto (Cleaned of all trailing clauses & leading prefixes)
      setJudulLaporan(formatJudulLaporan(rawMaksud));

      // 2. Agenda Pelaksanaan Auto (First sentence clause)
      setAgendaPelaksanaan(extractAgendaPelaksanaan(rawMaksud) + ".");

      // 3. Dasar Pelaksanaan Auto (+ Item #3)
      const baseDasar = [
        "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam Kalimantan Timur.",
        "Pengesahan DIPA Tahun Anggaran 2026 Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: DIPA-143.04.2.693614/2026 tanggal 08 Juli 2026.",
      ];
      if (st.nomor_surat) {
        const stDateStr = formatDateIndo(st.tanggal_surat || st.tanggal_mulai);
        baseDasar.push(
          `Surat Tugas Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor : ${st.nomor_surat} tanggal ${stDateStr}.`
        );
      }
      setDasarPelaksanaan(baseDasar);

      // 4. Maksud & Tujuan Auto (Maksud from ST, Tujuan user input)
      setMaksudText(extractAgendaPelaksanaan(rawMaksud));
      setTujuanText(
        `memverifikasi berkas dan memantau hasil pelaksanaan ${extractShortActivity(rawMaksud)} tersebut`
      );

      // 5. Pelaksana Auto
      if (Array.isArray(st.employees) && st.employees.length > 0) {
        setPelaksana(
          st.employees.map((e: any, idx: number) => ({
            no: idx + 1,
            nama_lengkap: e.nama_lengkap || e.name || "Pegawai",
            nip: e.nip || "-",
            jabatan: e.jabatan || "Pelaksana",
          }))
        );
      }

      // 6. Waktu & Tempat Auto (Single-day vs Multi-day & Kegiatan vs Perjalanan Dinas)
      setWaktuTempat(
        formatWaktuDanTempatPelaksanaan(
          rawMaksud,
          st.tanggal_mulai,
          st.tanggal_selesai,
          st.tempat_tujuan
        )
      );

      toast.success("Data laporan berhasil diisi otomatis dari Surat Tugas!");
    } catch {
      toast.error("Gagal mengambil detail Surat Tugas.");
    }
  };

  // Handler for Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const resultUrl = uploadEvent.target?.result as string;
        if (resultUrl) {
          setDokumentasiFoto((prev) => [
            ...prev,
            { url: resultUrl, caption: file.name.split(".")[0] },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setDokumentasiFoto((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePhotoCaption = (index: number, caption: string) => {
    setDokumentasiFoto((prev) =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  };

  // Consolidated Report Data Object
  const reportData: GeneralReportData = {
    judul_laporan: judulLaporan,
    kota_laporan: kotaLaporan,
    tanggal_laporan: tanggalLaporan,
    agenda_pelaksanaan: agendaPelaksanaan,
    dasar_pelaksanaan: dasarPelaksanaan,
    maksud_tujuan: formatMaksudDanTujuan(maksudText, tujuanText),
    pelaksana: pelaksana,
    waktu_tempat_pelaksanaan: waktuTempat,
    hasil_pelaksanaan: hasilPelaksanaan,
    dokumentasi_foto: dokumentasiFoto,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl">
        {/* Dialog Header */}
        <div className="p-6 bg-slate-900 text-white rounded-t-3xl border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white">
                Buat Laporan Pelaksanaan Tugas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Isi formulir atau pilih Surat Tugas acuan untuk autofill otomatis.
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setIsPrintMode(!isPrintMode)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 shadow-sm"
            >
              {isPrintMode ? (
                <>
                  <Layers className="w-4 h-4" />
                  Mode Form Edit
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Pratinjau CETAK PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {isPrintMode ? (
          /* PRINT PREVIEW MODE */
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Pratinjau Format Resmi Laporan BKSDA Kaltim
                </span>
              </div>
              <Button
                onClick={() => handlePrint()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-md gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Cetak Dokumen Sekarang
              </Button>
            </div>

            <div className="border rounded-2xl p-6 bg-gray-50 overflow-x-auto shadow-inner">
              <div ref={printRef}>
                <GeneralReportPrint data={reportData} />
              </div>
            </div>
          </div>
        ) : (
          /* FORM EDIT MODE */
          <div className="p-6 space-y-6">
            {/* 1. PICK SURAT TUGAS ACUAN */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pilih Surat Tugas Acuan (Opsional)
                </Label>
                {loadingSTOptions && (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                )}
              </div>
              <Popover open={stPopoverOpen} onOpenChange={setStPopoverOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={stPopoverOpen}
                    className="w-full justify-between p-2.5 h-auto min-h-[44px] rounded-xl bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <span className="truncate whitespace-normal text-left line-clamp-1 flex-1 pr-2">
                      {selectedSTId
                        ? (stOptions.find(st => st.id === selectedSTId)?.nomor_surat
                            ? `${stOptions.find(st => st.id === selectedSTId)?.nomor_surat} - `
                            : "") +
                          (stOptions.find(st => st.id === selectedSTId)?.maksud_tujuan.substring(0, 60) || "") +
                          "..."
                        : "[ Tanpa Surat Tugas / Input Manual ]"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[80vw] md:w-[600px] p-0" align="start">
                  <div className="flex flex-col max-h-[350px]">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground border-0 focus-visible:ring-0 px-0 shadow-none"
                        placeholder="Cari nomor atau tujuan ST..."
                        value={stSearch}
                        onChange={(e) => setStSearch(e.target.value)}
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                      <div
                        className={cn(
                          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300",
                          selectedSTId === "" && "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold"
                        )}
                        onClick={() => {
                          handleSelectSuratTugas("");
                          setStPopoverOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedSTId === "" ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">[ Tanpa Surat Tugas / Input Manual ]</span>
                      </div>
                      {stOptions
                        .filter(st => st.nomor_surat?.toLowerCase().includes(stSearch.toLowerCase()) || st.maksud_tujuan.toLowerCase().includes(stSearch.toLowerCase()))
                        .map((st) => (
                          <div
                            key={st.id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300",
                              selectedSTId === st.id && "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold"
                            )}
                            onClick={() => {
                              handleSelectSuratTugas(st.id);
                              setStPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedSTId === st.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate text-xs">
                                {st.nomor_surat ? `${st.nomor_surat} - ` : ""}
                                {st.maksud_tujuan}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatDateIndo(st.tanggal_mulai)}</span>
                            </div>
                          </div>
                        ))}
                      {stOptions.filter(st => st.nomor_surat?.toLowerCase().includes(stSearch.toLowerCase()) || st.maksud_tujuan.toLowerCase().includes(stSearch.toLowerCase())).length === 0 && (
                        <div className="py-6 text-center text-sm text-slate-500">
                          Tidak ada Surat Tugas yang cocok.
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Memilih Surat Tugas akan otomatis mengisi Agenda, Dasar, Pelaksana, dan Waktu Pelaksanaan. Pilih &quot;Tanpa Surat Tugas&quot; jika ingin mengisi manual.
              </p>
            </div>

            {/* 2. JUDUL & TANGGAL LAPORAN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold">Judul Laporan</Label>
                <Input
                  value={judulLaporan}
                  onChange={(e) => setJudulLaporan(e.target.value)}
                  placeholder="Contoh: LAPORAN PELAKSANAAN LELANG BMN BALAI KSDA KALIMANTAN TIMUR"
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tanggal Laporan</Label>
                <Input
                  type="date"
                  value={tanggalLaporan}
                  onChange={(e) => setTanggalLaporan(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            {/* SECTION A: AGENDA PELAKSANAAN */}
            <div className="space-y-1.5 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                A. Agenda Pelaksanaan
              </Label>
              <Textarea
                rows={2}
                value={agendaPelaksanaan}
                onChange={(e) => setAgendaPelaksanaan(e.target.value)}
                placeholder="Melaksanakan Perjalanan Dinas dari Samarinda ke..."
                className="rounded-xl text-xs font-medium"
              />
            </div>

            {/* SECTION B: DASAR PELAKSANAAN */}
            <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  B. Dasar Pelaksanaan
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDasarPelaksanaan((prev) => [...prev, "Poin dasar baru..."])
                  }
                  className="text-xs text-blue-600 h-7 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Dasar
                </Button>
              </div>
              <div className="space-y-2">
                {dasarPelaksanaan.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">
                      {idx + 1}.
                    </span>
                    <Input
                      value={item}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDasarPelaksanaan((prev) =>
                          prev.map((d, i) => (i === idx ? val : d))
                        );
                      }}
                      className="rounded-xl text-xs font-medium flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setDasarPelaksanaan((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION C: MAKSUD DAN TUJUAN */}
            <div className="space-y-3 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                C. Maksud dan Tujuan
              </Label>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Maksud Kegiatan (Otomatis dari Agenda ST):
                  </Label>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {maksudText ? `Maksud kegiatan ini adalah ${maksudText}` : "-"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tujuan Kegiatan (Input Spesifik Tujuan Pelaksanaan):
                  </Label>
                  <Textarea
                    rows={2}
                    value={tujuanText}
                    onChange={(e) => setTujuanText(e.target.value)}
                    placeholder="Contoh: memverifikasi berkas kendaraan dengan KPKNL Bontang dan mengetahui pemenang hasil Lelang kendaraan tersebut."
                    className="rounded-xl text-xs font-medium"
                  />
                  
                  {/* LIVE PREVIEW BOX FOR COMBINED MAKSUD & TUJUAN */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 space-y-1.5 mt-2">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Hasil Penggabungan Maksud &amp; Tujuan (Tampilan Resmi PDF):</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed bg-white/80 dark:bg-zinc-800/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      {formatMaksudDanTujuan(maksudText, tujuanText) || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION D: PELAKSANA */}
            <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  D. Daftar Pelaksana Kegiatan
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPelaksana((prev) => [
                      ...prev,
                      {
                        no: prev.length + 1,
                        nama_lengkap: "Pegawai Baru",
                        nip: "-",
                        jabatan: "Staf",
                      },
                    ])
                  }
                  className="text-xs text-blue-600 h-7 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Pelaksana
                </Button>
              </div>
              <div className="space-y-2">
                {pelaksana.map((p, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 items-center"
                  >
                    <Input
                      value={p.nama_lengkap}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPelaksana((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, nama_lengkap: val } : item
                          )
                        );
                      }}
                      placeholder="Nama Lengkap"
                      className="rounded-lg text-xs font-semibold"
                    />
                    <Input
                      value={p.nip}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPelaksana((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, nip: val } : item
                          )
                        );
                      }}
                      placeholder="NIP"
                      className="rounded-lg text-xs font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        value={p.jabatan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPelaksana((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, jabatan: val } : item
                            )
                          );
                        }}
                        placeholder="Jabatan"
                        className="rounded-lg text-xs flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setPelaksana((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="h-8 w-8 text-red-500 hover:text-red-700 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION E: WAKTU DAN TEMPAT */}
            <div className="space-y-1.5 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                E. Waktu dan Tempat Pelaksanaan
              </Label>
              <Textarea
                rows={2}
                value={waktuTempat}
                onChange={(e) => setWaktuTempat(e.target.value)}
                placeholder="Kegiatan ini dilaksanakan selama 2 (dua) hari terhitung mulai..."
                className="rounded-xl text-xs font-medium"
              />
            </div>

            {/* SECTION F: HASIL PELAKSANAAN */}
            <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  F. Hasil Pelaksanaan (Kronologis Hari)
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setHasilPelaksanaan((prev) => [
                      ...prev,
                      "Pada hari berikutnya, melanjutkan penugasan...",
                    ])
                  }
                  className="text-xs text-blue-600 h-7 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Poin Hasil
                </Button>
              </div>
              <div className="space-y-2">
                {hasilPelaksanaan.map((h, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5 mt-2">
                      {idx + 1}.
                    </span>
                    <Textarea
                      rows={3}
                      value={h}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHasilPelaksanaan((prev) =>
                          prev.map((item, i) => (i === idx ? val : item))
                        );
                      }}
                      className="rounded-xl text-xs font-medium flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setHasilPelaksanaan((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="h-8 w-8 text-red-500 hover:text-red-700 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION G: DOKUMENTASI FOTO */}
            <div className="space-y-3 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  G. Dokumentasi Foto Lapangan
                </Label>
                <label className="cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Unggah Foto
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {dokumentasiFoto.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-800/30">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">
                    Belum ada foto dokumentasi. Klik &quot;Unggah Foto&quot; untuk menambahkan foto kegiatan.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dokumentasiFoto.map((foto, idx) => (
                    <div
                      key={idx}
                      className="p-2 border rounded-xl bg-white dark:bg-zinc-800 space-y-2 relative group"
                    >
                      <div className="w-full h-32 bg-slate-100 rounded-lg overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={foto.url}
                          alt={`Dokumentasi ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-80 hover:opacity-100 shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Input
                        value={foto.caption || ""}
                        onChange={(e) => updatePhotoCaption(idx, e.target.value)}
                        placeholder="Keterangan foto..."
                        className="rounded-lg text-[10px] h-7 font-medium"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs h-10 px-5"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => setIsPrintMode(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-md gap-2"
              >
                <Printer className="w-4 h-4" />
                Pratinjau & Cetak Laporan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
