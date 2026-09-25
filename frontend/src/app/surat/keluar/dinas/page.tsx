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
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  SuratDinasDocument,
  SuratDinasData,
  PersonItem,
  TemplateType,
  DEFAULT_SURAT_DINAS_DATA,
  getDefaultDataForTemplate,
  getDefaultNomorForTemplate,
  getDefaultNomorPrefix,
  handlePrintSuratDinas,
  getTodayIndoDate,
  formatIsoDateToIndo,
  getDefaultNomorSurat,
} from "../../_components/SuratDinasDocument";
import { TemplatePickerModal, ALL_TEMPLATES } from "../../_components/TemplatePickerModal";

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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200">
          <UserRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          {label}
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => handleTypeChange("internal")}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
              currentPartyType === "internal"
                ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            Pegawai (NIP)
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("external")}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
              currentPartyType === "external"
                ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
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
            className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 text-zinc-800 dark:text-zinc-200"
          >
            <option value="">-- Pilih dari Database Pegawai --</option>
            {employeeOptions?.map((emp: any) => {
              const empName = emp.nama_lengkap || emp.name || emp.nama || "Tanpa Nama";
              const empPos = emp.jabatan || emp.position || "";
              const empNip = emp.nip ? `(NIP. ${emp.nip})` : "";
              return (
                <option key={emp.id} value={emp.id}>
                  {empName}{empPos ? ` — ${empPos}` : ""}{empNip ? ` ${empNip}` : ""}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <Input
          value={party?.nama || ""}
          onChange={(e) => onChange({ ...(party || {} as PersonItem), nama: e.target.value })}
          placeholder="Nama Lengkap"
          className="h-8 text-xs bg-white dark:bg-zinc-950"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={party?.nip || ""}
            onChange={(e) => onChange({ ...(party || {} as PersonItem), nip: e.target.value })}
            placeholder={currentPartyType === "external" ? "NIK (16 digit)" : "NIP (18 digit)"}
            className="h-8 text-xs bg-white dark:bg-zinc-950 font-mono"
          />
          <Input
            value={party?.jabatan || ""}
            onChange={(e) => onChange({ ...(party || {} as PersonItem), jabatan: e.target.value })}
            placeholder={currentPartyType === "external" ? "Jabatan / Instansi" : "Jabatan Kedinasan"}
            className="h-8 text-xs bg-white dark:bg-zinc-950"
          />
        </div>
        {showAddress && (
          <Input
            value={party?.alamat || ""}
            onChange={(e) => onChange({ ...(party || {} as PersonItem), alamat: e.target.value })}
            placeholder="Alamat Domisili / Instansi"
            className="h-8 text-xs bg-white dark:bg-zinc-950"
          />
        )}
      </div>
    </div>
  );
}

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
    return {
      nomorUrut: parts[0] ?? getDefaultNomorPrefix(activeTemplate),
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
            setData(item.document_payload);
          } else {
            const loadedTemplate = (item.template_type as TemplateType) || "surat_dinas";
            const defData = getDefaultDataForTemplate(loadedTemplate);
            setData({
              ...defData,
              nomor: item.no_surat || defData.nomor,
              sifat: item.sifat || defData.sifat,
              lampiran: item.lampiran || defData.lampiran,
              perihal: item.perihal || defData.perihal,
              tujuanKepada: item.tujuan_surat || defData.tujuanKepada,
              kotaTanggal: item.tanggal_surat ? formatIsoDateToIndo(item.tanggal_surat) : defData.kotaTanggal,
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
    setData((prev) => ({ ...prev, [field]: value }));
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

  // Paragraph management: Penutup is ALWAYS the last paragraph
  const handleAddParagraph = () => {
    setData((prev) => {
      const list = [...prev.paragraf];
      const insertAt = Math.max(0, list.length - 1);
      list.splice(insertAt, 0, "");
      return { ...prev, paragraf: list };
    });
  };

  const handleRemoveParagraph = (index: number) => {
    setData((prev) => ({
      ...prev,
      paragraf: prev.paragraf.length > 1 ? prev.paragraf.filter((_, i) => i !== index) : prev.paragraf,
    }));
  };

  const handleParagraphChange = (index: number, val: string) => {
    setData((prev) => ({
      ...prev,
      paragraf: prev.paragraf.map((p, i) => (i === index ? val : p)),
    }));
  };

  // Berita Acara Poin management
  const handleAddPoinBeritaAcara = () => {
    setData((prev) => ({ ...prev, poinBeritaAcara: [...(prev.poinBeritaAcara || []), ""] }));
  };

  const handleRemovePoinBeritaAcara = (idx: number) => {
    setData((prev) => ({ ...prev, poinBeritaAcara: (prev.poinBeritaAcara || []).filter((_, i) => i !== idx) }));
  };

  const handlePoinBeritaAcaraChange = (idx: number, val: string) => {
    setData((prev) => ({
      ...prev,
      poinBeritaAcara: (prev.poinBeritaAcara || []).map((p, i) => (i === idx ? val : p)),
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
        ...prev.tembusan,
        { id: Date.now().toString(), text: "" },
      ],
    }));
  };

  const handleRemoveTembusan = (id: string) => {
    setData((prev) => ({
      ...prev,
      tembusan: prev.tembusan.filter((t) => t.id !== id),
    }));
  };

  const handleTembusanChange = (id: string, text: string) => {
    setData((prev) => ({
      ...prev,
      tembusan: prev.tembusan.map((t) => (t.id === id ? { ...t, text } : t)),
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 lg:p-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/surat/keluar">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl" title="Kembali ke Daftar Surat Keluar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                <activeTabMeta.icon className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {editingSuratKeluarId ? `Edit ${activeTabMeta.name}` : `Buat ${activeTabMeta.name}`}
              </h1>
              {editingSuratKeluarId ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold text-blue-600 border-blue-300 bg-blue-50/50">
                    Mode Edit: #{editingSuratKeluarId}
                  </Badge>
                  {editingSuratKeluarStatus === "draft" ? (
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold text-amber-700 border-amber-300 bg-amber-50">
                      Draft
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-700 border-emerald-300 bg-emerald-50">
                      Terdaftar
                    </Badge>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-600 border-emerald-300">
                  Permen Kehutanan 1/2025 (Hal. {activeTabMeta.hal})
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
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
              className="rounded-xl text-xs gap-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
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
            className="rounded-xl text-xs gap-1.5"
            title="Reset ke template standar naskah ini"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Template Baku
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBlankForm}
            className="rounded-xl text-xs gap-1.5 text-zinc-600 hover:text-zinc-900"
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
            className="rounded-xl text-xs gap-1.5 border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            title="Simpan sebagai draf di Daftar Surat Keluar"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {editingSuratKeluarId && editingSuratKeluarStatus === "draft" ? "Update Draf" : "Simpan Draf"}
          </Button>
          <Button
            size="sm"
            onClick={() => handleSaveSuratKeluar("terdaftar")}
            disabled={isRegistering}
            className="rounded-xl text-xs gap-1.5 shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
            title="Daftarkan resmi ke Daftar Surat Keluar"
          >
            <Send className="w-3.5 h-3.5" />
            {isRegistering ? "Menyimpan..." : editingSuratKeluarId ? "Update Naskah" : "Daftarkan Resmi"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrintSuratDinas}
            className="rounded-xl text-xs gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Dokumen
          </Button>
        </div>
      </div>

      {/* Template Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPickerModalOpen(true)}
            className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-zinc-800/80 transition-all text-xs shadow-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
              <activeTabMeta.icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {activeTabMeta.name}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                Hal. {activeTabMeta.hal}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pl-2 border-l border-zinc-200 dark:border-zinc-700">
              Ganti Format (20 Naskah)
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </span>
          </button>
        </div>

        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>Format resmi Permen Kehutanan 1/2025</span>
        </div>
      </div>

      {/* Main Split Layout: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Editor Form (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Metadata Surat */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              1. Identitas & Meta Dokumen
            </h2>

            <div className="space-y-3 text-xs">
              {/* Nomor Surat Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Nomor Naskah</label>
                  <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 whitespace-pre">
                    {data.nomor}
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-1.5 items-end">
                    <div className="col-span-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-zinc-500">Awalan/No</label>
                        <button
                          type="button"
                          onClick={() => handleUpdateNomorUrut(getDefaultNomorPrefix(activeTemplate))}
                          className="text-[9px] px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 font-mono"
                          title="Format baku"
                        >
                          {getDefaultNomorPrefix(activeTemplate)}
                        </button>
                      </div>
                      <Input
                        value={nomorSegments.nomorUrut}
                        onChange={(e) => handleUpdateNomorUrut(e.target.value)}
                        placeholder="Contoh: S.888 atau ND.102"
                        className="h-8 text-xs font-mono font-bold text-left bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 px-2"
                      />
                    </div>

                    <div className="col-span-3 text-center pb-2">
                      <span className="text-[11px] font-mono font-bold text-zinc-400 dark:text-zinc-500 select-none">
                        /K.18/TU/
                      </span>
                    </div>

                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-zinc-500 block mb-1">Klasifikasi</label>
                      <Input
                        value={nomorSegments.kodeKlasifikasi}
                        onChange={(e) => handleUpdateKlasifikasi(e.target.value)}
                        placeholder="KSA.01.05"
                        className="h-8 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 px-1.5"
                      />
                    </div>

                    <div className="col-span-2 text-center pb-2">
                      <span className="text-[11px] font-mono font-bold text-zinc-400 dark:text-zinc-500 select-none">
                        /B/{currentMonthSuffix}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10.5px]">
                      Pola: <strong className="text-zinc-600 dark:text-zinc-300 font-mono">/K.18/TU/</strong> ... <strong className="text-zinc-600 dark:text-zinc-300 font-mono">/B/{currentMonthSuffix}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManualNomor(!showManualNomor)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
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
                        className="h-8 text-xs font-mono bg-white dark:bg-zinc-900"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sifat & Lampiran (Hanya untuk Surat Dinas & Undangan) */}
              {(activeTemplate === "surat_dinas" || activeTemplate === "undangan") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Sifat Naskah</label>
                    <select
                      value={data.sifat || "Biasa"}
                      onChange={(e) => updateField("sifat", e.target.value)}
                      className="w-full mt-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="Biasa">Biasa</option>
                      <option value="Penting">Penting</option>
                      <option value="Rahasia">Rahasia</option>
                      <option value="Segera">Segera</option>
                      <option value="Sangat Segera">Sangat Segera</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Lampiran</label>
                    <Input
                      value={data.lampiran}
                      onChange={(e) => updateField("lampiran", e.target.value)}
                      placeholder="Contoh: - atau 1 Berkas"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Lampiran Saja (Khusus Nota Dinas & Memorandum: Sifat di-hidden) */}
              {(activeTemplate === "nota_dinas" || activeTemplate === "memorandum") && (
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Lampiran</label>
                  <Input
                    value={data.lampiran}
                    onChange={(e) => updateField("lampiran", e.target.value)}
                    placeholder="Contoh: - atau 1 Berkas"
                    className="mt-1 text-xs"
                  />
                </div>
              )}

              {/* Tanggal Naskah */}
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Tanggal Naskah</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="date"
                    value={parseIndoDateToIso(data.kotaTanggal)}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateField("kotaTanggal", formatIsoDateToIndo(e.target.value));
                      }
                    }}
                    className="w-44 text-xs"
                  />
                  <Input
                    value={data.kotaTanggal}
                    onChange={(e) => updateField("kotaTanggal", e.target.value)}
                    placeholder="Contoh: 24 September 2026"
                    className="flex-1 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateField("kotaTanggal", getTodayIndoDate())}
                    className="text-[11px] h-9 px-2.5 rounded-lg whitespace-nowrap"
                  >
                    Hari Ini
                  </Button>
                </div>
              </div>

              {/* Perihal / Hal */}
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Perihal / Judul Ringkas</label>
                <Textarea
                  value={data.perihal}
                  onChange={(e) => updateField("perihal", e.target.value)}
                  rows={2}
                  placeholder="Isi perihal naskah dinas..."
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Field Spesifik Template */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <Building className="w-3.5 h-3.5 text-emerald-500" />
              2. Data Spesifik ({activeTabMeta.name})
            </h2>

            <div className="space-y-3 text-xs">
              {/* NOTA DINAS & MEMORANDUM */}
              {(activeTemplate === "nota_dinas" || activeTemplate === "memorandum") && (
                <>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Yth. (Penerima)</label>
                    <Input
                      value={data.yth || ""}
                      onChange={(e) => updateField("yth", e.target.value)}
                      placeholder="Contoh: Kepala Balai KSDA Kalimantan Timur"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Dari (Pengirim)</label>
                    <Input
                      value={data.dari || ""}
                      onChange={(e) => updateField("dari", e.target.value)}
                      placeholder="Contoh: Kepala Subbagian Tata Usaha"
                      className="mt-1 text-xs"
                    />
                  </div>
                </>
              )}

              {/* SURAT PENGANTAR */}
              {activeTemplate === "surat_pengantar" && (
                <>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Tujuan Pengiriman (Yth.)</label>
                    <Input
                      value={data.tujuanKepada || ""}
                      onChange={(e) => updateField("tujuanKepada", e.target.value)}
                      placeholder="Contoh: Kepala Kantor Pelayanan Perbendaharaan Negara Samarinda"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Daftar Berkas Dikirim ({data.tabelPengantar?.length || 0})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddPengantarRow}
                        className="h-6 text-xs text-emerald-600 gap-1 p-1"
                      >
                        <Plus className="w-3 h-3" /> Tambah Baris
                      </Button>
                    </div>
                    {(data.tabelPengantar || []).map((row, rIdx) => (
                      <div key={rIdx} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5 bg-zinc-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">Berkas #{rIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePengantarRow(rIdx)}
                            className="text-zinc-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <Input
                          value={row.naskah}
                          onChange={(e) => handlePengantarRowChange(rIdx, "naskah", e.target.value)}
                          placeholder="Nama naskah dinas..."
                          className="h-8 text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={row.banyaknya}
                            onChange={(e) => handlePengantarRowChange(rIdx, "banyaknya", e.target.value)}
                            placeholder="Banyaknya (mis: 1 Berkas)"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={row.keterangan}
                            onChange={(e) => handlePengantarRowChange(rIdx, "keterangan", e.target.value)}
                            placeholder="Keterangan..."
                            className="h-8 text-xs"
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
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Yth. / Kepada</label>
                    <Input
                      value={data.tujuanKepada || ""}
                      onChange={(e) => updateField("tujuanKepada", e.target.value)}
                      placeholder="Contoh: Para Pejabat Struktural dan Kepala Seksi Wilayah"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2">
                    <span className="font-bold text-zinc-700 dark:text-zinc-200 block text-[11px]">Rincian Acara</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={data.acaraHariTanggal || ""}
                        onChange={(e) => updateField("acaraHariTanggal", e.target.value)}
                        placeholder="Hari, Tanggal"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={data.acaraWaktu || ""}
                        onChange={(e) => updateField("acaraWaktu", e.target.value)}
                        placeholder="Waktu"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Input
                      value={data.acaraTempat || ""}
                      onChange={(e) => updateField("acaraTempat", e.target.value)}
                      placeholder="Tempat Acara"
                      className="h-8 text-xs"
                    />
                    <Input
                      value={data.acaraNama || ""}
                      onChange={(e) => updateField("acaraNama", e.target.value)}
                      placeholder="Nama Acara"
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {/* SURAT KUASA */}
              {activeTemplate === "surat_kuasa" && (
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Materi Yang Dikuasakan</label>
                  <Textarea
                    value={data.materiKuasa || ""}
                    onChange={(e) => updateField("materiKuasa", e.target.value)}
                    rows={3}
                    placeholder="Untuk mewakili..."
                    className="mt-1 text-xs"
                  />
                </div>
              )}

              {/* BERITA ACARA */}
              {activeTemplate === "berita_acara" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Hari & Tanggal Acara</label>
                    <Input
                      value={data.hariTanggalAcara || ""}
                      onChange={(e) => updateField("hariTanggalAcara", e.target.value)}
                      placeholder="Contoh: Kamis, 24 September 2026"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Tempat Dibuat</label>
                    <Input
                      value={data.lokasiDibuat || ""}
                      onChange={(e) => updateField("lokasiDibuat", e.target.value)}
                      placeholder="Contoh: Samarinda"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* PERJANJIAN KERJA SAMA (PKS) */}
              {activeTemplate === "perjanjian" && (
                <>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Judul Perjanjian Kerja Sama</label>
                    <Input
                      value={data.judulPerjanjian || ""}
                      onChange={(e) => updateField("judulPerjanjian", e.target.value)}
                      placeholder="PERJANJIAN KERJA SAMA ANTARA ... DENGAN ..."
                      className="mt-1 text-xs uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">Hari & Tanggal Perjanjian</label>
                      <Input
                        value={data.hariTanggalAcara || ""}
                        onChange={(e) => updateField("hariTanggalAcara", e.target.value)}
                        placeholder="Contoh: Kamis, 24 September 2026"
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">Tempat Dibuat</label>
                      <Input
                        value={data.lokasiDibuat || ""}
                        onChange={(e) => updateField("lokasiDibuat", e.target.value)}
                        placeholder="Samarinda"
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* PIAGAM & SERTIFIKAT */}
              {(activeTemplate === "piagam" || activeTemplate === "sertifikat") && (
                <>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Diberikan Kepada</label>
                    <Input
                      value={data.diberikanKepada || ""}
                      onChange={(e) => updateField("diberikanKepada", e.target.value)}
                      placeholder="Nama Penerima / Lembaga"
                      className="mt-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Atas Peran / Prestasi</label>
                    <Textarea
                      value={data.atasPeran || ""}
                      onChange={(e) => updateField("atasPeran", e.target.value)}
                      rows={3}
                      placeholder="Uraian prestasi..."
                      className="mt-1 text-xs"
                    />
                  </div>
                </>
              )}

              {/* SURAT DINAS (DEFAULT) */}
              {activeTemplate === "surat_dinas" && (
                <>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Kepada Yth.</label>
                    <Input
                      value={data.tujuanKepada || ""}
                      onChange={(e) => updateField("tujuanKepada", e.target.value)}
                      placeholder="Contoh: Direktur PT. Hutan Lindung Kelian Lestari"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Tempat (Di -)</label>
                    <Input
                      value={data.tujuanDi || ""}
                      onChange={(e) => updateField("tujuanDi", e.target.value)}
                      placeholder="Contoh: Kutai Barat atau Samarinda"
                      className="mt-1 text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 3: Paragraf Isi */}
          {activeTemplate !== "surat_pengantar" && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
                  3. Batang Tubuh / Isi ({data.paragraf.length} Paragraf)
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddParagraph}
                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700 p-1 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Paragraf
                </Button>
              </div>

              <div className="space-y-3 text-xs">
                {data.paragraf.map((pText, idx) => {
                  const isPenutup = idx === data.paragraf.length - 1;
                  const isPembuka = idx === 0;
                  return (
                    <div
                      key={idx}
                      className={`relative rounded-xl border p-2.5 space-y-1.5 transition-colors ${
                        isPenutup
                          ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20"
                          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                            Paragraf {idx + 1}
                          </span>
                          {isPenutup ? (
                            <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 font-semibold border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                              Penutup (Bawah)
                            </Badge>
                          ) : isPembuka ? (
                            <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 font-medium text-zinc-500 border-zinc-200">
                              Pembuka
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 font-medium text-blue-600 border-blue-200 bg-blue-50/50 dark:text-blue-400">
                              Isi
                            </Badge>
                          )}
                        </div>
                        {!isPenutup && data.paragraf.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParagraph(idx)}
                            className="text-zinc-400 hover:text-red-500 p-0.5 rounded transition-colors"
                            title="Hapus paragraf ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <Textarea
                        value={pText}
                        onChange={(e) => handleParagraphChange(idx, e.target.value)}
                        rows={isPembuka ? 4 : isPenutup ? 2 : 3}
                        placeholder={isPenutup ? "Tulis isi penutup naskah..." : `Tulis isi paragraf ${idx + 1}...`}
                        className="text-xs bg-white dark:bg-zinc-900 leading-relaxed"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card 4: Penandatangan */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <UserCheck className="w-3.5 h-3.5 text-purple-500" />
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
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 bg-zinc-50/50 dark:bg-zinc-950/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[11px] text-zinc-700 dark:text-zinc-200">
                      Format Penandatangan
                    </span>
                    <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                      <button
                        type="button"
                        onClick={() => updateField("signerCount", 2)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                          (data.signerCount || 2) === 2
                            ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                        }`}
                      >
                        2 Tanda Tangan (Pihak I & II)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("signerCount", 3)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                          data.signerCount === 3
                            ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
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
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    <UserRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Pengirim Naskah (TTD Kanan)
                  </div>
                  <div>
                    <select
                      onChange={(e) => handleSelectEmployee(e.target.value)}
                      defaultValue=""
                      className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="">-- Pilih dari Database Pegawai --</option>
                      {employeeOptions?.map((emp: any) => {
                        const empName = emp.nama_lengkap || emp.name || emp.nama || "Tanpa Nama";
                        const empPos = emp.jabatan || emp.position || "";
                        const empNip = emp.nip ? `(NIP. ${emp.nip})` : "";
                        return (
                          <option key={emp.id} value={emp.id}>
                            {empName}{empPos ? ` — ${empPos}` : ""}{empNip ? ` ${empNip}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Input
                      value={data.namaPenandatangan}
                      onChange={(e) => updateField("namaPenandatangan", e.target.value)}
                      placeholder="Nama Pengirim"
                      className="h-8 text-xs bg-white dark:bg-zinc-950 font-semibold"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={data.nipPenandatangan}
                        onChange={(e) => updateField("nipPenandatangan", e.target.value)}
                        placeholder="NIP Pengirim"
                        className="h-8 text-xs bg-white dark:bg-zinc-950 font-mono"
                      />
                      <Input
                        value={data.jabatanPenandatangan}
                        onChange={(e) => updateField("jabatanPenandatangan", e.target.value)}
                        placeholder="Jabatan Pengirim"
                        className="h-8 text-xs bg-white dark:bg-zinc-950"
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
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Pilih dari Database Pegawai</label>
                    <select
                      onChange={(e) => handleSelectEmployee(e.target.value)}
                      className="w-full mt-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="">-- Pilih Pejabat / Pegawai --</option>
                      {employeeOptions?.map((emp: any) => {
                        const empName = emp.nama_lengkap || emp.name || emp.nama || "Tanpa Nama";
                        const empPos = emp.jabatan || emp.position || "";
                        const empNip = emp.nip ? `(NIP. ${emp.nip})` : "";
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
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">Jabatan Penandatangan</label>
                      <Input
                        value={data.jabatanPenandatangan}
                        onChange={(e) => updateField("jabatanPenandatangan", e.target.value)}
                        placeholder="Contoh: Kepala Balai,"
                        className="mt-1 text-xs"
                      />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                      Format {activeTemplate === "nota_dinas" ? "Nota Dinas" : "Memorandum"}: Langsung nama &amp; NIP (jabatan pengirim ada pada &apos;Dari&apos; di kepala surat).
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">Nama Lengkap & Gelar</label>
                      <Input
                        value={data.namaPenandatangan}
                        onChange={(e) => updateField("namaPenandatangan", e.target.value)}
                        placeholder="M. ARI WIBAWANTO, S.Hut., M.Sc."
                        className="mt-1 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">NIP</label>
                      <Input
                        value={data.nipPenandatangan}
                        onChange={(e) => updateField("nipPenandatangan", e.target.value)}
                        placeholder="19740514 199903 1 001"
                        className="mt-1 text-xs font-mono"
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
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                  5. Tembusan ({data.tembusan.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTembusan}
                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700 p-1 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Tembusan
                </Button>
              </div>

              <div className="space-y-2">
                {data.tembusan.map((t, i) => (
                  <div key={t.id || i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 w-4">{data.tembusan.length > 1 ? `${i + 1}.` : ""}</span>
                    <Input
                      value={t.text}
                      onChange={(e) => handleTembusanChange(t.id, e.target.value)}
                      placeholder="Nama instansi/pejabat tembusan..."
                      className="h-8 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTembusan(t.id)}
                      className="text-zinc-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integrasi Info */}
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 text-xs text-zinc-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Otomatis terhubung dengan <strong>Daftar Surat Keluar</strong> BKSDA Kaltim.</span>
            </div>
            <Link
              href="/surat/keluar"
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-1 shrink-0 ml-2"
            >
              Buka Surat Keluar &rarr;
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Live A4 Preview (7 cols on lg) */}
        <div className="lg:col-span-7 sticky top-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/50 p-3 lg:p-6 shadow-sm overflow-x-auto">
            <div className="flex items-center justify-between mb-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Pratinjau A4 Standar Permen 1/2025 ({activeTabMeta.name})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintSuratDinas}
                className="h-7 text-xs gap-1 rounded-lg"
              >
                <Printer className="w-3 h-3" />
                Cetak Dokumen
              </Button>
            </div>

            <div className="flex justify-center">
              <SuratDinasDocument data={deferredData} onUpdateField={updateField} />
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Memuat generator naskah dinas...</div>}>
      <GenerateSuratDinasContent />
    </Suspense>
  );
}
