"use client";

import React, { useState, useEffect, Suspense, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Printer,
  RotateCcw,
  Eraser,
  Send,
  Plus,
  Trash2,
  Bookmark,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  ListOrdered,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  UserRound,
  Users,
  ClipboardPaste,
  FileCheck,
  Download,
  FileDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatNipLabel } from "@/lib/letter-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  SuratDinasDocument,
  SuratDinasData,
  PersonItem,
  TemplateType,
  getDefaultDataForTemplate,
  getDefaultNomorForTemplate,
  getDefaultNomorPrefix,
  handlePrintSuratDinas,
  getTodayIndoDate,
  formatIsoDateToIndo,
  parseYthList,
  formatYthList,
  detectPointLevel,
  parseRawDocumentText,
  getNextMarkerForSection,
  reindexParagraphMarkers,
} from "../../_components/SuratDinasDocument";
import { TemplatePickerModal, ALL_TEMPLATES } from "../../_components/TemplatePickerModal";
import { exportSuratDinasWord, exportSuratDinasPdf } from "../../_lib/export-surat-dinas";

const LEVEL_SWITCH_CONTROLS: {
  level: "num" | "letter" | "roman" | "bracket" | "plain";
  label: string;
  title: string;
  isActive: (lvl: number, text: string) => boolean;
  activeClass: string;
  hoverClass: string;
}[] = [
  {
    level: "num",
    label: "1.",
    title: "Jadikan Poin 1.",
    isActive: (lvl) => lvl === 1,
    activeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] font-bold",
    hoverClass: "hover:border-[var(--ds-accent-soft-border)]",
  },
  {
    level: "letter",
    label: "a.",
    title: "Jadikan Sub-Poin a.",
    isActive: (lvl) => lvl === 2,
    activeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold",
    hoverClass: "hover:border-amber-300 dark:hover:border-amber-700",
  },
  {
    level: "roman",
    label: "i.",
    title: "Jadikan Romawi i.",
    isActive: (lvl, text) => lvl === 3 && /^(?:i{1,3}|iv|v)\./i.test(text.trim()),
    activeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold",
    hoverClass: "hover:border-amber-300 dark:hover:border-amber-700",
  },
  {
    level: "bracket",
    label: "1)",
    title: "Jadikan Kurung 1)",
    isActive: (lvl, text) => lvl === 3 && /^[0-9]+\)/.test(text.trim()),
    activeClass: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold",
    hoverClass: "hover:border-blue-300 dark:hover:border-blue-700",
  },
  {
    level: "plain",
    label: "Teks",
    title: "Jadikan Teks Biasa (Hapus Prefix)",
    isActive: (lvl) => lvl === 0,
    activeClass: "bg-zinc-200 text-zinc-800 border-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-600 font-bold",
    hoverClass: "hover:border-zinc-400 dark:hover:border-zinc-500",
  },
];

interface PartySelectorBlockProps {
  label: string;
  party?: PersonItem;
  onChange: (updated: PersonItem) => void;
  employeeOptions?: any[];
  showAddress?: boolean;
}

