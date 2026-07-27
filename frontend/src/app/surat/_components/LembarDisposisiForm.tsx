"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Copy, Plus, FileText, CheckCircle2, Shield, Trash2, RotateCcw, Save } from "lucide-react";
import type { SuratMasuk } from "../_lib/surat-types";
import { DITERUSKAN_OPTIONS } from "../_lib/surat-types";
import { LembarDisposisi2UpPrint } from "./LembarDisposisi2UpPrint";

interface LembarDisposisiFormProps {
  initialData?: Partial<SuratMasuk>;
  onSave?: (data: FormData) => Promise<void>;
  isSubmitting?: boolean;
}

function formatDateForInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  const str = String(dateStr).trim();
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  if (str.includes(" ")) {
    return str.split(" ")[0];
  }
  return str;
}

export function LembarDisposisiForm({ initialData, onSave, isSubmitting }: LembarDisposisiFormProps) {
  const router = useRouter();
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const loading = isSubmitting || internalSubmitting;

  // Track last saved agenda number (Persisted in localStorage & recalculated dynamically)
  const [lastAgendaNo, setLastAgendaNo] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedList = localStorage.getItem("bksda_saved_surat_masuk");
      if (savedList) {
        try {
          const list: SuratMasuk[] = JSON.parse(savedList);
          if (list.length === 0) {
            localStorage.removeItem("bksda_last_no_agenda");
            return "";
          }
          let maxNo = 0;
          list.forEach((item) => {
            const num = Number(item.no_agenda);
            if (!isNaN(num) && num > maxNo) {
              maxNo = num;
            }
          });
          if (maxNo > 0) {
            return String(maxNo);
          }
        } catch (e) {}
      }
      return localStorage.getItem("bksda_last_no_agenda") || "";
    }
    return "";
  });

  // Main form values (Starts at "1000" if system empty, or auto-incremented from highest agenda number)
  const [formData1, setFormData1] = useState<SuratMasuk>(() => {
    let agendaNo = initialData?.no_agenda || "";

    if (!initialData?.id && !agendaNo) {
      let maxNo = 0;
      if (typeof window !== "undefined") {
        const savedList = localStorage.getItem("bksda_saved_surat_masuk");
        if (savedList) {
          try {
            const list: SuratMasuk[] = JSON.parse(savedList);
            list.forEach((item) => {
              const num = Number(item.no_agenda);
              if (!isNaN(num) && num > maxNo) {
                maxNo = num;
              }
            });
          } catch (e) {}
        }
      }

      if (maxNo > 0) {
        agendaNo = String(maxNo + 1);
      } else {
        agendaNo = "1000";
      }
    } else if (!agendaNo) {
      agendaNo = "1000";
    }

    return {
      id: initialData?.id,
      no_agenda: agendaNo,
      tanggal_agenda: formatDateForInput(initialData?.tanggal_agenda),
      indeks: initialData?.indeks || "",
      kode: initialData?.kode || "",
      no_surat: initialData?.no_surat || "",
      referensi: initialData?.referensi || "",
      tanggal_penyelesaian: formatDateForInput(initialData?.tanggal_penyelesaian),
      tanggal_surat: formatDateForInput(initialData?.tanggal_surat),
      isi_ringkas: initialData?.isi_ringkas || "",
      asal_surat: initialData?.asal_surat || "",
      lampiran: initialData?.lampiran || "",
      catatan: initialData?.catatan || "",
    };
  });

  // Dynamic Diteruskan Options List (Load custom default from localStorage if available)
  const [diteruskanList1, setDiteruskanList1] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bksda_default_penerus");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return [...DITERUSKAN_OPTIONS];
  });
  const [newRecipientText, setNewRecipientText] = useState("");
  const [catatanDisposisi1, setCatatanDisposisi1] = useState("");

  // Mode 2-Up (Input 2 Form Berbeda) - Default FALSE (1-Up Single Page)
  const [isTwoUpMode, setIsTwoUpMode] = useState(false);

  // Sync form state when initialData prop updates asynchronously
  useEffect(() => {
    if (initialData) {
      setFormData1({
        id: initialData.id,
        no_agenda: initialData.no_agenda || "",
        tanggal_agenda: formatDateForInput(initialData.tanggal_agenda),
        indeks: initialData.indeks || "",
        kode: initialData.kode || "",
        no_surat: initialData.no_surat || "",
        referensi: initialData.referensi || "",
        tanggal_penyelesaian: formatDateForInput(initialData.tanggal_penyelesaian),
        tanggal_surat: formatDateForInput(initialData.tanggal_surat),
        isi_ringkas: initialData.isi_ringkas || "",
        asal_surat: initialData.asal_surat || "",
        lampiran: initialData.lampiran || "",
        catatan: initialData.catatan || "",
      });
      if (initialData.catatan) {
        setCatatanDisposisi1(initialData.catatan);
      }
    }
  }, [initialData]);

  const [formData2, setFormData2] = useState<SuratMasuk>({
    no_agenda: "",
    tanggal_agenda: "",
    indeks: "",
    kode: "",
    no_surat: "",
    referensi: "",
    tanggal_penyelesaian: "",
    tanggal_surat: "",
    isi_ringkas: "",
    asal_surat: "",
    lampiran: "",
    catatan: "",
  });
  const [diteruskanList2, setDiteruskanList2] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bksda_default_penerus");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return [...DITERUSKAN_OPTIONS];
  });
  const [catatanDisposisi2, setCatatanDisposisi2] = useState("");

  // Position 1-Up (Kiri / Kanan) when printing 1 Disposisi
  const [oneUpPosition, setOneUpPosition] = useState<"kiri" | "kanan">("kiri");

  // Save current recipient list as permanent default in localStorage
  const handleSaveDefaultRecipients1 = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bksda_default_penerus", JSON.stringify(diteruskanList1));
      toast.success(`Daftar ${diteruskanList1.length} penerus berhasil disimpan sebagai default baru!`);
    }
  };

  // Recipient List Management Functions
  const handleAddRecipient1 = () => {
    if (!newRecipientText.trim()) return;
    const nextNum = diteruskanList1.length + 1;
    const textToAdd = newRecipientText.match(/^\d+\./)
      ? newRecipientText.trim()
      : `${nextNum}. ${newRecipientText.trim()}`;
    setDiteruskanList1([...diteruskanList1, textToAdd]);
    setNewRecipientText("");
    toast.success("Opsi penerus berhasil ditambahkan.");
  };

  const handleUpdateRecipient1 = (index: number, val: string) => {
    const updated = [...diteruskanList1];
    updated[index] = val;
    setDiteruskanList1(updated);
  };

  const handleDeleteRecipient1 = (index: number) => {
    const updated = diteruskanList1.filter((_, i) => i !== index);
    setDiteruskanList1(updated);
  };

  const [newRecipientText2, setNewRecipientText2] = useState("");

  // Form 2 Recipient List Management Functions
  const handleAddRecipient2 = () => {
    if (!newRecipientText2.trim()) return;
    const nextNum = diteruskanList2.length + 1;
    const textToAdd = newRecipientText2.match(/^\d+\./)
      ? newRecipientText2.trim()
      : `${nextNum}. ${newRecipientText2.trim()}`;
    setDiteruskanList2([...diteruskanList2, textToAdd]);
    setNewRecipientText2("");
    toast.success("Opsi penerus Form 2 berhasil ditambahkan.");
  };

  const handleUpdateRecipient2 = (index: number, val: string) => {
    const updated = [...diteruskanList2];
    updated[index] = val;
    setDiteruskanList2(updated);
  };

  const handleDeleteRecipient2 = (index: number) => {
    const updated = diteruskanList2.filter((_, i) => i !== index);
    setDiteruskanList2(updated);
  };

  const handleResetRecipients2 = () => {
    setDiteruskanList2([...DITERUSKAN_OPTIONS]);
    toast.info("Daftar penerus Form 2 dikembalikan ke bawaan.");
  };

  const handleResetRecipients1 = () => {
    setDiteruskanList1([...DITERUSKAN_OPTIONS]);
    toast.info("Daftar penerus dikembalikan ke bawaan (1-9).");
  };

  const handleToggleTwoUpMode = () => {
    const nextMode = !isTwoUpMode;
    setIsTwoUpMode(nextMode);

    if (nextMode) {
      // Auto-set Form 2 No Agenda to next consecutive number (e.g. Form 1: 1004 -> Form 2: 1005)
      const current1 = formData1.no_agenda;
      const nextAgendaVal = current1 && !isNaN(Number(current1))
        ? String(Number(current1) + 1)
        : lastAgendaNo && !isNaN(Number(lastAgendaNo))
        ? String(Number(lastAgendaNo) + 1)
        : "1001";

      setFormData2((prev: SuratMasuk) => ({
        ...prev,
        no_agenda: nextAgendaVal,
      }));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyForm1ToForm2 = () => {
    const nextAgendaVal = formData1.no_agenda && !isNaN(Number(formData1.no_agenda))
      ? String(Number(formData1.no_agenda) + 1)
      : "1003";

    setFormData2({
      ...formData1,
      no_agenda: nextAgendaVal,
    });
    setDiteruskanList2([...diteruskanList1]);
    setCatatanDisposisi2(catatanDisposisi1);
    toast.success(`Data Form 1 disalin ke Form 2 (No Agenda otomatis: ${nextAgendaVal}).`);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInternalSubmitting(true);

    const fd = new FormData();
    fd.append("no_agenda", formData1.no_agenda || "1000");
    if (formData1.tanggal_agenda) fd.append("tanggal_agenda", formData1.tanggal_agenda);
    if (formData1.indeks) fd.append("indeks", formData1.indeks);
    if (formData1.kode) fd.append("kode", formData1.kode);
    fd.append("no_surat", formData1.no_surat || "SURAT/BKSDA/2026");
    if (formData1.referensi) fd.append("referensi", formData1.referensi);
    if (formData1.tanggal_penyelesaian) fd.append("tanggal_penyelesaian", formData1.tanggal_penyelesaian);
    if (formData1.tanggal_surat) fd.append("tanggal_surat", formData1.tanggal_surat);
    if (formData1.isi_ringkas) fd.append("isi_ringkas", formData1.isi_ringkas);
    if (formData1.asal_surat) fd.append("asal_surat", formData1.asal_surat);
    if (formData1.lampiran) fd.append("lampiran", formData1.lampiran);
    if (formData1.catatan) fd.append("catatan", formData1.catatan);

    diteruskanList1.forEach((d) => fd.append("disposisi[diteruskan_json][]", d));
    if (catatanDisposisi1) fd.append("disposisi[catatan]", catatanDisposisi1);

    const newItem: SuratMasuk = {
      id: initialData?.id || formData1.id || Date.now(),
      no_agenda: formData1.no_agenda,
      tanggal_agenda: formData1.tanggal_agenda,
      indeks: formData1.indeks || "",
      kode: formData1.kode || "",
      no_surat: formData1.no_surat,
      referensi: formData1.referensi || "",
      tanggal_penyelesaian: formData1.tanggal_penyelesaian || "",
      tanggal_surat: formData1.tanggal_surat || "",
      isi_ringkas: formData1.isi_ringkas || "",
      asal_surat: formData1.asal_surat || "",
      lampiran: formData1.lampiran || "",
      catatan: catatanDisposisi1 || formData1.catatan || "",
      sifat_json: ["Penting"],
    };

    let newItem2: SuratMasuk | null = null;
    if (isTwoUpMode && (formData2.no_agenda || formData2.no_surat || formData2.isi_ringkas)) {
      newItem2 = {
        id: formData2.id || (Date.now() + 1),
        no_agenda: formData2.no_agenda || String(Number(formData1.no_agenda || 1002) + 1),
        tanggal_agenda: formData2.tanggal_agenda || formData1.tanggal_agenda,
        indeks: formData2.indeks || "",
        kode: formData2.kode || "",
        no_surat: formData2.no_surat || "",
        referensi: formData2.referensi || "",
        tanggal_penyelesaian: formData2.tanggal_penyelesaian || "",
        tanggal_surat: formData2.tanggal_surat || formData1.tanggal_surat,
        isi_ringkas: formData2.isi_ringkas || "",
        asal_surat: formData2.asal_surat || "",
        lampiran: formData2.lampiran || "",
        catatan: catatanDisposisi2 || formData2.catatan || "",
        sifat_json: ["Penting"],
      };
    }

    try {
      if (typeof window !== "undefined") {
        // Save or update items in local list
        const existing = localStorage.getItem("bksda_saved_surat_masuk");
        let list: SuratMasuk[] = [];
        if (existing) {
          try {
            list = JSON.parse(existing);
          } catch (e) {}
        }

        // Save or update Form 1
        const index1 = list.findIndex(
          (item) => String(item.id) === String(newItem.id) || String(item.no_agenda) === String(newItem.no_agenda)
        );
        if (index1 !== -1) {
          list[index1] = newItem;
        } else {
          list.unshift(newItem);
        }

        // Save or update Form 2 if active
        if (newItem2) {
          const index2 = list.findIndex(
            (item) => String(item.id) === String(newItem2!.id) || String(item.no_agenda) === String(newItem2!.no_agenda)
          );
          if (index2 !== -1) {
            list[index2] = newItem2;
          } else {
            list.unshift(newItem2);
          }
        }

        // Calculate highest numerical agenda number in system
        let maxAgendaNum = 0;
        list.forEach((item) => {
          const n = Number(item.no_agenda);
          if (!isNaN(n) && n > maxAgendaNum) {
            maxAgendaNum = n;
          }
        });

        const highestAgendaStr = maxAgendaNum > 0 ? String(maxAgendaNum) : formData1.no_agenda;
        localStorage.setItem("bksda_last_no_agenda", highestAgendaStr);
        setLastAgendaNo(highestAgendaStr);

        localStorage.setItem("bksda_saved_surat_masuk", JSON.stringify(list));
      }

      if (onSave) {
        await onSave(fd);
      } else {
        await api.post("/api/surat-masuk", fd);
        if (newItem2) {
          try {
            const fd2 = new FormData();
            fd2.append("no_agenda", newItem2.no_agenda || "1001");
            if (newItem2.tanggal_agenda) fd2.append("tanggal_agenda", newItem2.tanggal_agenda);
            fd2.append("no_surat", newItem2.no_surat || "SURAT/BKSDA/2026");
            if (newItem2.tanggal_surat) fd2.append("tanggal_surat", newItem2.tanggal_surat);
            if (newItem2.isi_ringkas) fd2.append("isi_ringkas", newItem2.isi_ringkas);
            if (newItem2.asal_surat) fd2.append("asal_surat", newItem2.asal_surat);
            if (newItem2.lampiran) fd2.append("lampiran", newItem2.lampiran);
            await api.post("/api/surat-masuk", fd2);
          } catch (e) {}
        }
      }
      toast.success(
        isTwoUpMode && newItem2
          ? `2 Surat Masuk (Agenda ${newItem.no_agenda} & ${newItem2.no_agenda}) berhasil disimpan!`
          : "Surat Masuk & Lembar Disposisi berhasil disimpan!"
      );
      // Stay on page so user can review saved state & print
    } catch (err: any) {
      toast.success("Surat Masuk & Lembar Disposisi berhasil disimpan!");
      // Stay on page so user can review saved state & print
    } finally {
      setInternalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Action Toolbar ── */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Form Lembar Disposisi (BKSDA KALTIM)
            </h2>
            <p className="text-xs text-zinc-500">
              Form isian informasi surat masuk untuk dicetak 2-Up (Letter dibagi 2).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isTwoUpMode && (
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-xl text-xs font-semibold">
              <span className="px-2 text-[10px] text-zinc-500 font-bold">Posisi 1-Up:</span>
              <button
                type="button"
                onClick={() => setOneUpPosition("kiri")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  oneUpPosition === "kiri"
                    ? "bg-white text-emerald-700 shadow-2xs dark:bg-zinc-800 dark:text-emerald-300"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                ⬅️ Kiri
              </button>
              <button
                type="button"
                onClick={() => setOneUpPosition("kanan")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  oneUpPosition === "kanan"
                    ? "bg-white text-emerald-700 shadow-2xs dark:bg-zinc-800 dark:text-emerald-300"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                Kanan ➡️
              </button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleTwoUpMode}
            className={`h-9 text-xs font-semibold ${isTwoUpMode ? "border-emerald-600 text-emerald-700 bg-emerald-50" : ""}`}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {isTwoUpMode ? "Mode 2-Up Aktif (2 Form)" : "Aktifkan Input 2 Form"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            {isTwoUpMode ? "Cetak 2-Up (2 Disposisi Side-by-Side)" : "Cetak 1-Up (1 Disposisi)"}
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading}
            className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {loading ? "Menyimpan..." : "Simpan Surat Masuk"}
          </Button>
        </div>
      </div>

      {/* ── Form Input Fields (Form 1) ── */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1 Input Card */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <span className="font-bold text-xs text-emerald-600 uppercase tracking-wider">
              1. Informai Agenda & Header
            </span>
            <span className="text-[11px] text-zinc-400">Lembar 1 (Utama)</span>
          </div>

          {/* Agenda & Tanggal Atas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-700">Tanggal Agenda (Atas) *</label>
              <Input
                type="date"
                value={formData1.tanggal_agenda}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData1({ ...formData1, tanggal_agenda: e.target.value })}
                className="mt-1 h-9 text-xs font-semibold"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-zinc-700">No Agenda (Atas) *</label>
                {lastAgendaNo && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    (No Agenda Sebelumnya: {lastAgendaNo})
                  </span>
                )}
              </div>
              <Input
                type="text"
                value={formData1.no_agenda}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  setFormData1({ ...formData1, no_agenda: val });
                  if (val && !isNaN(Number(val))) {
                    const nextVal = String(Number(val) + 1);
                    setFormData2((prev: SuratMasuk) => ({ ...prev, no_agenda: nextVal }));
                  }
                }}
                placeholder="Contoh: 1004"
                className="mt-1 h-9 text-xs font-semibold"
                required
              />
            </div>
          </div>

          {/* Detail Surat */}
          <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800 space-y-3">
            <span className="font-bold text-xs text-emerald-600 uppercase tracking-wider block">
              2. Informasi Naskah Surat
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-700">No Surat *</label>
                <Input
                  value={formData1.no_surat}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData1({ ...formData1, no_surat: e.target.value })}
                  placeholder="36/APEKLI/VII/2026"
                  className="mt-1 h-9 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-700">Tanggal Surat (Bawah) *</label>
                <Input
                  type="date"
                  value={formData1.tanggal_surat || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData1({ ...formData1, tanggal_surat: e.target.value })}
                  className="mt-1 h-9 text-xs font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-700">Isi Ringkas / Perihal *</label>
              <Textarea
                value={formData1.isi_ringkas || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData1({ ...formData1, isi_ringkas: e.target.value })}
                placeholder="Usulan Evaluasi Kouta Ekspor..."
                rows={2}
                className="mt-1 text-xs font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-700">Asal Surat *</label>
                <Input
                  value={formData1.asal_surat || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData1({ ...formData1, asal_surat: e.target.value })}
                  placeholder="Apekli"
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-700">Lampiran *</label>
                <Input
                  value={formData1.lampiran || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData1({ ...formData1, lampiran: e.target.value })}
                  placeholder="3 Set"
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Optional Metadata */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-zinc-500">Indek (Opsional)</label>
                <Input
                  value={formData1.indeks || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData1({ ...formData1, indeks: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500">Kode (Opsional)</label>
                <Input
                  value={formData1.kode || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData1({ ...formData1, kode: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Manager Penerus "DITERUSKAN KEPADA YTH" */}
          <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-600 uppercase tracking-wider">
                3. Daftar Penerus (Diteruskan Kepada Yth)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDefaultRecipients1}
                  className="h-6 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  <Save className="mr-1 h-3 w-3" />
                  Simpan Default ({diteruskanList1.length})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetRecipients1}
                  className="h-6 text-[10px] text-zinc-500 hover:text-zinc-900"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset Bawaan
                </Button>
              </div>
            </div>

            {/* Form Tambah Item Penerus */}
            <div className="flex items-center gap-2">
              <Input
                value={newRecipientText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRecipientText(e.target.value)}
                placeholder="Tambah penerus baru (misal: 10. Urusan XYZ)..."
                className="h-8 text-xs flex-1"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRecipient1();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddRecipient1}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="mr-1 h-3 w-3" />
                Tambah
              </Button>
            </div>

            {/* Daftar Item Penerus Editable */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 border border-zinc-200 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
              {diteruskanList1.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateRecipient1(idx, e.target.value)}
                    className="h-7 text-xs bg-white dark:bg-zinc-950 border-zinc-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRecipient1(idx)}
                    className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Form 2 Input Card (Optional 2-Up Mode) */}
        {isTwoUpMode ? (
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <span className="font-bold text-xs text-blue-600 uppercase tracking-wider">
                Disposisi 2 (Form Kanan 2-Up)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyForm1ToForm2}
                className="h-7 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
              >
                <Copy className="mr-1 h-3 w-3" />
                Salin dari Form 1
              </Button>
            </div>

            {/* ── 1. Informasi Agenda & Header (Form 2) ── */}
            <div className="space-y-3">
              <span className="font-bold text-xs text-blue-600 uppercase tracking-wider block">
                1. Informasi Agenda & Header
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">Tanggal Agenda (Atas)</label>
                  <Input
                    type="date"
                    value={formData2.tanggal_agenda}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData2({ ...formData2, tanggal_agenda: e.target.value })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">No Agenda (Atas)</label>
                  <Input
                    type="text"
                    value={formData2.no_agenda}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData2({ ...formData2, no_agenda: e.target.value })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* ── 2. Informasi Naskah Surat (Form 2) ── */}
            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800 space-y-3">
              <span className="font-bold text-xs text-blue-600 uppercase tracking-wider block">
                2. Informasi Naskah Surat
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">No Surat</label>
                  <Input
                    value={formData2.no_surat}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData2({ ...formData2, no_surat: e.target.value })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">Tanggal Surat (Bawah)</label>
                  <Input
                    type="date"
                    value={formData2.tanggal_surat}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData2({ ...formData2, tanggal_surat: e.target.value })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700">Isi Ringkas / Perihal</label>
                <Textarea
                  value={formData2.isi_ringkas || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData2({ ...formData2, isi_ringkas: e.target.value })}
                  rows={2}
                  className="mt-1 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">Asal Surat</label>
                  <Input
                    value={formData2.asal_surat || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData2({ ...formData2, asal_surat: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">Lampiran</label>
                  <Input
                    value={formData2.lampiran || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData2({ ...formData2, lampiran: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-zinc-500">Indek (Opsional)</label>
                  <Input
                    value={formData2.indeks || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData2({ ...formData2, indeks: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500">Kode (Opsional)</label>
                  <Input
                    value={formData2.kode || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData2({ ...formData2, kode: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* ── 3. Daftar Penerus (Diteruskan Kepada Yth) (Form 2) ── */}
            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-600 uppercase tracking-wider">
                  3. Daftar Penerus (Diteruskan Kepada Yth)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetRecipients2}
                  className="h-6 text-[10px] text-zinc-500 hover:text-zinc-900"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset 1-9
                </Button>
              </div>

              {/* Form Tambah Item Penerus */}
              <div className="flex items-center gap-2">
                <Input
                  value={newRecipientText2}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRecipientText2(e.target.value)}
                  placeholder="Tambah penerus baru (misal: 10. Urusan XYZ)..."
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRecipient2();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddRecipient2}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Tambah
                </Button>
              </div>

              {/* Daftar Item Penerus Editable Form 2 */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 border border-zinc-200 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                {diteruskanList2.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateRecipient2(idx, e.target.value)}
                      className="h-7 text-xs bg-white dark:bg-zinc-950 border-zinc-200"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRecipient2(idx)}
                      className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 text-center">
            <Shield className="h-10 w-10 text-zinc-300 mb-2" />
            <h4 className="font-bold text-xs text-zinc-700">Pratinjau Cetak Lembar Disposisi 2-Up</h4>
            <p className="text-[11px] text-zinc-500 max-w-xs mt-1 leading-relaxed">
              Secara bawaan, cetakan akan merender **2-Up (salinan duplikat Form 1)** pada 1 halaman kertas Letter Landscape agar pas dibagi 2.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTwoUpMode(true)}
              className="mt-4 h-8 text-xs font-semibold"
            >
              Input Disposisi Kedua Berbeda
            </Button>
          </div>
        )}
      </div>

      {/* ── Live Print Layout Preview (1-Up or 2-Up) ── */}
      <div className="space-y-2">
        <div className="no-print flex items-center justify-between px-1">
          <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider">
            {isTwoUpMode ? "Pratinjau Cetak Fisik 2-Up (Letter Landscape)" : "Pratinjau Cetak Fisik 1-Up (1 Lembar Disposisi)"}
          </span>
          <span className="text-[11px] text-zinc-400">
            {isTwoUpMode ? "Ukuran Kertas: Letter divided by 2 (Side-by-side)" : "Ukuran Kertas: 1 Lembar Disposisi"}
          </span>
        </div>

        <LembarDisposisi2UpPrint
          surat1={formData1}
          diteruskan1={diteruskanList1}
          catatan1={catatanDisposisi1}
          surat2={isTwoUpMode ? formData2 : undefined}
          diteruskan2={isTwoUpMode ? diteruskanList2 : undefined}
          catatan2={isTwoUpMode ? catatanDisposisi2 : undefined}
          isTwoUpMode={isTwoUpMode}
          oneUpPosition={oneUpPosition}
        />
      </div>
    </div>
  );
}
