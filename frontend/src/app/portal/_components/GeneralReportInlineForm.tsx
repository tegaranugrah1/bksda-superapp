"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Layers,
  Search,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ALLOWED_REPORT_IMAGE_MIMES,
  MAX_REPORT_IMAGE_BYTES,
  filterValidReportImageFiles,
} from "./ReportFormShared";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GeneralReportPrint, GeneralReportData } from "./GeneralReportPrint";
import { formatDateIndonesian, daysBetween, numberToWords } from "@/lib/letter-utils";

interface GeneralReportInlineFormProps {
  onBack: () => void;
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


function formatJudulLaporan(rawText: string): string {
  return "PELAKSANAAN " + extractShortActivity(rawText).toUpperCase();
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
  let cleanMaksud = (maksud || "").trim().replace(/[\.\s]+$/, "");
  let cleanTujuan = (tujuan || "").trim().replace(/[\.\s]+$/, "");

  cleanMaksud = cleanMaksud.replace(/^maksud\s+kegiatan\s+(?:ini\s+)?adalah\s+/i, "");
  cleanTujuan = cleanTujuan.replace(/^(?:dan\s+)?(?:dengan\s+)?tujuan\s+(?:untuk\s+)?/i, "");

  if (cleanMaksud && cleanTujuan) {
    return `Maksud kegiatan ini adalah ${cleanMaksud} dan dengan tujuan untuk ${cleanTujuan}.`;
  }
  if (cleanMaksud) {
    return `Maksud kegiatan ini adalah ${cleanMaksud}.`;
  }
  if (cleanTujuan) {
    return `Tujuan kegiatan ini adalah untuk ${cleanTujuan}.`;
  }
  return "";
}

function formatWaktuDanTempatPelaksanaan(
  rawMaksud: string,
  tanggalMulai: string,
  tanggalSelesai: string,
  tempatTujuan?: string
): string {
  const daysCount = daysBetween(tanggalMulai, tanggalSelesai);
  const daysTerbilang = numberToWords(daysCount);
  const tglMulaiStr = formatDateIndonesian(tanggalMulai);
  const tglSelesaiStr = formatDateIndonesian(tanggalSelesai);

  const isPerjalananDinas = /perjalanan\s+dinas/i.test(rawMaksud);
  let shortActivity = extractShortActivity(rawMaksud);

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

export function GeneralReportInlineForm({ onBack }: GeneralReportInlineFormProps) {
  // State for Surat Tugas Options
  const [stOptions, setStOptions] = useState<MySuratTugasOption[]>([]);
  const [loadingSTOptions, setLoadingSTOptions] = useState(false);
  const [selectedSTId, setSelectedSTId] = useState<string>("");
  const [stSearch, setStSearch] = useState("");
  const [stPopoverOpen, setStPopoverOpen] = useState(false);

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
    "Pada hari kedua, melaksanakan dan menuntaskan seluruh rangkaian kegiatan penugasan secara tertib.",
  ]);
  const [dokumentasiFoto, setDokumentasiFoto] = useState<
    Array<{ url: string; caption?: string }>
  >([]);

  // Cover Configuration States
  const [useCustomCover, setUseCustomCover] = useState(false);
  const [coverMode, setCoverMode] = useState<"standard" | "image" | "custom_text">("standard");
  const [customCoverImageUrl, setCustomCoverImageUrl] = useState("");
  const [customCoverFooter, setCustomCoverFooter] = useState(
    "BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR"
  );

