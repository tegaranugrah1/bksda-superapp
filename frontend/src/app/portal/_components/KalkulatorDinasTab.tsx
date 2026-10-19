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
  Calendar,
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

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatRibuan = (val: number | string): string => {
  if (val === undefined || val === null || val === "") return "";
  const clean = String(val).replace(/[^0-9]/g, "");
  if (!clean) return "";
  return new Intl.NumberFormat("id-ID").format(Number(clean));
};

const parseRibuan = (val: string | number): number => {
  const num = Number(String(val).replace(/[^0-9]/g, "")) || 0;
  return Math.min(num, 10_000_000_000);
};

const getStorageKey = (userName?: string) => {
  const safeUser = (userName || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return safeUser ? `bksda_kalkulator_panjar_${safeUser}` : STORAGE_KEY;
};

const getInitialDraft = (userName?: string) => {
  if (typeof window === "undefined") return null;
  try {
    const key = getStorageKey(userName);
    const saved = localStorage.getItem(key) || (key !== STORAGE_KEY ? localStorage.getItem(STORAGE_KEY) : null);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
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
  const [selectedStId, setSelectedStId] = useState<string>(initialSelectedStId || "");
  const [namaKegiatan, setNamaKegiatan] = useState(
    () => getInitialDraft(currentUserName)?.namaKegiatan ?? "Perjalanan Dinas"
  );
  const [lokasiTujuan, setLokasiTujuan] = useState(
    () => getInitialDraft(currentUserName)?.lokasiTujuan ?? ""
  );
  const [pemegangPanjar, setPemegangPanjar] = useState(
    () => getInitialDraft(currentUserName)?.pemegangPanjar ?? currentUserName
  );
  const [tanggalMulai, setTanggalMulai] = useState(
    () => getInitialDraft(currentUserName)?.tanggalMulai ?? new Date().toISOString().split("T")[0]
  );
  const [tanggalSelesai, setTanggalSelesai] = useState(
    () => getInitialDraft(currentUserName)?.tanggalSelesai ?? new Date().toISOString().split("T")[0]
  );
  const [uangPanjar, setUangPanjar] = useState<number>(
    () => getInitialDraft(currentUserName)?.uangPanjar ?? 0
  );
  const [pengeluaranList, setPengeluaranList] = useState<PengeluaranItem[]>(
    () => getInitialDraft(currentUserName)?.pengeluaranList ?? []
  );


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
    } catch (e: any) {
      if (e?.name === "QuotaExceededError" || e?.code === 22) {
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

    if (!file.type.startsWith("image/")) {
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
  const totalPengeluaran = useMemo(() => {
    return pengeluaranList.reduce((sum, item) => sum + (item.nominal || 0), 0);
  }, [pengeluaranList]);

  const totalSpj = useMemo(() => {
    return pengeluaranList
      .filter((item) => item.isSpj !== false)
      .reduce((sum, item) => sum + (item.nominal || 0), 0);
  }, [pengeluaranList]);

  const totalNonSpj = useMemo(() => {
    return pengeluaranList
      .filter((item) => item.isSpj === false)
      .reduce((sum, item) => sum + (item.nominal || 0), 0);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Kalkulator & Pengeluaran Uang Panjar Perjadin
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan realisasi belanja dari uang muka/panjar bendahara dan hitung sisa kasbon yang harus disetor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            type="button"
            onClick={handleManualSave}
            className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Draf</span>
          </Button>

          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {lastSavedTime}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-xl text-xs font-semibold gap-1.5 h-8 border-slate-200"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak LPJ Panjar</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDraft}
            className="rounded-xl text-xs font-semibold gap-1.5 h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* 3 KARTU STATUS KEUANGAN PANJAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Uang Panjar Diterima */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Uang Panjar Diterima</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {formatRupiah(uangPanjar)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Uang muka kasbon dari Bendahara
          </p>
        </div>

        {/* 2. Total Pengeluaran Riil */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Pengeluaran Riil</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {formatRupiah(totalPengeluaran)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              SPJ: {formatRupiah(totalSpj)}
            </span>
            <span className="font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              Non-SPJ: {formatRupiah(totalNonSpj)}
            </span>
          </div>
        </div>

        {/* 3. Sisa Saldo Panjar */}
        <div
          className={cn(
            "p-4 rounded-2xl border shadow-xs transition-all",
            sisaPanjar >= 0
              ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
              : "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
          )}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {sisaPanjar >= 0 ? "Sisa Panjar di Tangan" : "Kekurangan Biaya (Reimburse)"}
            </span>
            {sisaPanjar >= 0 ? (
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingUp className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <p
            className={cn(
              "text-xl font-extrabold mt-1",
              sisaPanjar >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
            )}
          >
            {formatRupiah(Math.abs(sisaPanjar))}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
            {sisaPanjar >= 0
              ? "Wajib disetor kembali ke Bendahara"
              : "Uang talangan pribadi, perlu diganti Bendahara"}
          </p>
        </div>
      </div>

      {/* TRIP METADATA & UANG PANJAR FORM */}
      <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Identitas Tugas & Uang Panjar
            </h3>
          </div>

          {suratTugasList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Hubungkan ST:</span>
              <select
                value={selectedStId}
                onChange={(e) => setSelectedStId(e.target.value)}
                className="h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="">-- Input Bebas (Tanpa ST) --</option>
                {suratTugasList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nomor_surat || "Draf"} - {st.maksud_tujuan.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          <div className="md:col-span-5 space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Maksud / Kegiatan Perjalanan Dinas:
            </label>
            <Input
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              placeholder="Contoh: Patroli Pengamanan Kawasan SM Balikpapan"
              className="h-8.5 rounded-xl text-xs"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Tujuan / Lokasi:
            </label>
            <Input
              value={lokasiTujuan}
              onChange={(e) => setLokasiTujuan(e.target.value)}
              placeholder="Contoh: Berau / Kutai Barat"
              className="h-8.5 rounded-xl text-xs"
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Pemegang Uang Panjar:
            </label>
            <Input
              value={pemegangPanjar}
              onChange={(e) => setPemegangPanjar(e.target.value)}
              placeholder="Nama Pegawai Pelaksana"
              className="h-8.5 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs items-end">
          <div className="sm:col-span-3 space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Tgl Berangkat:</label>
            <Input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="h-8.5 rounded-xl text-xs"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Tgl Kembali:</label>
            <Input
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="h-8.5 rounded-xl text-xs"
            />
          </div>

          {/* Input Nominal Uang Panjar dengan Preset Cepat */}
          <div className="sm:col-span-6 space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-emerald-800 dark:text-emerald-300">
                Nominal Uang Panjar Diterima (Rp):
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setUangPanjar(5000000)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300"
                >
                  5 Jt
                </button>
                <button
                  type="button"
                  onClick={() => setUangPanjar(10000000)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300"
                >
                  10 Jt
                </button>
                <button
                  type="button"
                  onClick={() => setUangPanjar(15000000)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300"
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
              className="h-8.5 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* FORM PENCATATAN PENGELUARAN BARU */}
      <form
        onSubmit={handleAddPengeluaran}
        className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Catat Pengeluaran dari Uang Panjar
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Ketik nominal dengan pemisah ribuan otomatis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-slate-500">Tanggal:</label>
            <Input
              type="date"
              value={newExp.tanggal}
              onChange={(e) => setNewExp((prev) => ({ ...prev, tanggal: e.target.value }))}
              className="h-8.5 rounded-xl text-xs"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="font-semibold text-slate-500">Keterangan Pengeluaran:</label>
            <Input
              value={newExp.keterangan}
              onChange={(e) => setNewExp((prev) => ({ ...prev, keterangan: e.target.value }))}
              placeholder="Contoh: BBM Mobil Dinas di SPBU Sangatta"
              className="h-8.5 rounded-xl text-xs"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-slate-500">Kategori:</label>
            <select
              value={newExp.kategori}
              onChange={(e) => setNewExp((prev) => ({ ...prev, kategori: e.target.value }))}
              className="w-full h-8.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
            >
              <option value="BBM / Transport">BBM / Transport</option>
              <option value="Tol & Parkir">Tol & Parkir</option>
              <option value="Penginapan / Hotel">Penginapan / Hotel</option>
              <option value="Konsumsi Tim">Konsumsi Tim</option>
              <option value="Sewa Perahu / Kendaraan">Sewa Perahu / Kendaraan</option>
              <option value="Honor Pemandu / Porter">Honor Pemandu / Porter</option>
              <option value="Logistik Patroli">Logistik Patroli</option>
              <option value="Lain-lain">Lain-lain</option>
            </select>
          </div>

          {/* Status SPJ Toggle Button */}
          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-slate-500">Status SPJ:</label>
            <button
              type="button"
              onClick={() => setNewExp((prev) => ({ ...prev, isSpj: !prev.isSpj }))}
              className={cn(
                "w-full h-8.5 rounded-xl text-xs font-bold px-2.5 transition-all flex items-center justify-center gap-1.5 border",
                newExp.isSpj
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
              )}
              title="Klik untuk beralih antara Bisa SPJ atau Non-SPJ"
            >
              <span className={cn("w-2 h-2 rounded-full", newExp.isSpj ? "bg-emerald-500" : "bg-amber-500")} />
              <span>{newExp.isSpj ? "Bisa SPJ" : "Non-SPJ"}</span>
            </button>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-slate-500">Nominal (Rp):</label>
            <Input
              type="text"
              value={newExp.nominal}
              onChange={(e) =>
                setNewExp((prev) => ({ ...prev, nominal: formatRibuan(e.target.value) }))
              }
              placeholder="0"
              className="h-8.5 rounded-xl text-xs font-mono font-bold"
            />
          </div>

          <div className="sm:col-span-1 flex items-end gap-1">
            <input
              type="file"
              accept="image/*"
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
                "h-8.5 px-2 rounded-xl text-xs",
                newExp.notaImage
                  ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                  : "text-slate-600"
              )}
              title="Ambil Foto Nota dari Kamera HP"
            >
              <Camera className="w-4 h-4" />
            </Button>

            <Button
              type="submit"
              className="h-8.5 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2"
              title="Simpan Belanja"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {newExp.notaImage && (
          <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            <span>Foto nota terlampir</span>
            <button
              type="button"
              onClick={() => setNewExp((prev) => ({ ...prev, notaImage: "" }))}
              className="text-rose-600 hover:underline text-[11px]"
            >
              (Hapus foto)
            </button>
          </div>
        )}
      </form>

      {/* DAFTAR TRANSAKSI PENGELUARAN (DENGAN INLINE EDITING) */}
      <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Rincian Pengeluaran dari Uang Panjar ({pengeluaranList.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Klik ikon pensil untuk mengedit nominal, keterangan, atau status SPJ langsung di baris.
            </p>
          </div>

          {/* Filter Tab SPJ vs Non-SPJ */}
          {pengeluaranList.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterSpj("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  filterSpj === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Semua ({pengeluaranList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSpj("spj")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  filterSpj === "spj"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/60"
                )}
              >
                Bisa SPJ ({pengeluaranList.filter((x) => x.isSpj !== false).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSpj("non_spj")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  filterSpj === "non_spj"
                    ? "bg-amber-600 text-white shadow-xs font-bold"
                    : "text-amber-700 dark:text-amber-400 hover:bg-amber-50/60"
                )}
              >
                Non-SPJ ({pengeluaranList.filter((x) => x.isSpj === false).length})
              </button>
            </div>
          )}
        </div>

        {pengeluaranList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-1">
            <Receipt className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-xs">Belum ada pengeluaran yang dicatat dari uang panjar.</p>
          </div>
        ) : displayedPengeluaranList.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            Tidak ada transaksi pada filter ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedPengeluaranList.map((item, idx) => (
              <div key={item.id} className="py-2.5">
                {editingExpId === item.id ? (
                  /* INLINE EDIT ROW */
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-emerald-300 dark:border-emerald-700 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 px-1">#{idx + 1}</span>
                    <Input
                      type="date"
                      value={editExpData.tanggal}
                      onChange={(e) =>
                        setEditExpData((prev) => ({ ...prev, tanggal: e.target.value }))
                      }
                      className="h-8 text-xs w-32"
                    />
                    <Input
                      value={editExpData.keterangan}
                      onChange={(e) =>
                        setEditExpData((prev) => ({ ...prev, keterangan: e.target.value }))
                      }
                      className="h-8 text-xs flex-1 min-w-[150px]"
                      placeholder="Keterangan Pengeluaran"
                    />
                    <select
                      value={editExpData.kategori}
                      onChange={(e) =>
                        setEditExpData((prev) => ({ ...prev, kategori: e.target.value }))
                      }
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                    >
                      <option value="BBM / Transport">BBM / Transport</option>
                      <option value="Tol & Parkir">Tol & Parkir</option>
                      <option value="Penginapan / Hotel">Penginapan / Hotel</option>
                      <option value="Konsumsi Tim">Konsumsi Tim</option>
                      <option value="Sewa Perahu / Kendaraan">Sewa Perahu / Kendaraan</option>
                      <option value="Honor Pemandu / Porter">Honor Pemandu / Porter</option>
                      <option value="Logistik Patroli">Logistik Patroli</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </select>

                    {/* Toggle Status SPJ saat Edit */}
                    <button
                      type="button"
                      onClick={() =>
                        setEditExpData((prev) => ({ ...prev, isSpj: !prev.isSpj }))
                      }
                      className={cn(
                        "h-8 px-2 rounded-lg text-xs font-bold border transition-all shrink-0",
                        editExpData.isSpj
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-amber-50 text-amber-700 border-amber-300"
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
                      className="h-8 text-xs font-mono font-bold w-28 text-right"
                      placeholder="0"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveEdit(item.id)}
                        className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 text-xs font-bold"
                        title="Simpan Perubahan"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Simpan</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-8 px-2 text-slate-500 hover:bg-slate-200 rounded-lg"
                        title="Batal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* NORMAL ROW WITH PENCIL & TRASH BUTTONS */
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-[11px] font-bold text-slate-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.keterangan}
                          </p>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                              item.isSpj !== false
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            )}
                          >
                            {item.isSpj !== false ? "Bisa SPJ" : "Non-SPJ"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{item.tanggal}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {item.kategori}
                          </span>
                          {item.notaImage && (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <ImageIcon className="w-3 h-3" /> Ada Nota
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mr-2">
                        {formatRupiah(item.nominal)}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(item)}
                        className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                        title="Edit Pengeluaran"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePengeluaran(item.id)}
                        className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                        title="Hapus Pengeluaran"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