function PartySelectorBlock({
  label,
  party = { nama: "", nip: "", jabatan: "", partyType: "internal", idType: "NIP" },
  onChange,
  employeeOptions,
  showAddress = false,
}: PartySelectorBlockProps) {
  const currentPartyType = party?.partyType || (party?.idType === "NIK" ? "external" : "internal");

  const handleTypeChange = (type: "internal" | "external") => {
    onChange({
      ...(party || {} as PersonItem),
      partyType: type,
      idType: type === "external" ? "NIK" : "NIP",
    });
  };

  const handleSelectEmployee = (empId: string) => {
    if (!empId) return;
    const emp = employeeOptions?.find((e: any) => String(e.id) === String(empId));
    if (emp) {
      onChange({
        ...(party || {} as PersonItem),
        nama: emp.nama_lengkap || emp.name || emp.nama || "",
        nip: emp.nip || "",
        jabatan: emp.jabatan || emp.position || "",
        pangkatGol: emp.pangkat_golongan || emp.pangkat || party?.pangkatGol || "",
        alamat: party?.alamat || "Samarinda",
        partyType: "internal",
        idType: "NIP",
      });
    }
  };

  return (
    <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800 p-3 bg-[var(--ds-surface-muted)] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--ds-fg)]">
          <UserRound className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
          {label}
        </div>
        <div className="flex rounded-lg border border-slate-200/80 dark:border-zinc-800 p-1 bg-[var(--ds-surface)]">
          <button
            type="button"
            onClick={() => handleTypeChange("internal")}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              currentPartyType === "internal"
                ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
            }`}
          >
            Pegawai (NIP)
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("external")}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              currentPartyType === "external"
                ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
            }`}
          >
            Pihak Luar (NIK)
          </button>
        </div>
      </div>

      {currentPartyType === "internal" && (
        <div>
          <select
            onChange={(e) => handleSelectEmployee(e.target.value)}
            defaultValue=""
            className="w-full text-xs rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-2 text-[var(--ds-fg)]"
          >
            <option value="">-- Pilih dari Database Pegawai --</option>
            {employeeOptions?.map((emp: any) => {
              const empName = emp.nama_lengkap || emp.name || emp.nama || "Tanpa Nama";
              const empPos = emp.jabatan || emp.position || "";
              const empNip = emp.nip ? `(${formatNipLabel(emp, true)} ${emp.nip})` : "";
              return (
                <option key={emp.id} value={emp.id}>
                  {empName}{empPos ? ` — ${empPos}` : ""}{empNip ? ` ${empNip}` : ""}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Input
          value={party?.nama || ""}
          onChange={(e) => onChange({ ...(party || {} as PersonItem), nama: e.target.value })}
          placeholder="Nama Lengkap"
          className="h-8 text-xs bg-[var(--ds-surface)] rounded-lg"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={party?.nip || ""}
            onChange={(e) => onChange({ ...(party || {} as PersonItem), nip: e.target.value })}
            placeholder={currentPartyType === "external" ? "NIK (16 digit)" : "NIP (18 digit)"}
            className="h-8 text-xs bg-[var(--ds-surface)] font-mono rounded-lg"
          />
          <Input
            value={party?.jabatan || ""}
            onChange={(e) => onChange({ ...(party || {} as PersonItem), jabatan: e.target.value })}
            placeholder={currentPartyType === "external" ? "Jabatan / Instansi" : "Jabatan Kedinasan"}
            className="h-8 text-xs bg-[var(--ds-surface)] rounded-lg"
          />
        </div>
        {showAddress && (
          <Input
            value={party?.alamat || ""}
            onChange={(e) => onChange({ ...(party || {} as PersonItem), alamat: e.target.value })}
            placeholder="Alamat Domisili / Instansi"
            className="h-8 text-xs bg-[var(--ds-surface)] rounded-lg"
          />
        )}
      </div>
    </div>
  );
}

const COMMON_YTH_PRESETS = [
  "Kepala Seksi KSDA Wilayah I Berau",
  "Kepala Seksi KSDA Wilayah II Tenggarong",
  "Kepala Seksi KSDA Wilayah III Balikpapan",
  "Kepala Subbagian Tata Usaha",
  "Kepala Balai KSDA Kalimantan Timur",
];

const SAMPLE_SIMATA_BKN_TEXT = `Menindaklanjuti Nota Dinas Sekretaris Direktorat Jenderal KSDAE Nomor: ND.1148/SKSDAE/KSDMOTL/PEG.05.02/B/06/2026 tanggal 18 Juni 2026 Hal seperti pokok surat di atas, disampaikan hal-hal sebagai berikut :
1. Sesuai Keputusan Kepala BKN Nomor 411 Tahun 2025, Kementerian Kehutanan berkomitmen untuk menggunakan Simata BKN (Sistem Informasi Manajemen Talenta BKN) pada tahun 2026, untuk itu perlu dilakukan percepatan kesediaan data yang diperlukan dalam proses talent pool SIMATA. Adapun parameter dan bobot penilaian manajemen talenta sesuai Keputusan Kepala BKN Nomor 411 Tahun 2025 terdiri dari:
a. Kinerja (sumbu Y), antara lain:
i. Kinerja utama, dengan data pendukung berupa penilaian kinerja (hasil evaluasi SKP dan perilaku kerja);
ii. Kinerja penguat, dengan data pendukung berupa sertifikat penghargaan, keputusan penugasan pegawai dalam tim kerja, dan hasil umpan balik kinerja 360 derajat.
b. Potensial (sumbu X), antara lain:
i. Kompetensi, dengan data pendukung berupa hasil penilaian kompetensi, riwayat pengembangan kompetensi, dan riwayat pengalaman jabatan;
ii. Potensi, dengan data pendukung berupa hasil penilaian potensi;
iii. Kualifikasi, dengan data pendukung berupa tingkat pendidikan formal terakhir dan kesesuaian bidang ilmu;
iv. Integritas dan moralitas, dengan data pendukung berupa riwayat hukuman disiplin.
2. Pemenuhan parameter penilaian kompetensi dan potensi sebagaimana sumbu Y dilakukan melalui kegiatan CACT atau ProASN dan Pemenuhan data umpan balik kinerja 360 derajat telah dilakukan melalui Simpeg Kementerian Kehutanan
3. Data pendukung sebagaimana poin 1 berupa:
a. Penilaian Kinerja diunggah melalui SIMPEG;
b. Penghargaan diunggah melalui MyASN ataupun SIASN BKN;
c. Keputusan/surat tugas terkait penugasan tim kerja diunggah melalui SIMPEG Kementerian Kehutanan untuk selanjutnya dilakukan validasi dan dipadankan pada Simata BKN;
d. Penilaian umpan balik 360 derajat yang telah dilakukan akan dilakukan pemadanan pada Simata BKN secara bertahap;
e. Riwayat pengembangan kompetensi berupa sertifikat pelatihan/sertifikasi/ diklat fungsional diunggah melalui MyASN ataupun SIASN BKN;
f. Riwayat pengalaman jabatan berupa surat tugas sebagai pelaksana harian/pelaksana tugas diunggah melalui Simpeg Kementerian Kehutanan dan dilakukan pemadanan data melalui API dengan SIASN BKN;
g. Riwayat pendidikan formal diunggah melalui SIMPEG.
4. Sehubungan dengan hal tersebut, agar Saudara(i) menyampaikan kepada seluruh ASN diwilayah kerja masing-masing untuk :
a. Mengunggah dan/atau memperbarui data-data sebagaimana Poin 3 di atas, berupa:
1) Riwayat penilaian SKP dan perilaku kerja;
2) Riwayat pemberian penghargaan ASN selama lima (5) tahun terakhir;
3) Riwayat penugasan dalam tim kerja selama kurun waktu dua (2) tahun terakhir;
4) Riwayat pelatihan dan pengembangan kompetensi dibuktikan dengan sertifikat kepesertaan dan/atau sertifikat kompetensi selama tiga (3) tahun terakhir;
5) Riwayat Pelaksana Tugas (Plt.), Pelaksana Harian (Plh.), dan Penjabat (Pj.);
6) Riwayat pendidikan formal yang telah ditetapkan pencantuman gelarnya;
7) Riwayat keputusan pengenaan sanksi disiplin selama lima tahun terakhir.
b. ASN yang belum melakukan penilaian 360 derajat agar segera melakukan penilaian 360 derajat.
5. Batas waktu pengisian data di atas sampai dengan tanggal 31 Juli 2026 pukul 16.30 WIB.
Demikian kami sampaikan, atas perhatiannya diucapkan terima kasih`;

function getComputedTujuan(tpl: TemplateType, d: SuratDinasData): string {
  switch (tpl) {
    case "nota_dinas":
    case "memorandum":
      return `Yth. ${d.yth || "Pejabat Terkait"} (Dari: ${d.dari || "-"})`;
    case "undangan":
      return `${d.tujuanKepada || "Undangan Rapat"} (di Tempat)`;
    case "surat_keterangan":
    case "surat_pernyataan":
    case "surat_izin":
      return `Keterangan: ${d.pegawaiDiterangkan?.nama || "Pegawai"}`;
    case "surat_izin_cuti":
      return `Izin Cuti: ${d.pegawai?.nama || d.pegawaiDiterangkan?.nama || "Pegawai"}`;
    case "berita_acara":
      return `Pihak II: ${d.pihakKedua?.nama || "Pihak Kedua"}`;
    case "surat_kuasa":
      return `Penerima Kuasa: ${d.penerimaKuasa?.nama || "Pihak Penerima"}`;
    case "surat_panggilan":
      return `Dipanggil: ${d.pegawaiDiterangkan?.nama || "Pegawai"}`;
    case "surat_pengantar":
      return `${d.tujuanKepada || "Penerima Berkas"}`;
    case "perjanjian":
      return `Mitra: ${d.pihakKedua?.nama || "Pihak Kedua"}`;
    case "piagam":
    case "sertifikat":
      return `Penerima: ${d.diberikanKepada || "Penerima Penghargaan"}`;
    case "pengumuman":
    case "surat_edaran":
    case "instruksi":
    case "keputusan":
      return "Seluruh Pegawai / Publik (Terbuka)";
    default:
      return `${d.tujuanKepada || ""}${d.tujuanDi ? ` di ${d.tujuanDi}` : ""}`;
  }
}

function GenerateSuratDinasContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const templateParam = (searchParams.get("template") as TemplateType) || "surat_dinas";
  const queryClient = useQueryClient();

  const [data, setData] = useState<SuratDinasData>(() => {
    return getDefaultDataForTemplate(templateParam);
  });

  const deferredData = useDeferredValue(data);
  const activeTemplate = data.templateType || templateParam || "surat_dinas";

  const [editingSuratKeluarId, setEditingSuratKeluarId] = useState<string | null>(idParam);
  const [editingSuratKeluarStatus, setEditingSuratKeluarStatus] = useState<string>("terdaftar");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showManualNomor, setShowManualNomor] = useState(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [smartPasteText, setSmartPasteText] = useState("");
  const [isExporting, setIsExporting] = useState<"word" | "pdf" | null>(null);

  const handleExportWord = async () => {
    try {
      setIsExporting("word");
      toast.loading("Menyiapkan dokumen Word...", { id: "export-dinas-doc" });
      await exportSuratDinasWord(data.nomor || "", activeTemplate, data.perihal || "");
      toast.success("Dokumen Word (.doc) berhasil diunduh!", { id: "export-dinas-doc" });
    } catch (err) {
      console.error("Gagal mengekspor dokumen Word:", err);
      toast.error("Gagal mengunduh dokumen Word. Silakan coba kembali.", { id: "export-dinas-doc" });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting("pdf");
      toast.loading("Menyiapkan berkas fisik PDF...", { id: "export-dinas-pdf" });
      await exportSuratDinasPdf(data.nomor || "", activeTemplate, data.perihal || "");
      toast.success("Berkas PDF (.pdf) berhasil diunduh!", { id: "export-dinas-pdf" });
    } catch (err) {
      console.error("Gagal mengekspor berkas PDF:", err);
      toast.error("Gagal mengunduh berkas PDF. Silakan gunakan opsi Cetak.", { id: "export-dinas-pdf" });
    } finally {
      setIsExporting(null);
    }
  };

  // Helper to extract month suffix (MM/YYYY)
  const currentMonthSuffix = useMemo(() => {
    const isoDate = parseIndoDateToIso(data.kotaTanggal);
    if (isoDate) {
      const parts = isoDate.split("-");
      if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
    }
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }, [data.kotaTanggal]);

  const isAutoNomorNaskah = Boolean(
    data.nomor && (data.nomor === "${nomor_naskah}" || data.nomor.includes("${nomor_naskah}"))
  );

  // Memoized parsed nomor components: [nomorUrut, kodeKlasifikasi, suffix]
  const nomorSegments = useMemo(() => {
    const raw = data.nomor ?? "";
    const match = raw.match(/^([^/]*)\/K\.18\/TU\/([^/]*)(?:\/B\/|\/)(\d{1,2}\/\d{4})$/);
    if (match) {
      return {
        nomorUrut: match[1],
        kodeKlasifikasi: match[2],
        suffix: match[3],
      };
    }
    const parts = raw.split("/");
    const defaultPrefix = getDefaultNomorPrefix(activeTemplate);
    const hasPlaceholder = parts[0]?.includes("${");
    return {
      nomorUrut: hasPlaceholder || !parts[0] ? defaultPrefix : parts[0],
      kodeKlasifikasi: parts[3] ?? "KSA.01.05",
      suffix: currentMonthSuffix,
    };
  }, [data.nomor, activeTemplate, currentMonthSuffix]);

  const handleUpdateNomorUrut = (val: string) => {
    updateField("nomor", `${val}/K.18/TU/${nomorSegments.kodeKlasifikasi}/B/${currentMonthSuffix}`);
  };

  const handleUpdateKlasifikasi = (val: string) => {
    updateField("nomor", `${nomorSegments.nomorUrut}/K.18/TU/${val}/B/${currentMonthSuffix}`);
  };

  // Fetch employee options for signatories
  const { data: employeeOptions } = useQuery({
    queryKey: ["employees-select-options"],
    queryFn: async () => {
      try {
        const res = await api.get("/kepegawaian/employees/select");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Auto-load existing Surat Keluar if ?id=... is present
  useEffect(() => {
    if (!idParam) return;
    async function loadExistingSuratKeluar() {
      try {
        const res = await api.get(`/surat/surat-keluar/${idParam}`);
        const item = res.data?.data;
        if (item) {
          setEditingSuratKeluarId(String(item.id));
          setEditingSuratKeluarStatus(item.status || "terdaftar");
          if (item.document_payload) {
            const loadedTemplate = (item.document_payload.templateType || item.template_type || templateParam) as TemplateType;
            const defData = getDefaultDataForTemplate(loadedTemplate);
            setData({
              ...defData,
              ...item.document_payload,
              paragraf: Array.isArray(item.document_payload.paragraf) ? item.document_payload.paragraf : (defData.paragraf || []),
              tembusan: Array.isArray(item.document_payload.tembusan) ? item.document_payload.tembusan : (defData.tembusan || []),
              ythList: Array.isArray(item.document_payload.ythList)
                ? item.document_payload.ythList
                : parseYthList(item.document_payload.yth || defData.yth),
            });
          } else {
            const loadedTemplate = (item.template_type as TemplateType) || templateParam || "surat_dinas";
            const defData = getDefaultDataForTemplate(loadedTemplate);
            setData({
              ...defData,
              nomor: item.no_surat || defData.nomor,
              sifat: item.sifat || defData.sifat,
              lampiran: item.lampiran || defData.lampiran,
              perihal: item.perihal || defData.perihal,
              tujuanKepada: item.tujuan_surat || defData.tujuanKepada,
              kotaTanggal: item.tanggal_surat ? formatIsoDateToIndo(item.tanggal_surat) : defData.kotaTanggal,
              paragraf: defData.paragraf || [],
              tembusan: defData.tembusan || [],
              ythList: defData.ythList || parseYthList(defData.yth),
            });
          }
          toast.info(`Memuat Surat Keluar: ${item.no_surat}`);
        }
      } catch (e) {
        toast.error("Gagal memuat data Surat Keluar dari server.");
      }
    }
    loadExistingSuratKeluar();
  }, [idParam]);

  const updateField = (field: keyof SuratDinasData, value: any) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "yth" && typeof value === "string") {
        next.ythList = parseYthList(value);
      }
      return next;
    });
  };

  // Switch template
  const handleSwitchTemplate = (newTpl: TemplateType) => {
    if (newTpl === activeTemplate) return;
    const newData = getDefaultDataForTemplate(newTpl);
    setData(newData);
    const newUrl = editingSuratKeluarId
      ? `/surat/keluar/dinas?id=${editingSuratKeluarId}&template=${newTpl}`
      : `/surat/keluar/dinas?template=${newTpl}`;
    window.history.replaceState(null, "", newUrl);
    toast.info(`Format dialihkan ke: ${newTpl.replace("_", " ").toUpperCase()}`);
  };

  const handleSelectEmployee = (empId: string) => {
    if (!empId) return;
    const emp = employeeOptions?.find((item: any) => String(item.id) === String(empId));
    if (!emp) return;

    const empName = emp.nama_lengkap || emp.name || emp.nama || "";
    const empPosition = emp.jabatan || emp.position || "";
    const empNip = emp.nip || "";

    setData((prev) => ({
      ...prev,
      namaPenandatangan: empName || prev.namaPenandatangan,
      nipPenandatangan: empNip || prev.nipPenandatangan,
      jabatanPenandatangan: empPosition ? `${empPosition},` : prev.jabatanPenandatangan,
    }));
    toast.success(`Pejabat penandatangan dipilih: ${empName}`);
  };

  // Ponytail unified helper: Tambah / sisipkan butir dengan auto-scroll dan auto-focus
  const handleInsertPoint = (
    type: "plain" | "num" | "letter" | "roman" | "bracket",
    atIndex?: number
  ) => {
    setData((prev) => {
      const list = [...(prev.paragraf || [])];
      let insertAt = atIndex;
      if (insertAt === undefined) {
        // Ponytail: Sisipkan di sebelum penutup jika paragraf terakhir adalah teks penutup biasa (Level 0)
        const lastItem = list[list.length - 1] || "";
        const lastLvl = detectPointLevel(lastItem);
        insertAt = lastLvl === 0 && list.length > 1 ? list.length - 1 : list.length;
      }
      const marker = type === "plain" ? "" : getNextMarkerForSection(list, insertAt, type);
      list.splice(insertAt, 0, marker);
      return { ...prev, paragraf: reindexParagraphMarkers(list) };
    });
    setTimeout(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>(".paragraf-textarea");
      const targetIdx = atIndex !== undefined ? atIndex : Math.max(0, textareas.length - 2);
      const target = textareas[targetIdx];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus();
        const len = target.value.length;
        target.setSelectionRange(len, len);
      }
    }, 60);
  };

  // Ubah Level Poin pada Baris Tertentu
  const handleChangeParagraphLevel = (index: number, targetType: "plain" | "num" | "letter" | "roman" | "bracket") => {
    setData((prev) => {
      const list = [...(prev.paragraf || [])];
      const current = list[index] || "";
      const cleaned = current
        .replace(/^(?:[0-9]+[.)]|[a-z][.)]|(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.)\s*/i, "")
        .trim();

      let prefix = "";
      if (targetType === "plain") {
        prefix = "";
      } else {
        prefix = getNextMarkerForSection(list, index, targetType);
      }

      list[index] = prefix + cleaned;
      return { ...prev, paragraf: reindexParagraphMarkers(list) };
    });
  };

  // Terapkan Salin-Tempel Teks Utuh
  const handleApplySmartPaste = (rawTextToApply?: string) => {
    const text = rawTextToApply || smartPasteText;
    if (!text.trim()) {
      toast.error("Teks naskah dinas masih kosong.");
      return;
    }
    const parsed = parseRawDocumentText(text);
    if (parsed.length === 0) {
      toast.error("Gagal memecah teks menjadi paragraf.");
      return;
    }
    setData((prev) => ({
      ...prev,
      paragraf: reindexParagraphMarkers(parsed),
    }));
    setShowSmartPaste(false);
    setSmartPasteText("");
    toast.success(`Berhasil menerapkan ${parsed.length} butir paragraf ke naskah dinas!`);
  };

  const handleRemoveParagraph = (index: number) => {
    setData((prev) => {
      const p = prev.paragraf || [];
      const updated = p.length > 1 ? p.filter((_, i) => i !== index) : p;
      return {
        ...prev,
        paragraf: reindexParagraphMarkers(updated),
      };
    });
  };

  const handleParagraphChange = (index: number, val: string) => {
    setData((prev) => ({
      ...prev,
      paragraf: (prev.paragraf || []).map((p, i) => (i === index ? val : p)),
    }));
  };

  // Surat Pengantar row management
  const handleAddPengantarRow = () => {
    setData((prev) => ({
      ...prev,
      tabelPengantar: [
        ...(prev.tabelPengantar || []),
        { no: (prev.tabelPengantar?.length || 0) + 1, naskah: "", banyaknya: "1 Berkas", keterangan: "" },
      ],
    }));
  };

  const handleRemovePengantarRow = (idx: number) => {
    setData((prev) => ({ ...prev, tabelPengantar: (prev.tabelPengantar || []).filter((_, i) => i !== idx) }));
  };

  const handlePengantarRowChange = (idx: number, field: string, val: string) => {
    setData((prev) => ({
      ...prev,
      tabelPengantar: (prev.tabelPengantar || []).map((row, i) => (i === idx ? { ...row, [field]: val } : row)),
    }));
  };

  // Tembusan management
  const handleAddTembusan = () => {
    setData((prev) => ({
      ...prev,
      tembusan: [
        ...(prev.tembusan || []),
        { id: Date.now().toString(), text: "" },
      ],
    }));
  };

  const handleRemoveTembusan = (id: string) => {
    setData((prev) => ({
      ...prev,
      tembusan: (prev.tembusan || []).filter((t) => t.id !== id),
    }));
  };

  const handleTembusanChange = (id: string, text: string) => {
    setData((prev) => ({
      ...prev,
      tembusan: (prev.tembusan || []).map((t) => (t.id === id ? { ...t, text } : t)),
    }));
  };

  // Yth. (Penerima Nota Dinas & Memorandum) management
  const currentYthList = useMemo(() => {
    if (data.ythList && data.ythList.length > 0) return data.ythList;
    return parseYthList(data.yth);
  }, [data.ythList, data.yth]);

  const handleAddYth = () => {
    const next = [...currentYthList, ""];
    setData((prev) => ({
      ...prev,
      ythList: next,
      yth: formatYthList(next),
    }));
  };

  const handleRemoveYth = (idx: number) => {
    const next = currentYthList.filter((_, i) => i !== idx);
    const finalNext = next.length > 0 ? next : [""];
    setData((prev) => ({
      ...prev,
      ythList: finalNext,
      yth: formatYthList(finalNext),
    }));
  };

  const handleYthChange = (idx: number, val: string) => {
    const next = [...currentYthList];
    next[idx] = val;
    setData((prev) => ({
      ...prev,
      ythList: next,
      yth: formatYthList(next),
    }));
  };

  const handleAppendYthPreset = (name: string) => {
    let next: string[];
    if (currentYthList.length === 1 && !currentYthList[0].trim()) {
      next = [name];
    } else if (!currentYthList.includes(name)) {
      next = [...currentYthList.filter((s) => s.trim()), name];
    } else {
      toast.info(`"${name}" sudah ada dalam daftar Yth.`);
      return;
    }
    setData((prev) => ({
      ...prev,
      ythList: next,
      yth: formatYthList(next),
    }));
  };

  // Save or update directly to Surat Keluar table
  const handleSaveSuratKeluar = async (targetStatus: "draft" | "terdaftar" = "terdaftar") => {
    if (!data.nomor) {
      toast.error("Nomor naskah dinas tidak boleh kosong.");
      return;
    }

    const computedTujuan = getComputedTujuan(activeTemplate, data);

    const computedPerihal =
      data.perihal ||
      data.judulPengumuman ||
      data.judulEdaran ||
      data.judulInstruksi ||
      data.judulKeputusan ||
      data.judulTelaah ||
      data.judulLaporan ||
      data.judulPerjanjian ||
      "Naskah Dinas BKSDA Kaltim";

    setIsRegistering(true);
    try {
      const payload = {
        no_surat: data.nomor,
        kode_klasifikasi: nomorSegments.kodeKlasifikasi || "KSA.01.05",
        tanggal_surat: parseIndoDateToIso(data.kotaTanggal) || new Date().toISOString().split("T")[0],
        tujuan_surat: computedTujuan,
        perihal: computedPerihal,
        sifat: data.sifat || "Biasa",
        lampiran: data.lampiran || "-",
        template_type: activeTemplate,
        status: targetStatus,
        document_payload: { ...data, templateType: activeTemplate },
      };

      if (editingSuratKeluarId) {
        await api.put(`/surat/surat-keluar/${editingSuratKeluarId}`, payload);
        setEditingSuratKeluarStatus(targetStatus);
        queryClient.invalidateQueries({ queryKey: ["surat-keluar"] });
        if (targetStatus === "draft") {
          toast.success(`Draf naskah "${data.nomor}" berhasil diperbarui.`);
        } else {
          toast.success(`Naskah dinas "${data.nomor}" berhasil diperbarui!`);
        }
      } else {
        const res = await api.post("/surat/surat-keluar", payload);
        const created = res.data?.data;
        if (created?.id) {
          setEditingSuratKeluarId(String(created.id));
          setEditingSuratKeluarStatus(targetStatus);
          window.history.replaceState(null, "", `/surat/keluar/dinas?id=${created.id}&template=${activeTemplate}`);
        }
        queryClient.invalidateQueries({ queryKey: ["surat-keluar"] });
        if (targetStatus === "draft") {
          toast.success(`Draf naskah "${data.nomor}" berhasil disimpan ke Daftar Surat Keluar!`);
        } else {
          toast.success(`Naskah dinas "${data.nomor}" berhasil didaftarkan ke Agenda Resmi!`);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan ke Surat Keluar.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Create new
  const handleCreateNew = () => {
    setEditingSuratKeluarId(null);
    setEditingSuratKeluarStatus("terdaftar");
    window.history.replaceState(null, "", `/surat/keluar/dinas?template=${activeTemplate}`);
    setData(getDefaultDataForTemplate(activeTemplate));
    toast.info(`Membuat ${activeTemplate.replace("_", " ")} baru.`);
  };

  // Blank form
  const handleBlankForm = () => {
    setData((prev) => ({
      ...prev,
      nomor: getDefaultNomorForTemplate(activeTemplate),
      kotaTanggal: getTodayIndoDate(),
      sifat: "Biasa",
      lampiran: "-",
      perihal: "",
      tujuanKepada: "",
      tujuanDi: "",
      yth: "",
      ythList: [""],
      dari: "",
      paragraf: [""],
      tembusan: [],
    }));
    toast.info("Form telah dikosongkan.");
  };

  // Reset template
  const handleResetTemplate = () => {
    setData(getDefaultDataForTemplate(activeTemplate));
    toast.info(`Template di-reset ke format baku ${activeTemplate.replace("_", " ").toUpperCase()}.`);
  };

  const activeTabMeta = ALL_TEMPLATES.find((t) => t.id === activeTemplate) || ALL_TEMPLATES[0];

  return (
    <div className="psr-ui w-full p-4 md:p-6 space-y-6 text-[var(--ds-fg)]">
      {/* Enterprise Header Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/surat/keluar">
              <Button
                variant="outline"
                size="sm"
                aria-label="Kembali ke Agenda Surat Keluar"
                className="kpg-secondary h-10 w-10 p-0 rounded-lg shrink-0"
                title="Kembali ke Agenda Surat Keluar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="kpg-support-icon w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
              <activeTabMeta.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
                  {editingSuratKeluarId ? `Edit ${activeTabMeta.name}` : `Buat ${activeTabMeta.name}`}
                </h1>
                {editingSuratKeluarId ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs uppercase font-semibold text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] rounded-lg">
                      Mode Edit: #{editingSuratKeluarId}
                    </Badge>
                    {editingSuratKeluarStatus === "draft" ? (
                      <Badge variant="outline" className="text-xs uppercase font-semibold text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] rounded-lg">
                        Draft
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs uppercase font-semibold text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)] rounded-lg">
                        Terdaftar
                      </Badge>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-xs uppercase font-semibold text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] rounded-lg">
                    Permen Kehutanan 1/2025 (Hal. {activeTabMeta.hal})
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                Generator naskah dinas resmi BKSDA Kalimantan Timur dengan pratinjau A4 presisi cetak.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
          {editingSuratKeluarId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNew}
              className="kpg-secondary rounded-lg text-xs gap-2"
              title="Keluar dari mode edit dan buat dokumen baru"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat Baru
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetTemplate}
            className="kpg-secondary rounded-lg text-xs gap-2"
            title="Reset ke template standar naskah ini"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Template Baku
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBlankForm}
            className="kpg-secondary rounded-lg text-xs gap-2"
            title="Kosongkan form"
          >
            <Eraser className="w-3.5 h-3.5" />
            Kosongkan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveSuratKeluar("draft")}
            disabled={isRegistering}
            className="rounded-lg text-xs gap-2 bg-[var(--ds-surface-raised)] dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/70 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 shadow-xs"
            title="Simpan sebagai draf di Daftar Surat Keluar"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {editingSuratKeluarId && editingSuratKeluarStatus === "draft" ? "Update Draf" : "Simpan Draf"}
          </Button>
          <Button
            size="sm"
            onClick={() => handleSaveSuratKeluar("terdaftar")}
            disabled={isRegistering}
            className="rounded-lg text-xs gap-2 font-semibold text-[var(--ds-accent-on-solid)] bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)]"
            title="Daftarkan resmi ke Daftar Surat Keluar"
          >
            <Send className="w-3.5 h-3.5" />
            {isRegistering ? "Menyimpan..." : editingSuratKeluarId ? "Update Naskah" : "Daftarkan Resmi"}
          </Button>
          <SuratDinasDownloadDropdown isExporting={isExporting} onPdf={handleExportPdf} onWord={handleExportWord} />

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrintSuratDinas}
            className="kpg-secondary rounded-lg text-xs gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Dokumen
          </Button>
        </div>
      </div>
      </div>

      {/* Template Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPickerModalOpen(true)}
            className="group flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] shadow-xs hover:border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-surface-muted)] transition-all text-xs cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
              <activeTabMeta.icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--ds-fg)]">
                {activeTabMeta.name}
              </span>
              <span className="text-xs font-mono text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-2 py-1 rounded-lg">
                Hal. {activeTabMeta.hal}
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--ds-accent-fg)] flex items-center gap-1 pl-2 border-l border-slate-200/70 dark:border-zinc-800">
              Ganti Format (20 Naskah)
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </span>
          </button>
        </div>

        <div className="text-xs text-[var(--ds-fg-muted)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--ds-accent-solid)] inline-block" />
          <span>Format resmi Permen Kehutanan 1/2025</span>
        </div>
      </div>

      {/* Main Split Layout: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Editor Form (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Metadata Surat */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
              1. Identitas &amp; Meta Dokumen
            </h2>

            <div className="space-y-3 text-xs">
              {/* Nomor Surat Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold text-[var(--ds-fg)]">Nomor Naskah</label>
                  <span className="font-mono text-xs font-medium text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] px-2 py-1 rounded-lg whitespace-pre">
                    {data.nomor}
                  </span>
                </div>

                {/* Toggle Switcher: Pola Nomor Baku vs Nomor Naskah (${nomor_naskah}) */}
                <div className="flex items-center p-1 bg-slate-100/80 dark:bg-zinc-950/60 rounded-lg border border-slate-200/80 dark:border-zinc-800 text-xs">
                  <button
                    type="button"
                    aria-pressed={!isAutoNomorNaskah}
                    onClick={() => {
                      const prefix = getDefaultNomorPrefix(activeTemplate);
                      const klasifikasi = nomorSegments.kodeKlasifikasi || "KSA.01.05";
                      updateField("nomor", `${prefix}/K.18/TU/${klasifikasi}/B/${currentMonthSuffix}`);
                    }}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg transition-all text-center cursor-pointer font-medium text-xs",
                      !isAutoNomorNaskah
                        ? "bg-[var(--ds-surface-raised)] text-[var(--ds-accent-fg)] font-semibold border border-slate-200/80 dark:border-zinc-800 shadow-xs"
                        : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] border border-transparent"
                    )}
                  >
                    Pola Nomor Baku
                  </button>
                  <button
                    type="button"
                    aria-pressed={isAutoNomorNaskah}
                    onClick={() => updateField("nomor", "${nomor_naskah}")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg transition-all text-center cursor-pointer font-medium text-xs",
                      isAutoNomorNaskah
                        ? "bg-[var(--ds-surface-raised)] text-[var(--ds-accent-fg)] font-semibold border border-slate-200/80 dark:border-zinc-800 shadow-xs"
                        : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] border border-transparent"
                    )}
                  >
                    Nomor Naskah (${"{nomor_naskah}"})
                  </button>
                </div>

                {isAutoNomorNaskah ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-3 h-9 transition-[border-color,box-shadow] focus-within:border-[var(--ds-accent-fg)] focus-within:ring-[3px] focus-within:ring-[var(--ds-accent-fg)]/15">
                      <span className="text-[var(--ds-fg-muted)] font-medium text-xs shrink-0 font-mono">
                        Nomor :
                      </span>
                      <input
                        data-plain="true"
                        type="text"
                        placeholder="${nomor_naskah}"
                        value={data.nomor}
                        onChange={(e) => updateField("nomor", e.target.value)}
                        className="w-full min-w-0 bg-transparent font-mono text-xs font-medium text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] outline-none focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40 p-3 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-[var(--ds-fg-muted)]">Awalan/No</label>
                          <button
                            type="button"
                            onClick={() => handleUpdateNomorUrut(getDefaultNomorPrefix(activeTemplate))}
                            className="text-xs px-1 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 hover:bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] font-mono"
                            title="Format baku"
                          >
                            {getDefaultNomorPrefix(activeTemplate)}
                          </button>
                        </div>
                        <Input
                          value={nomorSegments.nomorUrut}
                          onChange={(e) => handleUpdateNomorUrut(e.target.value)}
                          placeholder="Contoh: S.888 atau ND.102"
                          className="h-8 text-xs font-mono font-medium text-left bg-[var(--ds-surface)] border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg)] px-2 rounded-lg"
                        />
                      </div>

                      <div className="col-span-3 text-center pb-2">
                        <span className="text-xs font-mono font-normal text-[var(--ds-fg-muted)] select-none">
                          /K.18/TU/
                        </span>
                      </div>

                      <div className="col-span-3">
                        <label className="text-xs font-medium text-[var(--ds-fg-muted)] block mb-1">Klasifikasi</label>
                        <Input
                          value={nomorSegments.kodeKlasifikasi}
                          onChange={(e) => handleUpdateKlasifikasi(e.target.value)}
                          placeholder="KSA.01.05"
                          className="h-8 text-xs font-mono font-medium bg-[var(--ds-surface)] border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg)] px-2 rounded-lg"
                        />
                      </div>

                      <div className="col-span-2 text-center pb-2">
                        <span className="text-xs font-mono font-normal text-[var(--ds-fg-muted)] select-none">
                          /B/{currentMonthSuffix}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--ds-fg-muted)] pt-2 border-t border-slate-200/70 dark:border-zinc-800">
                      <span className="text-xs">
                        Pola: <span className="font-medium text-[var(--ds-fg-secondary)] font-mono">/K.18/TU/</span> ... <span className="font-medium text-[var(--ds-fg-secondary)] font-mono">/B/{currentMonthSuffix}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowManualNomor(!showManualNomor)}
                        className="text-xs text-[var(--ds-accent-fg)] hover:underline"
                      >
                        {showManualNomor ? "Tutup manual" : "Edit teks penuh"}
                      </button>
                    </div>

                    {showManualNomor && (
                      <div className="pt-1">
                        <Input
                          value={data.nomor}
                          onChange={(e) => updateField("nomor", e.target.value)}
                          placeholder="Ketik nomor surat lengkap..."
                          className="h-8 text-xs font-mono bg-[var(--ds-surface)] border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg)] rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sifat & Lampiran (Hanya untuk Surat Dinas & Undangan) */}
              {(activeTemplate === "surat_dinas" || activeTemplate === "undangan") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Sifat Naskah</label>
                    <select
                      value={data.sifat || "Biasa"}
                      onChange={(e) => updateField("sifat", e.target.value)}
                      className="w-full mt-1 text-xs rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-2 text-[var(--ds-fg)]"
                    >
                      <option value="Biasa">Biasa</option>
                      <option value="Penting">Penting</option>
                      <option value="Rahasia">Rahasia</option>
                      <option value="Segera">Segera</option>
                      <option value="Sangat Segera">Sangat Segera</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Lampiran</label>
                    <Input
                      value={data.lampiran}
                      onChange={(e) => updateField("lampiran", e.target.value)}
                      placeholder="Contoh: - atau 1 Berkas"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Lampiran Saja (Khusus Nota Dinas & Memorandum: Sifat di-hidden) */}
              {(activeTemplate === "nota_dinas" || activeTemplate === "memorandum") && (
                <div>
                  <label className="font-semibold text-[var(--ds-fg-secondary)]">Lampiran</label>
                  <Input
                    value={data.lampiran}
                    onChange={(e) => updateField("lampiran", e.target.value)}
                    placeholder="Contoh: - atau 1 Berkas"
                    className="mt-1 text-xs rounded-lg"
                  />
                </div>
              )}

              {/* Tanggal Naskah */}
              <div>
                <label className="font-semibold text-[var(--ds-fg-secondary)]">Tanggal Naskah</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="date"
                    value={parseIndoDateToIso(data.kotaTanggal)}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateField("kotaTanggal", formatIsoDateToIndo(e.target.value));
                      }
                    }}
                    className="w-36 text-xs rounded-lg shrink-0"
                  />
                  <Input
                    value={data.kotaTanggal}
                    onChange={(e) => updateField("kotaTanggal", e.target.value)}
                    placeholder="Contoh: 24 September 2026"
                    className="flex-1 text-xs rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateField("kotaTanggal", getTodayIndoDate())}
                    className="kpg-secondary text-xs h-9 px-3 rounded-lg whitespace-nowrap"
                  >
                    Hari Ini
                  </Button>
                </div>
              </div>

              {/* Perihal / Hal */}
              <div>
                <label className="font-semibold text-[var(--ds-fg-secondary)]">Perihal / Judul Ringkas</label>
                <Textarea
                  value={data.perihal}
                  onChange={(e) => updateField("perihal", e.target.value)}
                  rows={2}
                  placeholder="Isi perihal naskah dinas..."
                  className="mt-1 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Field Spesifik Template */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)] flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
              2. Data Spesifik ({activeTabMeta.name})
            </h2>

            <div className="space-y-3 text-xs">
              {/* NOTA DINAS & MEMORANDUM */}
              {(activeTemplate === "nota_dinas" || activeTemplate === "memorandum") && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-zinc-800 pb-2">
                      <label className="font-semibold text-[var(--ds-fg-secondary)] flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                        Yth. (Penerima)
                        <span className="text-xs text-[var(--ds-fg-muted)] font-normal">
                          ({currentYthList.filter((s) => s.trim()).length} penerima)
                        </span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddYth}
                        className="h-7 text-xs text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] p-1 px-3 gap-1 rounded-lg font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Penerima
                      </Button>
                    </div>

                    {/* Pilihan Cepat / Preset Button Penerima */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-[var(--ds-fg-muted)] font-medium">Pilihan cepat:</span>
                      {COMMON_YTH_PRESETS.map((preset) => {
                        const shortLabel = preset
                          .replace(/^Kepala\s+/, "")
                          .replace("Balai KSDA Kalimantan Timur", "Kepala Balai")
                          .replace("Subbagian Tata Usaha", "Kasubag TU");
                        const isAdded = currentYthList.includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleAppendYthPreset(preset)}
                            disabled={isAdded}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                              isAdded
                                ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 border-zinc-200 dark:border-zinc-800 cursor-not-allowed"
                                : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-[var(--ds-accent-soft-border)] hover:text-[var(--ds-accent-fg)]"
                            }`}
                            title={isAdded ? "Sudah ada dalam daftar Yth" : `Klik untuk menambah ${preset}`}
                          >
                            <span>+</span>
                            <span>{shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Baris Input Interaktif Tiap Penerima */}
                    <div className="space-y-2">
                      {currentYthList.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--ds-fg-muted)] w-5 text-right shrink-0">
                            {currentYthList.length > 1 ? `${idx + 1}.` : "•"}
                          </span>
                          <Input
                            value={item}
                            onChange={(e) => handleYthChange(idx, e.target.value)}
                            placeholder={
                              idx === 0
                                ? "Contoh: Kepala Seksi KSDA Wilayah I Berau"
                                : `Penerima ke-${idx + 1}...`
                            }
                            className="h-8 text-xs flex-1 rounded-lg"
                          />
                          {currentYthList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveYth(idx)}
                              className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] p-1 shrink-0 transition-colors rounded-lg hover:bg-[var(--ds-status-danger-bg)]"
                              title="Hapus penerima ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Dari (Pengirim)</label>
                    <Input
                      value={data.dari || ""}
                      onChange={(e) => updateField("dari", e.target.value)}
                      placeholder="Contoh: Kepala Subbagian Tata Usaha"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* SURAT PENGANTAR */}
              {activeTemplate === "surat_pengantar" && (
                <>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Tujuan Pengiriman (Yth.)</label>
                    <Input
                      value={data.tujuanKepada || ""}
                      onChange={(e) => updateField("tujuanKepada", e.target.value)}
                      placeholder="Contoh: Kepala Kantor Pelayanan Perbendaharaan Negara Samarinda"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--ds-fg-secondary)]">
                        Daftar Berkas Dikirim ({data.tabelPengantar?.length || 0})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddPengantarRow}
                        className="h-7 text-xs text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] gap-1 p-1 rounded-lg"
                      >
                        <Plus className="w-3 h-3" /> Tambah Baris
                      </Button>
                    </div>
                    {(data.tabelPengantar || []).map((row, rIdx) => (
                      <div key={rIdx} className="p-2 rounded-lg border border-slate-200/80 dark:border-zinc-800 space-y-2 bg-zinc-50/50 dark:bg-zinc-950/40">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">Berkas #{rIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePengantarRow(rIdx)}
                            className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <Input
                          value={row.naskah}
                          onChange={(e) => handlePengantarRowChange(rIdx, "naskah", e.target.value)}
                          placeholder="Nama naskah dinas..."
                          className="h-8 text-xs rounded-lg"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={row.banyaknya}
                            onChange={(e) => handlePengantarRowChange(rIdx, "banyaknya", e.target.value)}
                            placeholder="Banyaknya (mis: 1 Berkas)"
                            className="h-8 text-xs rounded-lg"
                          />
                          <Input
                            value={row.keterangan}
                            onChange={(e) => handlePengantarRowChange(rIdx, "keterangan", e.target.value)}
                            placeholder="Keterangan..."
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* UNDANGAN INTERNAL */}
              {activeTemplate === "undangan" && (
                <>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Yth. / Kepada</label>
                    <Input
                      value={data.tujuanKepada || ""}
                      onChange={(e) => updateField("tujuanKepada", e.target.value)}
                      placeholder="Contoh: Para Pejabat Struktural dan Kepala Seksi Wilayah"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                  <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2">
                    <span className="font-bold text-[var(--ds-fg-secondary)] block text-xs">Rincian Acara</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={data.acaraHariTanggal || ""}
                        onChange={(e) => updateField("acaraHariTanggal", e.target.value)}
                        placeholder="Hari, Tanggal"
                        className="h-8 text-xs rounded-lg"
                      />
                      <Input
                        value={data.acaraWaktu || ""}
                        onChange={(e) => updateField("acaraWaktu", e.target.value)}
                        placeholder="Waktu"
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                    <Input
                      value={data.acaraTempat || ""}
                      onChange={(e) => updateField("acaraTempat", e.target.value)}
                      placeholder="Tempat Acara"
                      className="h-8 text-xs rounded-lg"
                    />
                    <Input
                      value={data.acaraNama || ""}
                      onChange={(e) => updateField("acaraNama", e.target.value)}
                      placeholder="Nama Acara"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* SURAT KUASA */}
              {activeTemplate === "surat_kuasa" && (
                <div>
                  <label className="font-semibold text-[var(--ds-fg-secondary)]">Materi Yang Dikuasakan</label>
                  <Textarea
                    value={data.materiKuasa || ""}
                    onChange={(e) => updateField("materiKuasa", e.target.value)}
                    rows={3}
                    placeholder="Untuk mewakili..."
                    className="mt-1 text-xs rounded-lg"
                  />
                </div>
              )}

              {/* BERITA ACARA */}
              {activeTemplate === "berita_acara" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Hari & Tanggal Acara</label>
                    <Input
                      value={data.hariTanggalAcara || ""}
                      onChange={(e) => updateField("hariTanggalAcara", e.target.value)}
                      placeholder="Contoh: Kamis, 24 September 2026"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Tempat Dibuat</label>
                    <Input
                      value={data.lokasiDibuat || ""}
                      onChange={(e) => updateField("lokasiDibuat", e.target.value)}
                      placeholder="Contoh: Samarinda"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* PERJANJIAN KERJA SAMA (PKS) */}
              {activeTemplate === "perjanjian" && (
                <>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Judul Perjanjian Kerja Sama</label>
                    <Input
                      value={data.judulPerjanjian || ""}
                      onChange={(e) => updateField("judulPerjanjian", e.target.value)}
                      placeholder="PERJANJIAN KERJA SAMA ANTARA ... DENGAN ..."
                      className="mt-1 text-xs uppercase rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Hari & Tanggal Perjanjian</label>
                      <Input
                        value={data.hariTanggalAcara || ""}
                        onChange={(e) => updateField("hariTanggalAcara", e.target.value)}
                        placeholder="Contoh: Kamis, 24 September 2026"
                        className="mt-1 text-xs rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Tempat Dibuat</label>
                      <Input
                        value={data.lokasiDibuat || ""}
                        onChange={(e) => updateField("lokasiDibuat", e.target.value)}
                        placeholder="Samarinda"
                        className="mt-1 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* PIAGAM & SERTIFIKAT */}
              {(activeTemplate === "piagam" || activeTemplate === "sertifikat") && (
                <>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Diberikan Kepada</label>
                    <Input
                      value={data.diberikanKepada || ""}
                      onChange={(e) => updateField("diberikanKepada", e.target.value)}
                      placeholder="Nama Penerima / Lembaga"
                      className="mt-1 text-xs font-bold rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Atas Peran / Prestasi</label>
                    <Textarea
                      value={data.atasPeran || ""}
                      onChange={(e) => updateField("atasPeran", e.target.value)}
                      rows={3}
                      placeholder="Uraian prestasi..."
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* SURAT DINAS (DEFAULT) */}
              {activeTemplate === "surat_dinas" && (
                <>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Kepada Yth.</label>
                    <Input
                      value={data.tujuanKepada || ""}
                      onChange={(e) => updateField("tujuanKepada", e.target.value)}
                      placeholder="Contoh: Direktur PT. Hutan Lindung Kelian Lestari"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Tempat (Di -)</label>
                    <Input
                      value={data.tujuanDi || ""}
                      onChange={(e) => updateField("tujuanDi", e.target.value)}
                      placeholder="Contoh: Kutai Barat atau Samarinda"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                </>
              )}
              {/* SURAT IZIN CUTI RESMI */}
              {activeTemplate === "surat_izin_cuti" && (
                <div className="space-y-3">
                  <PartySelectorBlock
                    label="Pegawai Yang Diberikan Izin Cuti"
                    party={data.pegawai as PersonItem}
                    onChange={(p) => updateField("pegawai", p)}
                    employeeOptions={employeeOptions}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Jenis Cuti</label>
                      <Input
                        value={data.jenisCuti || ""}
                        onChange={(e) => updateField("jenisCuti", e.target.value)}
                        placeholder="Contoh: Alasan Penting / Tahunan"
                        className="mt-1 text-xs font-semibold rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Jumlah Hari</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Input
                          type="number"
                          value={data.jumlahHari ?? ""}
                          onChange={(e) => updateField("jumlahHari", Number(e.target.value))}
                          placeholder="5"
                          className="text-xs rounded-lg"
                        />
                        <Input
                          value={data.terbilangHari || ""}
                          onChange={(e) => updateField("terbilangHari", e.target.value)}
                          placeholder="lima"
                          className="text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Tanggal Mulai Cuti</label>
                      <Input
                        value={data.tanggalMulai || ""}
                        onChange={(e) => updateField("tanggalMulai", e.target.value)}
                        placeholder="Contoh: 22 Oktober 2026"
                        className="mt-1 text-xs rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Tanggal Selesai Cuti</label>
                      <Input
                        value={data.tanggalSelesai || ""}
                        onChange={(e) => updateField("tanggalSelesai", e.target.value)}
                        placeholder="Contoh: 28 Oktober 2026"
                        className="mt-1 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Satuan Kerja</label>
                    <Input
                      value={data.pegawai?.satuanKerja || (data.pegawai as any)?.unit || ""}
                      onChange={(e) =>
                        updateField("pegawai", {
                          ...(data.pegawai || {}),
                          satuanKerja: e.target.value,
                        })
                      }
                      placeholder="Balai Konservasi Sumber Daya Alam Kalimantan Timur"
                      className="mt-1 text-xs rounded-lg"
                    />
                  </div>
                  {data.jenisCuti?.toLowerCase().includes("tahunan") && (
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Akumulasi Tahun Cuti (Opsional)</label>
                      <Input
                        value={data.tahunCutiText || ""}
                        onChange={(e) => updateField("tahunCutiText", e.target.value)}
                        placeholder="Contoh: untuk tahun 2025 dan tahun 2026"
                        className="mt-1 text-xs rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Paragraf Isi */}
          {activeTemplate !== "surat_pengantar" && activeTemplate !== "surat_izin_cuti" && (
            <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 space-y-3 shadow-xs">
              {/* Sticky Top Toolbar: Tetap mengambang saat scroll panjang 31 butir */}
              <div className="sticky top-2 z-20 bg-[var(--ds-surface)]/95 backdrop-blur-md -mx-4 -mt-4 p-4 rounded-t-3xl border-b border-slate-200/70 dark:border-zinc-800 flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)] flex items-center gap-2">
                  <ListOrdered className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                  3. Batang Tubuh / Isi ({(data.paragraf || []).length} Butir)
                </h2>
                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertPoint("plain")}
                    className="kpg-secondary h-7 text-xs p-1 px-2 gap-1 font-semibold rounded-lg"
                    title="Tambah paragraf biasa ke akhir"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />
                    Paragraf
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleInsertPoint("num")}
                    className="h-7 text-xs bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[color:var(--ds-accent-on-solid)] shadow-xs p-1 px-2 gap-1 font-semibold rounded-lg"
                    title="Tambah Poin Utama (1., 2., 3., ...) ke akhir"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-[color:var(--ds-accent-on-solid)]/80" />
                    + Poin 1.
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertPoint("letter")}
                    className="h-7 text-xs border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft-border)]/30 shadow-xs p-1 px-2 gap-1 font-semibold rounded-lg"
                    title="Tambah Sub-Poin Huruf (a., b., c., ...) ke akhir"
                  >
                    + Sub a.
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertPoint("roman")}
                    className="h-7 text-xs border-amber-300 text-amber-800 bg-amber-50/80 hover:bg-amber-100 dark:border-amber-700/80 dark:text-amber-300 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 shadow-xs p-1 px-2 gap-1 font-semibold rounded-lg"
                    title="Tambah Sub-Sub Poin Romawi (i., ii., iii., ...) ke akhir"
                  >
                    + Butir i.
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertPoint("bracket")}
                    className="h-7 text-xs border-blue-200 text-blue-700 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-700/80 dark:text-blue-300 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 shadow-xs p-1 px-2 gap-1 font-semibold rounded-lg"
                    title="Tambah Butir Angka Kurung (1), 2), 3), ...) ke akhir"
                  >
                    + Butir 1)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSmartPaste(!showSmartPaste)}
                    className="kpg-secondary h-7 text-xs p-1 px-3 gap-1 font-semibold rounded-lg"
                    title="Tempel teks utuh naskah dinas bertingkat"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                    Tempel Teks Utuh
                  </Button>
                </div>
              </div>

              {/* Smart Paste Drawer */}
              {showSmartPaste && (
                <div className="p-3 bg-slate-50/70 dark:bg-zinc-950/60 border border-[var(--ds-accent-soft-border)] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--ds-accent-fg)] flex items-center gap-2">
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Tempel & Parse Naskah Dinas Bertingkat Otomatis
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSmartPaste(false)}
                      className="text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-[var(--ds-fg-muted)] leading-normal">
                    Salin teks nota dinas/memorandum utuh (termasuk kalimat pembuka, poin 1., sub a., butir i. / 1), dan penutup). Sistem otomatis memecah dan menata hierarki indentasi secara presisi.
                  </p>
                  <Textarea
                    value={smartPasteText}
                    onChange={(e) => setSmartPasteText(e.target.value)}
                    rows={6}
                    placeholder="Tempel teks nota dinas di sini..."
                    className="text-xs font-mono bg-[var(--ds-surface)] leading-relaxed rounded-lg"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSmartPasteText(SAMPLE_SIMATA_BKN_TEXT);
                        handleApplySmartPaste(SAMPLE_SIMATA_BKN_TEXT);
                      }}
                      className="h-7 text-xs bg-[var(--ds-surface-raised)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] gap-1 font-medium rounded-lg"
                      title="Muat contoh resmi Surat Edaran Manajemen Talenta Simata BKN (31 Butir)"
                    >
                      <Sparkles className="w-3 h-3 text-[var(--ds-accent-fg)]" />
                      Muat Contoh Simata BKN (31 Butir)
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSmartPaste(false)}
                        className="h-7 text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] rounded-lg"
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleApplySmartPaste()}
                        className="h-7 text-xs bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[color:var(--ds-accent-on-solid)] font-semibold gap-1 rounded-lg"
                      >
                        <FileCheck className="w-3 h-3" />
                        Terapkan ke Dokumen
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs">
                {(data.paragraf || []).map((pText, idx) => {
                  const pList = data.paragraf || [];
                  const isPenutup = idx === pList.length - 1;
                  const isPembuka = idx === 0;
                  const lvl = detectPointLevel(pText);

                  const indentClass =
                    lvl === 2
                      ? "ml-3 sm:ml-5 border-l-2 border-[var(--ds-accent-soft-border)]"
                      : lvl === 3
                      ? "ml-6 sm:ml-10 border-l-2 border-amber-400"
                      : lvl === 4
                      ? "ml-9 sm:ml-14 border-l-2 border-blue-400"
                      : "";

                  return (
                    <div
                      key={idx}
                      className={`relative rounded-lg border p-3 space-y-2 transition-colors ${indentClass} ${
                        isPenutup
                          ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20"
                          : lvl === 1
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)]/50"
                          : lvl === 2
                          ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20"
                          : lvl === 3
                          ? "border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20"
                          : lvl === 4
                          ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/40"
                          : "border-slate-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--ds-fg-secondary)]">
                            {idx + 1}.
                          </span>
                          {isPenutup ? (
                            <Badge variant="outline" className="text-xs px-2 py-0 font-semibold border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-300 rounded-lg">
                              Penutup (Bawah)
                            </Badge>
                          ) : lvl === 1 ? (
                            <Badge variant="outline" className="text-xs px-2 py-0 font-bold border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center gap-1 rounded-lg">
                              <ListOrdered className="w-2.5 h-2.5" />
                              Poin Utama (Tingkat 1)
                            </Badge>
                          ) : lvl === 2 ? (
                            <Badge variant="outline" className="text-xs px-2 py-0 font-bold border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg">
                              Sub-Poin (Tingkat 2)
                            </Badge>
                          ) : lvl === 3 ? (
                            <Badge variant="outline" className="text-xs px-2 py-0 font-bold border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg">
                              Sub-Butir (Tingkat 3)
                            </Badge>
                          ) : lvl === 4 ? (
                            <Badge variant="outline" className="text-xs px-2 py-0 font-bold border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-lg">
                              Sub-Butir (Tingkat 4)
                            </Badge>
                          ) : isPembuka ? (
                            <Badge variant="outline" className="text-xs px-2 py-0 font-medium text-zinc-600 border-zinc-200 bg-white dark:text-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/80 rounded-lg">
                              Pembuka
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs px-2 py-0 font-medium text-blue-700 border-blue-200 bg-blue-50/70 dark:text-blue-300 dark:border-blue-800/80 dark:bg-blue-950/50 rounded-lg">
                              Paragraf Biasa
                            </Badge>
                          )}
                        </div>

                        {/* Quick Level Switchers, Insert Below & Delete */}
                        <div className="flex items-center gap-1">
                          {/* Mini Dropdown: + Sisipkan Tepat di Bawah Butir Ini */}
                          {!isPenutup && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft-border)]/40 border border-[var(--ds-accent-soft-border)] px-2 py-1 rounded-lg transition-colors cursor-pointer mr-1"
                                  title="Sisipkan butir baru tepat di bawah ini"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Sisipkan</span>
                                  <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                data-module="persuratan"
                                align="end"
                                className="psr-ui w-48 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-lg rounded-2xl p-1 z-50 text-xs"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleInsertPoint(lvl === 1 ? "letter" : lvl === 2 ? "roman" : "bracket", idx + 1)}
                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-semibold"
                                >
                                  <span>↳ + Sub-Butir Anak</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleInsertPoint(lvl === 1 ? "num" : lvl === 2 ? "letter" : lvl === 3 ? "roman" : "bracket", idx + 1)}
                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] font-medium"
                                >
                                  <span>= + Poin Setara</span>
                                </DropdownMenuItem>
                                <div className="my-1 border-t border-slate-200/70 dark:border-zinc-800" />
                                <DropdownMenuItem
                                  onClick={() => handleInsertPoint("num", idx + 1)}
                                  className="flex items-center gap-2 px-3 py-1 cursor-pointer rounded-lg hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)] text-xs"
                                >
                                  <span className="font-mono font-bold text-[var(--ds-accent-fg)] w-4">1.</span> Poin Utama
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleInsertPoint("letter", idx + 1)}
                                  className="flex items-center gap-2 px-3 py-1 cursor-pointer rounded-lg hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)] text-xs"
                                >
                                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 w-4">a.</span> Sub-Poin Huruf
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleInsertPoint("roman", idx + 1)}
                                  className="flex items-center gap-2 px-3 py-1 cursor-pointer rounded-lg hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)] text-xs"
                                >
                                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 w-4">i.</span> Butir Romawi
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleInsertPoint("bracket", idx + 1)}
                                  className="flex items-center gap-2 px-3 py-1 cursor-pointer rounded-lg hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)] text-xs"
                                >
                                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 w-4">1)</span> Butir Kurung
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleInsertPoint("plain", idx + 1)}
                                  className="flex items-center gap-2 px-3 py-1 cursor-pointer rounded-lg hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] text-xs"
                                >
                                  <span className="font-mono w-4">¶</span> Paragraf Biasa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <span className="text-xs text-[var(--ds-fg-muted)]">Level:</span>
                          {LEVEL_SWITCH_CONTROLS.map((ctrl) => {
                            const active = ctrl.isActive(lvl, pText);
                            return (
                              <button
                                key={ctrl.level}
                                type="button"
                                onClick={() => handleChangeParagraphLevel(idx, ctrl.level)}
                                className={cn(
                                  "text-xs px-2 py-1 rounded-lg border transition-colors",
                                  active
                                    ? ctrl.activeClass
                                    : cn("text-zinc-600 dark:text-zinc-400 border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] hover:text-[var(--ds-fg)]", ctrl.hoverClass)
                                )}
                                title={ctrl.title}
                              >
                                {ctrl.label}
                              </button>
                            );
                          })}

                          {!isPenutup && pList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveParagraph(idx)}
                              className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] p-1 ml-1 rounded-lg transition-colors"
                              title="Hapus butir ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Textarea
                        value={pText}
                        onChange={(e) => handleParagraphChange(idx, e.target.value)}
                        rows={isPembuka ? 3 : isPenutup ? 2 : lvl > 0 ? 2 : 3}
                        placeholder={
                          isPenutup
                            ? "Tulis isi penutup naskah..."
                            : lvl === 1
                            ? `Tulis isi poin utama...`
                            : lvl === 2
                            ? `Tulis isi sub-poin...`
                            : lvl === 3
                            ? `Tulis isi butir...`
                            : `Tulis isi paragraf...`
                        }
                        className="paragraf-textarea text-xs bg-white dark:bg-zinc-900 leading-relaxed font-sans rounded-lg"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card 4: Penandatangan */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)] flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
              {activeTemplate === "berita_acara"
                ? `4. Penandatangan Berita Acara (${data.signerCount || 2} Pihak)`
                : activeTemplate === "perjanjian"
                ? "4. Penandatangan Perjanjian Kerja Sama (2 Pihak)"
                : activeTemplate === "surat_kuasa"
                ? "4. Penandatangan Surat Kuasa (Pemberi & Penerima Kuasa)"
                : activeTemplate === "surat_pengantar"
                ? "4. Penandatangan & Penerima Berkas"
                : "4. Pejabat Penandatangan"}
            </h2>

            {/* SURAT KUASA */}
            {activeTemplate === "surat_kuasa" && (
              <div className="space-y-3">
                <PartySelectorBlock
                  label="Pemberi Kuasa (Pihak Pertama / TTD Kanan)"
                  party={data.pemberiKuasa}
                  onChange={(p) => updateField("pemberiKuasa", p)}
                  employeeOptions={employeeOptions}
                  showAddress
                />
                <PartySelectorBlock
                  label="Penerima Kuasa (Pihak Kedua / TTD Kiri)"
                  party={data.penerimaKuasa}
                  onChange={(p) => updateField("penerimaKuasa", p)}
                  employeeOptions={employeeOptions}
                  showAddress
                />
              </div>
            )}

            {/* BERITA ACARA */}
            {activeTemplate === "berita_acara" && (
              <div className="space-y-3">
                {/* Toggle Jumlah Tanda Tangan: 2 TTD vs 3 TTD */}
                <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800 p-3 bg-[var(--ds-surface-muted)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-[var(--ds-fg)]">
                      Format Penandatangan
                    </span>
                    <div className="flex rounded-lg border border-slate-200/80 dark:border-zinc-800 p-1 bg-[var(--ds-surface)]">
                      <button
                        type="button"
                        onClick={() => updateField("signerCount", 2)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          (data.signerCount || 2) === 2
                            ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                            : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                        }`}
                      >
                        2 Tanda Tangan (Pihak I & II)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("signerCount", 3)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          data.signerCount === 3
                            ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                            : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                        }`}
                      >
                        3 Tanda Tangan (+ Mengetahui)
                      </button>
                    </div>
                  </div>
                </div>

                <PartySelectorBlock
                  label="Pihak Kesatu (TTD Kanan)"
                  party={data.pihakPertama}
                  onChange={(p) => updateField("pihakPertama", p)}
                  employeeOptions={employeeOptions}
                  showAddress
                />
                <PartySelectorBlock
                  label="Pihak Kedua (TTD Kiri)"
                  party={data.pihakKedua}
                  onChange={(p) => updateField("pihakKedua", p)}
                  employeeOptions={employeeOptions}
                  showAddress
                />

                {data.signerCount === 3 && (
                  <PartySelectorBlock
                    label="Pihak Ketiga (Mengetahui / Mengesahkan - TTD Bawah)"
                    party={data.pihakKetiga}
                    onChange={(p) => updateField("pihakKetiga", p)}
                    employeeOptions={employeeOptions}
                  />
                )}
              </div>
            )}

            {/* PERJANJIAN KERJA SAMA (PKS) */}
            {activeTemplate === "perjanjian" && (
              <div className="space-y-3">
                <PartySelectorBlock
                  label="Pihak Pertama (TTD Kanan)"
                  party={data.pihakPertama}
                  onChange={(p) => updateField("pihakPertama", p)}
                  employeeOptions={employeeOptions}
                  showAddress
                />
                <PartySelectorBlock
                  label="Pihak Kedua (TTD Kiri)"
                  party={data.pihakKedua}
                  onChange={(p) => updateField("pihakKedua", p)}
                  employeeOptions={employeeOptions}
                  showAddress
                />
              </div>
            )}

            {/* SURAT PENGANTAR */}
            {activeTemplate === "surat_pengantar" && (
              <div className="space-y-3">
                {/* Pengirim (TTD Kanan) */}
                <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800 p-3 bg-[var(--ds-surface-muted)] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--ds-fg)]">
                    <UserRound className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                    Pengirim Naskah (TTD Kanan)
                  </div>
                  <div>
                    <select
                      onChange={(e) => handleSelectEmployee(e.target.value)}
                      defaultValue=""
                      className="w-full text-xs rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-2 text-[var(--ds-fg)]"
                    >
                      <option value="">-- Pilih dari Database Pegawai --</option>
                      {employeeOptions?.map((emp: any) => {
                        const empName = emp.nama_lengkap || emp.name || emp.nama || "Tanpa Nama";
                        const empPos = emp.jabatan || emp.position || "";
                        const empNip = emp.nip ? `(${formatNipLabel(emp, true)} ${emp.nip})` : "";
                        return (
                          <option key={emp.id} value={emp.id}>
                            {empName}{empPos ? ` — ${empPos}` : ""}{empNip ? ` ${empNip}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={data.namaPenandatangan}
                      onChange={(e) => updateField("namaPenandatangan", e.target.value)}
                      placeholder="Nama Pengirim"
                      className="h-8 text-xs bg-[var(--ds-surface)] font-semibold rounded-lg"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={data.nipPenandatangan}
                        onChange={(e) => updateField("nipPenandatangan", e.target.value)}
                        placeholder="NIP Pengirim"
                        className="h-8 text-xs bg-[var(--ds-surface)] font-mono rounded-lg"
                      />
                      <Input
                        value={data.jabatanPenandatangan}
                        onChange={(e) => updateField("jabatanPenandatangan", e.target.value)}
                        placeholder="Jabatan Pengirim"
                        className="h-8 text-xs bg-[var(--ds-surface)] rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Penerima Berkas (TTD Kiri) */}
                <PartySelectorBlock
                  label="Pihak Penerima Berkas (TTD Kiri)"
                  party={data.penerimaPengantar as PersonItem}
                  onChange={(p) => updateField("penerimaPengantar", p)}
                  employeeOptions={employeeOptions}
                />
              </div>
            )}

            {/* TEMPLATE LAINNYA: 1 PENANDATANGAN TUNGGAL */}
            {activeTemplate !== "surat_kuasa" &&
              activeTemplate !== "berita_acara" &&
              activeTemplate !== "perjanjian" &&
              activeTemplate !== "surat_pengantar" && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-[var(--ds-fg-secondary)]">Pilih dari Database Pegawai</label>
                    <select
                      onChange={(e) => handleSelectEmployee(e.target.value)}
                      className="w-full mt-1 text-xs rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-2 text-[var(--ds-fg)]"
                    >
                      <option value="">-- Pilih Pejabat / Pegawai --</option>
                      {employeeOptions?.map((emp: any) => {
                        const empName = emp.nama_lengkap || emp.name || emp.nama || "Tanpa Nama";
                        const empPos = emp.jabatan || emp.position || "";
                        const empNip = emp.nip ? `(${formatNipLabel(emp, true)} ${emp.nip})` : "";
                        return (
                          <option key={emp.id} value={emp.id}>
                            {empName}{empPos ? ` — ${empPos}` : ""}{empNip ? ` ${empNip}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {activeTemplate !== "nota_dinas" && activeTemplate !== "memorandum" ? (
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Jabatan Penandatangan</label>
                      <Input
                        value={data.jabatanPenandatangan}
                        onChange={(e) => updateField("jabatanPenandatangan", e.target.value)}
                        placeholder="Contoh: Kepala Balai,"
                        className="mt-1 text-xs rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-xs text-[var(--ds-accent-fg)]">
                      Format {activeTemplate === "nota_dinas" ? "Nota Dinas" : "Memorandum"}: Langsung nama &amp; NIP (jabatan pengirim ada pada &apos;Dari&apos; di kepala surat).
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">Nama Lengkap &amp; Gelar</label>
                      <Input
                        value={data.namaPenandatangan}
                        onChange={(e) => updateField("namaPenandatangan", e.target.value)}
                        placeholder="M. ARI WIBAWANTO, S.Hut., M.Sc."
                        className="mt-1 text-xs font-semibold rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--ds-fg-secondary)]">NIP</label>
                      <Input
                        value={data.nipPenandatangan}
                        onChange={(e) => updateField("nipPenandatangan", e.target.value)}
                        placeholder="19740514 199903 1 001"
                        className="mt-1 text-xs font-mono rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Card 5: Tembusan (Hanya untuk template yang memiliki tembusan sesuai Permen Kehutanan 1/2025) */}
          {(
            activeTemplate === "surat_dinas" ||
            activeTemplate === "nota_dinas" ||
            activeTemplate === "memorandum" ||
            activeTemplate === "undangan" ||
            activeTemplate === "surat_izin" ||
            activeTemplate === "surat_panggilan" ||
            activeTemplate === "surat_pernyataan"
          ) && (
            <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)] flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />
                  5. Tembusan ({(data.tembusan || []).length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTembusan}
                  className="h-7 text-xs text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] p-1 gap-1 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Tembusan
                </Button>
              </div>

              <div className="space-y-2">
                {(data.tembusan || []).map((t, i) => (
                  <div key={t.id || i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--ds-fg-muted)] w-4">{(data.tembusan || []).length > 1 ? `${i + 1}.` : ""}</span>
                    <Input
                      value={t.text}
                      onChange={(e) => handleTembusanChange(t.id, e.target.value)}
                      placeholder="Nama instansi/pejabat tembusan..."
                      className="h-8 text-xs flex-1 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTembusan(t.id)}
                      className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] p-1 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integrasi Info */}
          <div className="rounded-3xl border border-dashed border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-4 text-xs text-[var(--ds-fg-muted)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0" />
              <span>Otomatis terhubung dengan <strong>Daftar Surat Keluar</strong> BKSDA Kaltim.</span>
            </div>
            <Link
              href="/surat/keluar"
              className="text-[var(--ds-accent-fg)] hover:underline font-semibold inline-flex items-center gap-1 shrink-0 ml-2"
            >
              Buka Surat Keluar &rarr;
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Live A4 Preview (7 cols on lg) */}
        <div className="lg:col-span-7 sticky top-4">
          <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ds-fg-secondary)]">
              <span className="flex items-center gap-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-[var(--ds-accent-solid)]" />
                Pratinjau A4 Standar Permen 1/2025 ({activeTabMeta.name})
              </span>
              <div className="flex items-center gap-2">
                <SuratDinasDownloadDropdown isExporting={isExporting} onPdf={handleExportPdf} onWord={handleExportWord} compact />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintSuratDinas}
                  className="kpg-secondary h-7 text-xs gap-1 rounded-lg"
                >
                  <Printer className="w-3 h-3" />
                  Cetak Dokumen
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40 p-4 overflow-x-auto">
              <div className="w-fit mx-auto shadow-xs">
                <SuratDinasDocument data={deferredData} onUpdateField={updateField} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Modal Catalog for switching format */}
      <TemplatePickerModal
        open={isPickerModalOpen}
        onOpenChange={setIsPickerModalOpen}
        onSelectTemplate={(tplId) => handleSwitchTemplate(tplId as TemplateType)}
      />
    </div>
  );
}

function SuratDinasDownloadDropdown({
  isExporting,
  onPdf,
  onWord,
  compact = false,
}: {
  isExporting: string | null;
  onPdf: () => void;
  onWord: () => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting !== null}
          className={cn("kpg-secondary rounded-lg text-xs", compact ? "h-7 gap-1" : "gap-2")}
        >
          {isExporting ? (
            <Loader2 className={cn("animate-spin mr-1 text-[var(--ds-accent-fg)]", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          ) : (
            <Download className={cn("text-[var(--ds-accent-fg)]", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          )}
          <span>Unduh</span>
          <ChevronDown className={cn("opacity-60", compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-module="persuratan"
        align="end"
        className="psr-ui w-56 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-lg rounded-2xl p-2 z-50"
      >
        <DropdownMenuItem
          onClick={onPdf}
          disabled={isExporting !== null}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] rounded-lg cursor-pointer"
        >
          <FileDown className="w-4 h-4 text-[var(--ds-status-danger-fg)] shrink-0" />
          <div className="flex flex-col text-left">
            <span>Unduh PDF (.pdf)</span>
            <span className="text-xs text-[var(--ds-fg-muted)] font-normal">Berkas fisik PDF</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onWord}
          disabled={isExporting !== null}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] rounded-lg cursor-pointer"
        >
          <FileText className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0" />
          <div className="flex flex-col text-left">
            <span>Unduh Word (.doc)</span>
            <span className="text-xs text-[var(--ds-fg-muted)] font-normal">Microsoft Word editable</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const INDO_MONTH_MAP: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
  juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12",
};

function parseIndoDateToIso(str?: string): string {
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const match = str.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (!match) return "";
  const m = INDO_MONTH_MAP[match[2].toLowerCase()];
  return m ? `${match[3]}-${m}-${match[1].padStart(2, "0")}` : "";
}

export default function GenerateSuratDinasPage() {
  return (
    <Suspense fallback={<div className="psr-ui p-8 text-center text-xs text-[var(--ds-fg-muted)]">Memuat generator naskah dinas...</div>}>
      <GenerateSuratDinasContent />
    </Suspense>
  );
}
