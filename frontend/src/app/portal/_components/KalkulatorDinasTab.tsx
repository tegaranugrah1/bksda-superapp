"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  Printer,
  RotateCcw,
  Camera,
  FileText,
  Receipt,
  Image as ImageIcon,
  Check,
  X,
  Pencil,
  Save,
  TrendingDown,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

export interface SuratTugasSimpleOption {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tempat_tujuan?: string | null;
}

interface PengeluaranItem {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori: string;
  nominal: number;
  notaImage?: string;
  isSpj?: boolean;
}



const STORAGE_KEY = "bksda_kalkulator_panjar_v2";
const KATEGORI_OPTIONS = [
  "BBM / Transport",
  "Tol & Parkir",
  "Penginapan / Hotel",
  "Konsumsi Tim",
  "Sewa Perahu / Kendaraan",
  "Honor Pemandu / Porter",
  "Logistik Patroli",
  "Lain-lain",
] as const;

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatRibuan = (val: number | string): string => {
  const clean = String(val ?? "").replace(/\D/g, "");
  return clean ? new Intl.NumberFormat("id-ID").format(Number(clean)) : "";
};

const parseRibuan = (val: string | number): number =>
  Math.min(Number(String(val ?? "").replace(/\D/g, "")) || 0, 10_000_000_000);