  useEffect(() => {
    return () => {
      if (customCoverImageUrl && customCoverImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(customCoverImageUrl);
      }
    };
  }, [customCoverImageUrl]);

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_REPORT_IMAGE_MIMES.includes(file.type)) {
      toast.error("File cover harus berupa gambar (JPG, PNG, atau WEBP).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_REPORT_IMAGE_BYTES) {
      toast.error("Ukuran file cover maksimal 10MB.");
      e.target.value = "";
      return;
    }
    if (customCoverImageUrl && customCoverImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(customCoverImageUrl);
    }
    setCustomCoverImageUrl(URL.createObjectURL(file));
    toast.success("Gambar cover terpilih!");
    e.target.value = "";
  };

  // Print Mode State
  const [isPrintMode, setIsPrintMode] = useState(false);

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

  useEffect(() => {
    fetchMySuratTugas();
  }, [fetchMySuratTugas]);

  // Auto-populate when selecting a Surat Tugas
  const handleSelectSuratTugas = async (stId: string) => {
    setSelectedSTId(stId);
    if (!stId) return;

    try {
      const resp = await api.get(`/surat-tugas/my/${encodeURIComponent(stId)}`);
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
        const stDateStr = formatDateIndonesian(st.tanggal_surat || st.tanggal_mulai);
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
          st.employees.map((e: { nama_lengkap?: string; name?: string; nip?: string; jabatan?: string }, idx: number) => ({
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

  // Handler for Photo Upload (Otomatis dipaginasi maks. 6 foto per halaman saat cetak, maks 30 foto total)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = Math.max(0, 30 - dokumentasiFoto.length);
    if (remainingSlots <= 0) {
      toast.warning("Batas maksimal 30 foto dokumentasi telah tercapai.");
      e.target.value = "";
      return;
    }

    const validFiles = filterValidReportImageFiles(files);

    const filesToProcess = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      toast.warning(`Hanya ${remainingSlots} foto pertama yang ditambahkan (maks. 30 foto).`);
    }

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const rawUrl = uploadEvent.target?.result as string;
        if (!rawUrl) return;

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);

          setDokumentasiFoto((prev) => [
            ...prev,
            { url: compressedDataUrl, caption: "" },
          ]);
        };
        img.onerror = () => {
          toast.error(`Gagal memproses gambar ${file.name}. Format file tidak valid.`);
        };
        img.src = rawUrl;
      };
      reader.onerror = () => {
        toast.error(`Gagal membaca file foto ${file.name}.`);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
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
    use_custom_cover: useCustomCover,
    cover_mode: coverMode,
    custom_cover_image_url: customCoverImageUrl,
    custom_cover_title: "",
    custom_cover_author: "",
    custom_cover_footer: customCoverFooter,
  };

  return (
    <div className="w-full bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 print:border-none print:shadow-none print:rounded-none print:overflow-visible print:bg-transparent">
      {/* Header Bar */}
      <div className="p-4 sm:p-6 bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] border-b border-slate-200/70 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface)] h-10 px-3 rounded-lg gap-2 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            Kembali ke Portal
          </Button>
          <div className="h-6 w-px bg-slate-200/70 dark:bg-zinc-800 hidden sm:block" />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--ds-fg)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--ds-accent-fg)]" />
              Formulir Laporan Pelaksanaan Surat Tugas
            </h2>
            <p className="text-xs text-[var(--ds-fg-muted)]">
              Isi formulir secara interaktif atau pilih Surat Tugas acuan untuk pengisian otomatis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            onClick={() => setIsPrintMode(!isPrintMode)}
            className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs h-9 rounded-lg gap-2 shadow-xs cursor-pointer"
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
        <div className="p-6 space-y-6 print:p-0 print:m-0 print:space-y-0">
          <div className="flex items-center justify-between bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] p-4 rounded-lg print:hidden">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--ds-accent-fg)]" />
              <span className="text-xs font-bold text-[var(--ds-accent-fg)]">
                Pratinjau Format Resmi Laporan BKSDA Kaltim
              </span>
            </div>
            <Button
              onClick={handlePrint}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs h-9 rounded-lg shadow-xs gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Dokumen Sekarang
            </Button>
          </div>

          <div className="border border-slate-200/80 dark:border-zinc-800 rounded-lg p-6 bg-gray-50 overflow-x-auto print:p-0 print:border-none print:bg-transparent print:shadow-none print:m-0 print:overflow-visible">
            <GeneralReportPrint data={reportData} />
          </div>
        </div>
      ) : (
        /* FORM EDIT MODE */
        <div className="p-6 space-y-6">
          {/* 1. PICK SURAT TUGAS ACUAN */}
          <div className="p-4 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[var(--ds-fg)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                Pilih Surat Tugas Acuan (Opsional)
              </Label>
              {loadingSTOptions && (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-accent-fg)]" />
              )}
            </div>
            {(() => {
              const selectedST = selectedSTId ? stOptions.find(st => String(st.id) === String(selectedSTId)) : null;
              const needle = stSearch.toLowerCase();
              const filteredST = stOptions.filter((st) =>
                (st.nomor_surat || "").toLowerCase().includes(needle) ||
                (st.maksud_tujuan || "").toLowerCase().includes(needle)
              );
              return (
                <Popover open={stPopoverOpen} onOpenChange={setStPopoverOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={stPopoverOpen}
                      className="w-full justify-between p-3 h-auto min-h-11 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-accent-soft-border)] text-xs font-semibold text-[var(--ds-fg)] cursor-pointer"
                    >
                      <span className="truncate whitespace-normal text-left line-clamp-1 flex-1 pr-2">
                        {selectedST
                          ? `${selectedST.nomor_surat ? `${selectedST.nomor_surat} - ` : ""}${((selectedST.maksud_tujuan || "").substring(0, 60) || "")}...`
                          : "[ Tanpa Surat Tugas / Input Manual ]"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent data-module="portal" className="w-[80vw] md:w-150 p-0 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] shadow-lg" align="start">
                    <div className="flex flex-col max-h-88">
                      <div className="flex items-center border-b border-slate-200/70 dark:border-zinc-800 px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground border-0 focus-visible:ring-0 px-0 shadow-none"
                          placeholder="Cari nomor atau tujuan ST..."
                          value={stSearch}
                          onChange={(e) => setStSearch(e.target.value)}
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 p-2">
                        <div
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-accent-fg)]",
                            selectedSTId === "" && "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-bold"
                          )}
                          onClick={() => {
                            handleSelectSuratTugas("");
                            setStPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedSTId === "" ? "opacity-100" : "opacity-0")} />
                          <span className="truncate">[ Tanpa Surat Tugas / Input Manual ]</span>
                        </div>
                        {filteredST.map((st) => (
                          <div
                            key={st.id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-accent-fg)]",
                              String(selectedSTId) === String(st.id) && "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-bold"
                            )}
                            onClick={() => {
                              handleSelectSuratTugas(String(st.id));
                              setStPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", String(selectedSTId) === String(st.id) ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate text-xs">
                                {st.nomor_surat ? `${st.nomor_surat} - ` : ""}{st.maksud_tujuan}
                              </span>
                              {st.tanggal_mulai && (
                                <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
                                  {formatDateIndonesian(st.tanggal_mulai)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {filteredST.length === 0 && (
                          <div className="py-6 text-center text-sm text-[var(--ds-fg-muted)]">
                            Tidak ada Surat Tugas yang cocok.
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })()}
            <p className="text-xs text-[var(--ds-fg-muted)]">
              Memilih Surat Tugas akan otomatis mengisi Agenda, Dasar, Pelaksana, dan Waktu Pelaksanaan. Pilih &quot;Tanpa Surat Tugas&quot; jika ingin mengisi manual.
            </p>
          </div>

          {/* 1B. PENGATURAN COVER LAPORAN (COVER MANUAL / STANDAR) */}
          <div className="p-4 bg-[var(--ds-surface-muted)] rounded-lg border border-slate-200/80 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[var(--ds-fg)] font-bold text-xs">
                <Layers className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                <span>Pengaturan Cover Laporan (Desain Halaman 1)</span>
              </div>
              <span className="text-xs bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] px-3 py-1 rounded-full font-bold">
                {coverMode === "standard" ? "Cover Standar BKSDA" : coverMode === "image" ? "Upload Image Cover Manual" : "Custom Teks Cover Manual"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Mode 1: Standar BKSDA */}
              <button
                type="button"
                onClick={() => {
                  setUseCustomCover(false);
                  setCoverMode("standard");
                  setCustomCoverFooter("BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR");
                  setKotaLaporan("Samarinda");
                }}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors space-y-1 cursor-pointer",
                  coverMode === "standard"
                    ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] border-[var(--ds-accent-solid)] shadow-xs font-bold"
                    : "bg-[var(--ds-surface)] text-[var(--ds-fg)] border-slate-200/80 dark:border-zinc-800 hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                <p className="text-xs font-bold">1. Cover Standar BKSDA</p>
                <p className={cn("text-xs", coverMode === "standard" ? "opacity-90" : "text-[var(--ds-fg-muted)]")}>
                  Format resmi Balai KSDA Kaltim (Otomatis)
                </p>
              </button>

              {/* Mode 2: Upload Gambar Cover Manual */}
              <button
                type="button"
                onClick={() => {
                  setUseCustomCover(true);
                  setCoverMode("image");
                }}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors space-y-1 cursor-pointer",
                  coverMode === "image"
                    ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] border-[var(--ds-accent-solid)] shadow-xs font-bold"
                    : "bg-[var(--ds-surface)] text-[var(--ds-fg)] border-slate-200/80 dark:border-zinc-800 hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                <p className="text-xs font-bold">2. Upload Gambar Cover Manual</p>
                <p className={cn("text-xs", coverMode === "image" ? "opacity-90" : "text-[var(--ds-fg-muted)]")}>
                  Gunakan gambar / desain cover milik sendiri
                </p>
              </button>

              {/* Mode 3: Custom Teks Cover */}
              <button
                type="button"
                onClick={() => {
                  setUseCustomCover(true);
                  setCoverMode("custom_text");
                }}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors space-y-1 cursor-pointer",
                  coverMode === "custom_text"
                    ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] border-[var(--ds-accent-solid)] shadow-xs font-bold"
                    : "bg-[var(--ds-surface)] text-[var(--ds-fg)] border-slate-200/80 dark:border-zinc-800 hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                <p className="text-xs font-bold">3. Custom Sub-Unit Cover</p>
                <p className={cn("text-xs", coverMode === "custom_text" ? "opacity-90" : "text-[var(--ds-fg-muted)]")}>
                  Ubah nama instansi / unit di footer cover
                </p>
              </button>
            </div>

            {/* Detail inputs for Mode 2: Upload Image Cover */}
            {coverMode === "image" && (
              <div className="p-4 bg-[var(--ds-surface)] rounded-lg border border-slate-200/80 dark:border-zinc-800 space-y-3">
                <Label className="text-xs font-bold text-[var(--ds-fg)]">
                  Upload File Gambar Cover Halaman 1 (JPG / PNG / WEBP)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    className="text-xs rounded-lg"
                  />
                </div>
                {customCoverImageUrl && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-16 h-20 relative rounded-lg border border-slate-200/80 dark:border-zinc-800 overflow-hidden bg-[var(--ds-surface-muted)] shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={customCoverImageUrl}
                        alt="Pratinjau Cover"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-[var(--ds-accent-fg)]">Cover Manual Berhasil Diunggah</p>
                      <button
                        type="button"
                        onClick={() => setCustomCoverImageUrl("")}
                        className="text-xs text-[var(--ds-status-danger-fg)] hover:underline font-semibold cursor-pointer"
                      >
                        Hapus Cover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detail inputs for Mode 3: Custom Instansi / Sub-Unit Cover */}
            {coverMode === "custom_text" && (
              <div className="p-4 bg-[var(--ds-surface)] rounded-lg border border-slate-200/80 dark:border-zinc-800 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Nama Instansi / Sub-Unit Kerja (Footer Cover)</Label>
                    <Input
                      type="text"
                      placeholder="Contoh: SEKSI KSDA WILAYAH II TENGGARONG"
                      value={customCoverFooter}
                      onChange={(e) => setCustomCoverFooter(e.target.value)}
                      className="text-xs rounded-lg font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Kota Penerbitan Laporan (Footer Cover)</Label>
                    <Input
                      type="text"
                      placeholder="Contoh: Samarinda / Tenggarong / Berau"
                      value={kotaLaporan}
                      onChange={(e) => setKotaLaporan(e.target.value)}
                      className="text-xs rounded-lg font-semibold"
                    />
                  </div>
                </div>
                <p className="text-xs text-[var(--ds-fg-muted)]">
                  Judul cover dan daftar penyusun otomatis diambil dari Judul Laporan & Daftar Pelaksana Kegiatan.
                </p>
              </div>
            )}
          </div>

          {/* 2. JUDUL, KOTA & TANGGAL LAPORAN */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold">Judul Laporan</Label>
              <Input
                value={judulLaporan}
                onChange={(e) => setJudulLaporan(e.target.value)}
                placeholder="Contoh: PELAKSANAAN INVENTARISASI BMN DI SEKSI KSDA WILAYAH I BERAU"
                className="rounded-lg text-xs font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Kota Penerbitan</Label>
              <Input
                type="text"
                value={kotaLaporan}
                onChange={(e) => setKotaLaporan(e.target.value)}
                placeholder="Samarinda"
                className="rounded-lg text-xs font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Tanggal Laporan</Label>
              <Input
                type="date"
                value={tanggalLaporan}
                onChange={(e) => setTanggalLaporan(e.target.value)}
                className="rounded-lg text-xs font-semibold tabular-nums"
              />
            </div>
          </div>

          {/* SECTION A: AGENDA PELAKSANAAN */}
          <div className="space-y-2 border-t border-slate-200/70 dark:border-zinc-800 pt-4">
            <Label className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">
              A. Agenda Pelaksanaan
            </Label>
            <Textarea
              rows={2}
              value={agendaPelaksanaan}
              onChange={(e) => setAgendaPelaksanaan(e.target.value)}
              placeholder="Melaksanakan Perjalanan Dinas dari Samarinda ke..."
              className="rounded-lg text-xs font-medium"
            />
          </div>

          {/* SECTION B: DASAR PELAKSANAAN */}
          <div className="space-y-2 border-t border-slate-200/70 dark:border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">
                B. Dasar Pelaksanaan
              </Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDasarPelaksanaan((prev) => [...prev, "Poin dasar baru..."])
                }
                className="text-xs text-[var(--ds-status-info-fg)] h-8 gap-1 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Dasar
              </Button>
            </div>
            <div className="space-y-2">
              {dasarPelaksanaan.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--ds-fg-muted)] w-5 tabular-nums">
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
                    className="rounded-lg text-xs font-medium flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setDasarPelaksanaan((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="h-8 w-8 rounded-lg text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION C: MAKSUD DAN TUJUAN */}
          <div className="space-y-3 border-t border-slate-200/70 dark:border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">
                C. Maksud dan Tujuan
              </Label>
              {selectedSTId ? (
                <span className="text-xs bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] font-bold px-3 py-1 rounded-full">
                  Otomatis dari ST (Dapat Disesuaikan)
                </span>
              ) : (
                <span className="text-xs bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] font-bold px-3 py-1 rounded-full">
                  Mode Input Manual
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--ds-fg)]">
                  Maksud Kegiatan {selectedSTId ? "(Otomatis dari ST)" : "(Input Manual)"}:
                </Label>
                <Textarea
                  rows={2}
                  value={maksudText}
                  onChange={(e) => setMaksudText(e.target.value)}
                  placeholder="Contoh: Mengantar peralatan kebakaran hutan berupa 1 unit mobil tangki air ke CA Teluk Adang..."
                  className="rounded-lg text-xs font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--ds-fg)]">
                  Tujuan Kegiatan (Input Spesifik Tujuan Pelaksanaan):
                </Label>
                <Textarea
                  rows={2}
                  value={tujuanText}
                  onChange={(e) => setTujuanText(e.target.value)}
                  placeholder="Contoh: memverifikasi berkas kendaraan dengan KPKNL Bontang dan mengetahui pemenang hasil Lelang kendaraan tersebut."
                  className="rounded-lg text-xs font-medium"
                />

                {/* LIVE PREVIEW BOX FOR COMBINED MAKSUD & TUJUAN */}
                <div className="p-4 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-[var(--ds-accent-fg)] font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Hasil Penggabungan Maksud &amp; Tujuan (Tampilan Resmi PDF):</span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--ds-fg)] leading-relaxed bg-[var(--ds-surface)] p-3 rounded-lg border border-[var(--ds-accent-soft-border)]">
                    {formatMaksudDanTujuan(maksudText, tujuanText) || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION D: PELAKSANA */}
          <div className="space-y-2 border-t border-slate-200/70 dark:border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">
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
                className="text-xs text-[var(--ds-status-info-fg)] h-8 gap-1 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Pelaksana
              </Button>
            </div>
            <div className="space-y-2">
              {pelaksana.map((p, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 items-center"
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
                    className="rounded-lg text-xs font-mono tabular-nums"
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
                      className="h-8 w-8 rounded-lg text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION E: WAKTU DAN TEMPAT */}
          <div className="space-y-2 border-t border-slate-200/70 dark:border-zinc-800 pt-4">
            <Label className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">
              E. Waktu dan Tempat Pelaksanaan
            </Label>
            <Textarea
              rows={2}
              value={waktuTempat}
              onChange={(e) => setWaktuTempat(e.target.value)}
              placeholder="Kegiatan ini dilaksanakan selama 2 (dua) hari terhitung mulai..."
              className="rounded-lg text-xs font-medium"
            />
          </div>

          {/* SECTION F: HASIL PELAKSANAAN */}
          <div className="space-y-2 border-t border-slate-200/70 dark:border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">
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
                className="text-xs text-[var(--ds-status-info-fg)] h-8 gap-1 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Poin Hasil
              </Button>
            </div>
            <div className="space-y-2">
              {hasilPelaksanaan.map((h, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-[var(--ds-fg-muted)] w-5 mt-2 tabular-nums">
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
                    className="rounded-lg text-xs font-medium flex-1"
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
                    className="h-8 w-8 rounded-lg text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] mt-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION G: DOKUMENTASI FOTO */}
          <div className="space-y-3 border-t border-slate-200/70 dark:border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                  G. Dokumentasi Foto Lapangan
                </Label>
                <span className="text-xs bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] font-bold px-3 py-1 rounded-full tabular-nums">
                  {dokumentasiFoto.length} Foto (Maks. 6 / Halaman Cetak)
                </span>
              </div>
              <label className="cursor-pointer bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] font-bold text-xs px-3 py-2 rounded-lg hover:bg-[var(--ds-surface-muted)] transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />
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
              <div className="p-6 text-center border-2 border-dashed border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface-muted)]">
                <ImageIcon className="w-8 h-8 text-[var(--ds-fg-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--ds-fg-muted)] font-medium">
                  Belum ada foto dokumentasi. Klik &quot;Unggah Foto&quot; untuk menambahkan foto kegiatan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {dokumentasiFoto.map((foto, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface)] space-y-2 relative group"
                  >
                    <div className="w-full h-32 bg-[var(--ds-surface-muted)] rounded-lg overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={foto.url}
                        alt={`Dokumentasi ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-[var(--ds-danger-solid)] text-white rounded-lg opacity-80 hover:opacity-100 shadow-xs cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      value={foto.caption || ""}
                      onChange={(e) => updatePhotoCaption(idx, e.target.value)}
                      placeholder="Keterangan foto..."
                      className="rounded-lg text-xs h-8 font-medium"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-4 border-t border-slate-200/70 dark:border-zinc-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="rounded-lg text-xs h-10 px-5 cursor-pointer"
            >
              Kembali
            </Button>
            <Button
              type="button"
              onClick={() => setIsPrintMode(true)}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs h-10 px-6 rounded-lg shadow-xs gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Pratinjau & Cetak Laporan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