const getStorageKey = (userName?: string) => {
  const safeUser = (userName || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return safeUser ? `bksda_kalkulator_panjar_${safeUser}` : STORAGE_KEY;
};

export function KalkulatorDinasTab({
  suratTugasList = [],
  currentUserName = "Pegawai BKSDA",
  initialSelectedStId,
}: {
  suratTugasList?: SuratTugasSimpleOption[];
  currentUserName?: string;
  initialSelectedStId?: string;
}) {
  const confirm = useConfirm();
  const storageKey = useMemo(() => getStorageKey(currentUserName), [currentUserName]);

  // Synchronous hydration to prevent data loss on F5
  const [initialDraft] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [selectedStId, setSelectedStId] = useState<string>(initialSelectedStId || "");
  const [namaKegiatan, setNamaKegiatan] = useState(initialDraft?.namaKegiatan ?? "Perjalanan Dinas");
  const [lokasiTujuan, setLokasiTujuan] = useState(initialDraft?.lokasiTujuan ?? "");
  const [pemegangPanjar, setPemegangPanjar] = useState(initialDraft?.pemegangPanjar ?? currentUserName);
  const [tanggalMulai, setTanggalMulai] = useState(initialDraft?.tanggalMulai ?? new Date().toISOString().split("T")[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(initialDraft?.tanggalSelesai ?? new Date().toISOString().split("T")[0]);
  const [uangPanjar, setUangPanjar] = useState<number>(initialDraft?.uangPanjar ?? 0);
  const [pengeluaranList, setPengeluaranList] = useState<PengeluaranItem[]>(initialDraft?.pengeluaranList ?? []);


  // New expense form inline state
  const [newExp, setNewExp] = useState({
    keterangan: "",
    kategori: "BBM / Transport",
    nominal: "",
    tanggal: new Date().toISOString().split("T")[0],
    notaImage: "",
    isSpj: true,
  });

  // Filter status SPJ di tabel (all / spj / non_spj)
  const [filterSpj, setFilterSpj] = useState<"all" | "spj" | "non_spj">("all");

  // Inline row edit state
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editExpData, setEditExpData] = useState<{
    tanggal: string;
    keterangan: string;
    kategori: string;
    nominal: string;
    notaImage?: string;
    isSpj: boolean;
  }>({
    tanggal: "",
    keterangan: "",
    kategori: "BBM / Transport",
    nominal: "",
    isSpj: true,
  });

  const [lastSavedTime, setLastSavedTime] = useState<string>("Tersimpan Otomatis");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jumlahHari = useMemo(() => {
    if (!tanggalMulai || !tanggalSelesai) return 1;
    const d1 = new Date(tanggalMulai);
    const d2 = new Date(tanggalSelesai);
    const diffTime = d2.getTime() - d1.getTime();
    if (Number.isNaN(diffTime)) return 1;
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [tanggalMulai, tanggalSelesai]);

  // Sync state from selected Surat Tugas
  useEffect(() => {
    if (!selectedStId) return;
    const cleanSelected = String(selectedStId).replace(/^st-/, "");
    const st = suratTugasList.find(
      (s) => String(s.id) === String(selectedStId) || String(s.id).replace(/^st-/, "") === cleanSelected
    );
    if (st) {
      setNamaKegiatan(st.maksud_tujuan || "Perjalanan Dinas");
      if (st.tempat_tujuan) setLokasiTujuan(st.tempat_tujuan);
      if (st.tanggal_mulai) setTanggalMulai(st.tanggal_mulai.split("T")[0]);
      if (st.tanggal_selesai) setTanggalSelesai(st.tanggal_selesai.split("T")[0]);
      toast.success("Data Surat Tugas dimuat ke form panjar.");
    }
  }, [selectedStId, suratTugasList]);

  // Save state helper
  const saveStateToStorage = (notify = false) => {
    const dataToSave = {
      namaKegiatan,
      lokasiTujuan,
      pemegangPanjar,
      tanggalMulai,
      tanggalSelesai,
      uangPanjar,
      pengeluaranList,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setLastSavedTime(`Tersimpan pk ${timeStr}`);
      if (notify) {
        toast.success("Draf pertanggungjawaban panjar berhasil disimpan!");
      }
    } catch (e: unknown) {
      const err = e as { name?: string; code?: number };
      if (err?.name === "QuotaExceededError" || err?.code === 22) {
        toast.warning("Memori penyimpanan peramban penuh karena lampiran foto nota. Mohon kurangi lampiran gambar.");
      } else if (notify) {
        toast.error("Gagal menyimpan draf.");
      }
    }
  };

  // Auto-save on every state change
  useEffect(() => {
    saveStateToStorage(false);
  }, [namaKegiatan, lokasiTujuan, pemegangPanjar, tanggalMulai, tanggalSelesai, uangPanjar, pengeluaranList]);

  const handleManualSave = () => {
    saveStateToStorage(true);
  };

  // Photo receipt compressor
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("File nota harus berupa gambar (JPG, PNG, atau WEBP).");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran foto nota maksimal 10 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setNewExp((prev) => ({ ...prev, notaImage: dataUrl }));
        toast.success("Foto nota berhasil dilampirkan.");
      };
      img.onerror = () => {
        toast.error("Gagal memproses gambar nota. Format file tidak valid.");
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      toast.error("Gagal membaca file foto nota.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Add new expense
  const handleAddPengeluaran = (e: React.FormEvent) => {
    e.preventDefault();
    const nominalNum = parseRibuan(newExp.nominal);
    if (nominalNum <= 0) {
      toast.error("Nominal pengeluaran harus lebih dari 0.");
      return;
    }
    if (!newExp.keterangan.trim()) {
      toast.error("Keterangan pengeluaran wajib diisi.");
      return;
    }

    const item: PengeluaranItem = {
      id: `exp-${Date.now()}`,
      tanggal: newExp.tanggal,
      keterangan: newExp.keterangan.trim(),
      kategori: newExp.kategori,
      nominal: nominalNum,
      notaImage: newExp.notaImage,
      isSpj: newExp.isSpj,
    };

    setPengeluaranList((prev) => [item, ...prev]);
    setNewExp({
      keterangan: "",
      kategori: "BBM / Transport",
      nominal: "",
      tanggal: new Date().toISOString().split("T")[0],
      notaImage: "",
      isSpj: true,
    });
    toast.success("Pengeluaran berhasil dicatat.");
  };

  const handleRemovePengeluaran = (id: string) => {
    setPengeluaranList((prev) => prev.filter((item) => item.id !== id));
  };

  // Inline edit handlers
  const handleStartEdit = (item: PengeluaranItem) => {
    setEditingExpId(item.id);
    setEditExpData({
      tanggal: item.tanggal,
      keterangan: item.keterangan,
      kategori: item.kategori,
      nominal: formatRibuan(item.nominal),
      notaImage: item.notaImage,
      isSpj: item.isSpj !== false,
    });
  };

  const handleSaveEdit = (id: string) => {
    const nominalNum = parseRibuan(editExpData.nominal);
    if (nominalNum <= 0) {
      toast.error("Nominal pengeluaran harus lebih dari 0.");
      return;
    }
    if (!editExpData.keterangan.trim()) {
      toast.error("Keterangan pengeluaran wajib diisi.");
      return;
    }

    setPengeluaranList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              tanggal: editExpData.tanggal,
              keterangan: editExpData.keterangan.trim(),
              kategori: editExpData.kategori,
              nominal: nominalNum,
              notaImage: editExpData.notaImage,
              isSpj: editExpData.isSpj,
            }
          : item
      )
    );
    setEditingExpId(null);
    toast.success("Perubahan pengeluaran berhasil disimpan.");
  };

  const handleCancelEdit = () => {
    setEditingExpId(null);
  };

  // Reset Draft
  const handleResetDraft = async () => {
    const ok = await confirm({
      title: "Reset Kalkulator Panjar?",
      description: "Seluruh draf dan rincian pengeluaran uang panjar akan dikosongkan dan dikembalikan ke awal.",
      confirmText: "Ya, Reset Draf",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!ok) return;

    localStorage.removeItem(storageKey);
    localStorage.removeItem(STORAGE_KEY);
    setSelectedStId("");
    setNamaKegiatan("Perjalanan Dinas");
    setLokasiTujuan("");
    setPemegangPanjar(currentUserName);
    setTanggalMulai(new Date().toISOString().split("T")[0]);
    setTanggalSelesai(new Date().toISOString().split("T")[0]);
    setUangPanjar(0);
    setPengeluaranList([]);
    setFilterSpj("all");
    toast.success("Kalkulator di-reset ke kondisi awal.");
  };

  // Calculations
  const { totalPengeluaran, totalSpj, totalNonSpj } = useMemo(() => {
    let totalPengeluaran = 0, totalSpj = 0, totalNonSpj = 0;
    for (const item of pengeluaranList) {
      const nom = item.nominal || 0;
      totalPengeluaran += nom;
      if (item.isSpj !== false) totalSpj += nom;
      else totalNonSpj += nom;
    }
    return { totalPengeluaran, totalSpj, totalNonSpj };
  }, [pengeluaranList]);

  const sisaPanjar = uangPanjar - totalPengeluaran;

  const displayedPengeluaranList = useMemo(() => {
    if (filterSpj === "spj") {
      return pengeluaranList.filter((item) => item.isSpj !== false);
    }
    if (filterSpj === "non_spj") {
      return pengeluaranList.filter((item) => item.isSpj === false);
    }
    return pengeluaranList;
  }, [pengeluaranList, filterSpj]);


  return (
    <div className="w-full">
      {/* INTERACTIVE WEB UI (DISEMBUNYIKAN PENUH SAAT CETAK) */}
      <div className="space-y-6 print:hidden">
        {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3 border-b border-slate-200/70 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] flex items-center justify-center shadow-xs shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-[var(--ds-fg)]">
              Kalkulator & Pengeluaran Uang Panjar Perjadin
            </h2>
          </div>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
            Pencatatan realisasi belanja dari uang muka/panjar bendahara dan hitung sisa kasbon yang harus disetor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            type="button"
            onClick={handleManualSave}
            className="rounded-lg text-xs font-bold gap-2 h-9 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Draf</span>
          </Button>

          <span className="text-xs text-[var(--ds-fg-muted)] font-medium px-3 py-1 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 tabular-nums">
            {lastSavedTime}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-lg text-xs font-semibold gap-2 h-9 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak LPJ Panjar</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDraft}
            className="rounded-lg text-xs font-semibold gap-2 h-9 text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* 3 KARTU STATUS KEUANGAN PANJAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Uang Panjar Diterima */}
        <div className="p-4 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-[var(--ds-fg-muted)]">
            <span className="text-xs font-bold uppercase tracking-wider">Uang Panjar Diterima</span>
            <CreditCard className="w-4 h-4 text-[var(--ds-accent-fg)]" />
          </div>
          <p className="text-xl font-bold text-[var(--ds-fg)] mt-1 tabular-nums">
            {formatRupiah(uangPanjar)}
          </p>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
            Uang muka kasbon dari Bendahara
          </p>
        </div>

        {/* 2. Total Pengeluaran Riil */}
        <div className="p-4 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-[var(--ds-fg-muted)]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pengeluaran Riil</span>
            <Receipt className="w-4 h-4 text-[var(--ds-status-warning-fg)]" />
          </div>
          <p className="text-xl font-bold text-[var(--ds-status-warning-fg)] mt-1 tabular-nums">
            {formatRupiah(totalPengeluaran)}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs tabular-nums">
            <span className="font-semibold text-[var(--ds-status-success-fg)] bg-[var(--ds-status-success-bg)] px-2 py-0 rounded-lg border border-[var(--ds-status-success-border)]">
              SPJ: {formatRupiah(totalSpj)}
            </span>
            <span className="font-semibold text-[var(--ds-status-warning-fg)] bg-[var(--ds-status-warning-bg)] px-2 py-0 rounded-lg border border-[var(--ds-status-warning-border)]">
              Non-SPJ: {formatRupiah(totalNonSpj)}
            </span>
          </div>
        </div>

        {/* 3. Sisa Saldo Panjar */}
        <div
          className={cn(
            "p-4 rounded-lg border shadow-xs transition-colors",
            sisaPanjar >= 0
              ? "bg-[var(--ds-status-success-bg)] border-[var(--ds-status-success-border)]"
              : "bg-[var(--ds-status-danger-bg)] border-[var(--ds-status-danger-border)]"
          )}
        >
          <div className="flex items-center justify-between text-[var(--ds-fg-muted)]">
            <span className="text-xs font-bold uppercase tracking-wider">
              {sisaPanjar >= 0 ? "Sisa Panjar di Tangan" : "Kekurangan Biaya (Reimburse)"}
            </span>
            {sisaPanjar >= 0 ? (
              <TrendingDown className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
            ) : (
              <TrendingUp className="w-4 h-4 text-[var(--ds-status-danger-fg)]" />
            )}
          </div>
          <p
            className={cn(
              "text-xl font-bold mt-1 tabular-nums",
              sisaPanjar >= 0 ? "text-[var(--ds-status-success-fg)]" : "text-[var(--ds-status-danger-fg)]"
            )}
          >
            {formatRupiah(Math.abs(sisaPanjar))}
          </p>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1 font-medium">
            {sisaPanjar >= 0
              ? "Wajib disetor kembali ke Bendahara"
              : "Uang talangan pribadi, perlu diganti Bendahara"}
          </p>
        </div>
      </div>

      {/* TRIP METADATA & UANG PANJAR FORM */}
      <div className="p-4 sm:p-6 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg)]">
              Identitas Tugas & Uang Panjar
            </h3>
          </div>

          {suratTugasList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Hubungkan ST:</span>
              <select
                value={selectedStId}
                onChange={(e) => setSelectedStId(e.target.value)}
                className="h-9 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] px-3 text-xs font-medium text-[var(--ds-fg)]"
              >
                <option value="">-- Input Bebas (Tanpa ST) --</option>
                {suratTugasList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nomor_surat || "Draf"} - {(st.maksud_tujuan || "").slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          <div className="md:col-span-5 space-y-1">
            <label className="font-semibold text-[var(--ds-fg)]">
              Maksud / Kegiatan Perjalanan Dinas:
            </label>
            <Input
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              placeholder="Contoh: Patroli Pengamanan Kawasan SM Balikpapan"
              className="h-9 rounded-lg text-xs"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="font-semibold text-[var(--ds-fg)]">
              Tujuan / Lokasi:
            </label>
            <Input
              value={lokasiTujuan}
              onChange={(e) => setLokasiTujuan(e.target.value)}
              placeholder="Contoh: Berau / Kutai Barat"
              className="h-9 rounded-lg text-xs"
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="font-semibold text-[var(--ds-fg)]">
              Pemegang Uang Panjar:
            </label>
            <Input
              value={pemegangPanjar}
              onChange={(e) => setPemegangPanjar(e.target.value)}
              placeholder="Nama Pegawai Pelaksana"
              className="h-9 rounded-lg text-xs font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-200/70 dark:border-zinc-800 text-xs items-end">
          <div className="sm:col-span-3 space-y-1">
            <label className="font-semibold text-[var(--ds-fg)]">Tgl Berangkat:</label>
            <Input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="h-9 rounded-lg text-xs tabular-nums"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="font-semibold text-[var(--ds-fg)]">Tgl Kembali:</label>
            <Input
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="h-9 rounded-lg text-xs tabular-nums"
            />
          </div>

          {/* Input Nominal Uang Panjar dengan Preset Cepat */}
          <div className="sm:col-span-6 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="font-bold text-[var(--ds-accent-fg)]">
                Nominal Uang Panjar Diterima (Rp):
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setUangPanjar(5000000)}
                  className="px-2 py-0 rounded-lg text-xs bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-secondary-hover)] border border-slate-200/80 dark:border-zinc-800 font-semibold text-[var(--ds-fg)] cursor-pointer tabular-nums"
                >
                  5 Jt
                </button>
                <button
                  type="button"
                  onClick={() => setUangPanjar(10000000)}
                  className="px-2 py-0 rounded-lg text-xs bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-secondary-hover)] border border-slate-200/80 dark:border-zinc-800 font-semibold text-[var(--ds-fg)] cursor-pointer tabular-nums"
                >
                  10 Jt
                </button>
                <button
                  type="button"
                  onClick={() => setUangPanjar(15000000)}
                  className="px-2 py-0 rounded-lg text-xs bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-secondary-hover)] border border-slate-200/80 dark:border-zinc-800 font-semibold text-[var(--ds-fg)] cursor-pointer tabular-nums"
                >
                  15 Jt
                </button>
              </div>
            </div>
            <Input
              type="text"
              value={formatRibuan(uangPanjar)}
              onChange={(e) => setUangPanjar(parseRibuan(e.target.value))}
              placeholder="0 (Masukkan nominal panjar)"
              className="h-9 rounded-lg text-xs font-mono font-bold text-[var(--ds-fg)] tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* FORM PENCATATAN PENGELUARAN BARU */}
      <form
        onSubmit={handleAddPengeluaran}
        className="p-4 sm:p-6 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg)]">
              Catat Pengeluaran dari Uang Panjar
            </h3>
          </div>
          <span className="text-xs text-[var(--ds-fg-muted)]">
            Ketik nominal dengan pemisah ribuan otomatis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-[var(--ds-fg-muted)]">Tanggal:</label>
            <Input
              type="date"
              value={newExp.tanggal}
              onChange={(e) => setNewExp((prev) => ({ ...prev, tanggal: e.target.value }))}
              className="h-9 rounded-lg text-xs tabular-nums"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="font-semibold text-[var(--ds-fg-muted)]">Keterangan Pengeluaran:</label>
            <Input
              value={newExp.keterangan}
              onChange={(e) => setNewExp((prev) => ({ ...prev, keterangan: e.target.value }))}
              placeholder="Contoh: BBM Mobil Dinas di SPBU Sangatta"
              className="h-9 rounded-lg text-xs"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-[var(--ds-fg-muted)]">Kategori:</label>
            <select
              value={newExp.kategori}
              onChange={(e) => setNewExp((prev) => ({ ...prev, kategori: e.target.value }))}
              className="w-full h-9 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs font-medium text-[var(--ds-fg)]"
            >
              {KATEGORI_OPTIONS.map((kat) => (
                <option key={kat} value={kat}>{kat}</option>
              ))}
            </select>
          </div>

          {/* Status SPJ Toggle Button */}
          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-[var(--ds-fg-muted)]">Status SPJ:</label>
            <button
              type="button"
              onClick={() => setNewExp((prev) => ({ ...prev, isSpj: !prev.isSpj }))}
              className={cn(
                "w-full h-9 rounded-lg text-xs font-bold px-3 transition-colors flex items-center justify-center gap-2 border cursor-pointer",
                newExp.isSpj
                  ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]"
                  : "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]"
              )}
              title="Klik untuk beralih antara Bisa SPJ atau Non-SPJ"
            >
              <span className={cn("w-2 h-2 rounded-full", newExp.isSpj ? "bg-[var(--ds-status-success-fg)]" : "bg-[var(--ds-status-warning-fg)]")} />
              <span>{newExp.isSpj ? "Bisa SPJ" : "Non-SPJ"}</span>
            </button>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-[var(--ds-fg-muted)]">Nominal (Rp):</label>
            <Input
              type="text"
              value={newExp.nominal}
              onChange={(e) =>
                setNewExp((prev) => ({ ...prev, nominal: formatRibuan(e.target.value) }))
              }
              placeholder="0"
              className="h-9 rounded-lg text-xs font-mono font-bold tabular-nums"
            />
          </div>

          <div className="sm:col-span-1 flex items-end gap-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "h-9 px-2 rounded-lg text-xs cursor-pointer",
                newExp.notaImage
                  ? "border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)]"
                  : "text-[var(--ds-fg-muted)]"
              )}
              title="Ambil Foto Nota dari Kamera HP"
            >
              <Camera className="w-4 h-4" />
            </Button>

            <Button
              type="submit"
              className="h-9 flex-1 rounded-lg bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs px-2 cursor-pointer shadow-xs"
              title="Simpan Belanja"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {newExp.notaImage && (
          <div className="flex items-center gap-2 pt-1 text-xs text-[var(--ds-status-success-fg)]">
            <Check className="w-4 h-4" />
            <span>Foto nota terlampir</span>
            <button
              type="button"
              onClick={() => setNewExp((prev) => ({ ...prev, notaImage: "" }))}
              className="text-[var(--ds-status-danger-fg)] hover:underline text-xs cursor-pointer"
            >
              (Hapus foto)
            </button>
          </div>
        )}
      </form>

      {/* DAFTAR TRANSAKSI PENGELUARAN (DENGAN INLINE EDITING) */}
      <div className="p-4 sm:p-6 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg)] tabular-nums">
              Rincian Pengeluaran dari Uang Panjar ({pengeluaranList.length})
            </h3>
            <p className="text-xs text-[var(--ds-fg-muted)]">
              Klik ikon pensil untuk mengedit nominal, keterangan, atau status SPJ langsung di baris.
            </p>
          </div>

          {/* Filter Tab SPJ vs Non-SPJ */}
          {pengeluaranList.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg text-xs font-medium tabular-nums">
              <button
                type="button"
                onClick={() => setFilterSpj("all")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-colors cursor-pointer",
                  filterSpj === "all"
                    ? "bg-[var(--ds-surface)] text-[var(--ds-fg)] border-slate-200/80 dark:border-zinc-800 shadow-xs font-bold"
                    : "border-transparent text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                )}
              >
                Semua ({pengeluaranList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSpj("spj")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-colors cursor-pointer",
                  filterSpj === "spj"
                    ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)] shadow-xs font-bold"
                    : "border-transparent text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)]"
                )}
              >
                Bisa SPJ ({pengeluaranList.filter((x) => x.isSpj !== false).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSpj("non_spj")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-colors cursor-pointer",
                  filterSpj === "non_spj"
                    ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)] shadow-xs font-bold"
                    : "border-transparent text-[var(--ds-status-warning-fg)] hover:bg-[var(--ds-status-warning-bg)]"
                )}
              >
                Non-SPJ ({pengeluaranList.filter((x) => x.isSpj === false).length})
              </button>
            </div>
          )}
        </div>

        {pengeluaranList.length === 0 ? (
          <div className="text-center py-8 text-[var(--ds-fg-muted)] space-y-1">
            <Receipt className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-xs">Belum ada pengeluaran yang dicatat dari uang panjar.</p>
          </div>
        ) : displayedPengeluaranList.length === 0 ? (
          <div className="text-center py-6 text-[var(--ds-fg-muted)] text-xs">
            Tidak ada transaksi pada filter ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/70 dark:divide-zinc-800">
            {displayedPengeluaranList.map((item, idx) => (
              <div key={item.id} className="py-3">
                {editingExpId === item.id ? (
                  /* INLINE EDIT ROW */
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 rounded-lg bg-[var(--ds-surface-muted)] border border-[var(--ds-accent-soft-border)] text-xs">
                    <span className="text-xs font-bold text-[var(--ds-fg-muted)] px-1 tabular-nums">#{idx + 1}</span>
                    <Input
                      type="date"
                      value={editExpData.tanggal}
                      onChange={(e) =>
                        setEditExpData((prev) => ({ ...prev, tanggal: e.target.value }))
                      }
                      className="h-8 text-xs w-32 rounded-lg tabular-nums"
                    />
                    <Input
                      value={editExpData.keterangan}
                      onChange={(e) =>
                        setEditExpData((prev) => ({ ...prev, keterangan: e.target.value }))
                      }
                      className="h-8 text-xs flex-1 min-w-40 rounded-lg"
                      placeholder="Keterangan Pengeluaran"
                    />
                    <select
                      value={editExpData.kategori}
                      onChange={(e) =>
                        setEditExpData((prev) => ({ ...prev, kategori: e.target.value }))
                      }
                      className="h-8 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg)]"
                    >
                      {KATEGORI_OPTIONS.map((kat) => (
                        <option key={kat} value={kat}>{kat}</option>
                      ))}
                    </select>

                    {/* Toggle Status SPJ saat Edit */}
                    <button
                      type="button"
                      onClick={() =>
                        setEditExpData((prev) => ({ ...prev, isSpj: !prev.isSpj }))
                      }
                      className={cn(
                        "h-8 px-2 rounded-lg text-xs font-bold border transition-colors shrink-0 cursor-pointer",
                        editExpData.isSpj
                          ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]"
                          : "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]"
                      )}
                      title="Klik untuk beralih status SPJ"
                    >
                      {editExpData.isSpj ? "Bisa SPJ" : "Non-SPJ"}
                    </button>

                    <Input
                      type="text"
                      value={editExpData.nominal}
                      onChange={(e) =>
                        setEditExpData((prev) => ({
                          ...prev,
                          nominal: formatRibuan(e.target.value),
                        }))
                      }
                      className="h-8 text-xs font-mono font-bold w-28 text-right rounded-lg tabular-nums"
                      placeholder="0"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveEdit(item.id)}
                        className="h-8 px-3 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg gap-1 text-xs font-bold cursor-pointer"
                        title="Simpan Perubahan"
                      >
                        <Check className="w-4 h-4" />
                        <span className="hidden sm:inline">Simpan</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-8 px-2 text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface)] rounded-lg cursor-pointer"
                        title="Batal"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* NORMAL ROW WITH PENCIL & TRASH BUTTONS */
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-xs font-bold text-[var(--ds-fg-muted)] shrink-0 tabular-nums">
                        #{idx + 1}
                      </span>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[var(--ds-fg)] truncate">
                            {item.keterangan}
                          </p>
                          <span
                            className={cn(
                              "text-xs font-bold px-2 py-0 rounded-full border shrink-0",
                              item.isSpj !== false
                                ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]"
                                : "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]"
                            )}
                          >
                            {item.isSpj !== false ? "Bisa SPJ" : "Non-SPJ"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--ds-fg-muted)] tabular-nums">
                          <span>{item.tanggal}</span>
                          <span>•</span>
                          <span className="px-2 py-0 rounded-full bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)] font-medium">
                            {item.kategori}
                          </span>
                          {item.notaImage && (
                            <span className="flex items-center gap-1 text-[var(--ds-accent-fg)] font-semibold">
                              <ImageIcon className="w-3 h-3" /> Ada Nota
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-[var(--ds-fg)] mr-2 tabular-nums">
                        {formatRupiah(item.nominal)}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(item)}
                        className="h-8 w-8 p-0 rounded-lg text-[var(--ds-status-info-fg)] hover:bg-[var(--ds-status-info-bg)] cursor-pointer"
                        title="Edit Pengeluaran"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePengeluaran(item.id)}
                        className="h-8 w-8 p-0 rounded-lg text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] cursor-pointer"
                        title="Hapus Pengeluaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      </div>

      {/* PRINT-ONLY OFFICIAL LPJ SHEET */}
      <div className="hidden print:block text-black p-0 sm:p-2 space-y-4 font-sans text-xs w-full bg-white">
        <div className="text-center border-b pb-3 mb-4">
          <h1 className="text-sm font-bold uppercase">
            Kementerian Lingkungan Hidup dan Kehutanan
          </h1>
          <h2 className="text-xs font-semibold uppercase">
            Balai Konservasi Sumber Daya Alam Kalimantan Timur
          </h2>
          <p className="text-[11px] font-bold mt-1 tracking-wide">
            LAPORAN PERTANGGUNGJAWABAN PENGGUNAAN UANG PANJAR PERJALANAN DINAS
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <p><strong>Kegiatan:</strong> {namaKegiatan}</p>
            <p><strong>Tujuan:</strong> {lokasiTujuan}</p>
          </div>
          <div>
            <p><strong>Jadwal Pelaksanaan:</strong> {tanggalMulai} s/d {tanggalSelesai} ({jumlahHari} Hari)</p>
            <p><strong>Pemegang Panjar:</strong> {pemegangPanjar}</p>
          </div>
        </div>

        {/* Tabel Ringkasan Kas Panjar */}
        <div className="border border-black p-3 space-y-1.5 text-[11px] my-3 bg-slate-50">
          <div className="flex justify-between font-bold">
            <span>1. JUMLAH UANG PANJAR DITERIMA:</span>
            <span>{formatRupiah(uangPanjar)}</span>
          </div>
          <div className="flex justify-between text-[11px] pl-3 text-slate-700">
            <span>• Realisasi Belanja Bisa SPJ:</span>
            <span>{formatRupiah(totalSpj)}</span>
          </div>
          <div className="flex justify-between text-[11px] pl-3 text-slate-700">
            <span>• Belanja Non-SPJ (Operasional):</span>
            <span>{formatRupiah(totalNonSpj)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-dashed border-black/40 pt-1">
            <span>2. REALISASI TOTAL PENGELUARAN:</span>
            <span>{formatRupiah(totalPengeluaran)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-black pt-1">
            <span>
              {sisaPanjar >= 0 ? "3. SISA UANG PANJAR DISETOR KEMBALI:" : "3. KEKURANGAN BIAYA (REIMBURSE):"}
            </span>
            <span>{formatRupiah(Math.abs(sisaPanjar))}</span>
          </div>
        </div>

        {/* Tabel Rincian Belanja */}
        <h3 className="font-bold text-[11px] mt-4 uppercase">Rincian Pengeluaran Bukti Kas:</h3>
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-1 text-center w-8">No</th>
              <th className="border border-black p-1 text-left w-20">Tanggal</th>
              <th className="border border-black p-1 text-left">Uraian Keperluan / Belanja</th>
              <th className="border border-black p-1 text-left w-24">Kategori</th>
              <th className="border border-black p-1 text-center w-20">Status SPJ</th>
              <th className="border border-black p-1 text-right w-24">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {pengeluaranList.map((item, i) => (
              <tr key={item.id}>
                <td className="border border-black p-1 text-center">{i + 1}</td>
                <td className="border border-black p-1">{item.tanggal}</td>
                <td className="border border-black p-1">{item.keterangan}</td>
                <td className="border border-black p-1">{item.kategori}</td>
                <td className="border border-black p-1 text-center font-medium">
                  {item.isSpj !== false ? "Bisa SPJ" : "Non-SPJ"}
                </td>
                <td className="border border-black p-1 text-right font-mono">
                  {formatRupiah(item.nominal)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50/70 text-[9.5px]">
              <td colSpan={5} className="border border-black p-1 text-right font-semibold">
                SUBTOTAL BELANJA BISA SPJ:
              </td>
              <td className="border border-black p-1 text-right font-mono font-semibold">
                {formatRupiah(totalSpj)}
              </td>
            </tr>
            <tr className="bg-slate-50/70 text-[9.5px]">
              <td colSpan={5} className="border border-black p-1 text-right font-semibold">
                SUBTOTAL BELANJA NON-SPJ:
              </td>
              <td className="border border-black p-1 text-right font-mono font-semibold">
                {formatRupiah(totalNonSpj)}
              </td>
            </tr>
            <tr className="font-bold bg-slate-100">
              <td colSpan={5} className="border border-black p-1.5 text-right">
                TOTAL PENGELUARAN KESELURUHAN:
              </td>
              <td className="border border-black p-1.5 text-right font-mono">
                {formatRupiah(totalPengeluaran)}
              </td>
            </tr>
          </tbody>
        </table>


        {/* Lampiran Foto Nota */}
        {pengeluaranList.some((item) => item.notaImage) && (
          <div className="pt-6 page-break-before">
            <h3 className="font-bold text-[11px] mb-3 uppercase">
              Lampiran Bukti Nota & Kuitansi Belanja:
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {pengeluaranList
                .filter((item) => item.notaImage)
                .map((item, i) => (
                  <div key={item.id} className="border p-2 rounded text-[10px] space-y-1">
                    <p className="font-bold">
                      #{i + 1} {item.keterangan} ({formatRupiah(item.nominal)})
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.notaImage}
                      alt={item.keterangan}
                      className="max-h-48 object-contain w-full rounded border"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
