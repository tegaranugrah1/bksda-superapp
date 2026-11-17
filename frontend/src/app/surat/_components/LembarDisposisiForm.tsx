"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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

function loadDefaultRecipients(): string[] {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bksda_default_penerus");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback to built-in default options on malformed storage value
      }
    }
  }
  return [...DITERUSKAN_OPTIONS];
}

function LembarDisposisiCardFields({
  formData,
  setFormData,
  diteruskanList,
  newRecipientText,
  setNewRecipientText,
  onAddRecipient,
  onUpdateRecipient,
  onDeleteRecipient,
  onResetRecipients,
  resetLabel,
  onSaveDefaultRecipients,
  required = false,
  onNoAgendaSync,
}: {
  formData: SuratMasuk;
  setFormData: React.Dispatch<React.SetStateAction<SuratMasuk>>;
  diteruskanList: string[];
  newRecipientText: string;
  setNewRecipientText: (val: string) => void;
  onAddRecipient: () => void;
  onUpdateRecipient: (idx: number, val: string) => void;
  onDeleteRecipient: (idx: number) => void;
  onResetRecipients: () => void;
  resetLabel: string;
  onSaveDefaultRecipients?: () => void;
  required?: boolean;
  onNoAgendaSync?: (val: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
            Tanggal Agenda (Atas){required ? " *" : ""}
          </label>
          <Input
            type="date"
            value={formData.tanggal_agenda}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tanggal_agenda: e.target.value })}
            className="mt-1 h-9 text-xs font-semibold rounded-lg"
            required={required}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
            No Agenda (Atas){required ? " *" : ""}
          </label>
          <Input
            type="text"
            value={formData.no_agenda}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              setFormData({ ...formData, no_agenda: val });
              onNoAgendaSync?.(val);
            }}
            placeholder={required ? "Contoh: 1004" : undefined}
            className="mt-1 h-9 text-xs font-semibold rounded-lg"
            required={required}
          />
        </div>
      </div>

      <div className="border-t border-slate-200/70 dark:border-zinc-800 pt-3 space-y-3">
        <span className="font-bold text-xs text-[var(--ds-accent-fg)] uppercase tracking-wider block">
          2. Informasi Naskah Surat
        </span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
              No Surat{required ? " *" : ""}
            </label>
            <Input
              value={formData.no_surat}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, no_surat: e.target.value })}
              placeholder={required ? "36/APEKLI/VII/2026" : undefined}
              className="mt-1 h-9 text-xs font-semibold rounded-lg"
              required={required}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
              Tanggal Surat (Bawah){required ? " *" : ""}
            </label>
            <Input
              type="date"
              value={formData.tanggal_surat || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tanggal_surat: e.target.value })}
              className="mt-1 h-9 text-xs font-semibold rounded-lg"
              required={required}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
            Isi Ringkas / Perihal{required ? " *" : ""}
          </label>
          <Textarea
            value={formData.isi_ringkas || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, isi_ringkas: e.target.value })}
            placeholder={required ? "Usulan Evaluasi Kouta Ekspor..." : undefined}
            rows={2}
            className="mt-1 text-xs font-medium rounded-lg"
            required={required}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
              Asal Surat{required ? " *" : ""}
            </label>
            <Input
              value={formData.asal_surat || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, asal_surat: e.target.value })}
              placeholder={required ? "Apekli" : undefined}
              className="mt-1 h-9 text-xs rounded-lg"
              required={required}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
              Lampiran{required ? " *" : ""}
            </label>
            <Input
              value={formData.lampiran || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lampiran: e.target.value })}
              placeholder={required ? "3 Set" : undefined}
              className="mt-1 h-9 text-xs rounded-lg"
              required={required}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-medium text-[var(--ds-fg-muted)]">Indek (Opsional)</label>
            <Input
              value={formData.indeks || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, indeks: e.target.value })}
              className="mt-1 h-8 text-xs rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ds-fg-muted)]">Kode (Opsional)</label>
            <Input
              value={formData.kode || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, kode: e.target.value })}
              className="mt-1 h-8 text-xs rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 dark:border-zinc-800 pt-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold text-xs text-[var(--ds-accent-fg)] uppercase tracking-wider">
            3. Daftar Penerus (Diteruskan Kepada Yth)
          </span>
          <div className="flex items-center gap-2">
            {onSaveDefaultRecipients && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSaveDefaultRecipients}
                className="h-7 text-xs font-semibold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] hover:opacity-90 rounded-lg"
              >
                <Save className="mr-1 h-3 w-3" />
                Simpan Default ({diteruskanList.length})
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetRecipients}
              className="h-7 text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] rounded-lg"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              {resetLabel}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={newRecipientText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRecipientText(e.target.value)}
            placeholder="Tambah penerus baru (misal: 10. Urusan XYZ)..."
            className="h-8 text-xs flex-1 rounded-lg"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddRecipient();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={onAddRecipient}
            className="h-8 text-xs bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold rounded-lg"
          >
            <Plus className="mr-1 h-3 w-3" />
            Tambah
          </Button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface-muted)]">
          {diteruskanList.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateRecipient(idx, e.target.value)}
                className="h-7 text-xs bg-[var(--ds-surface)] border-slate-200/80 dark:border-zinc-800 rounded-lg"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDeleteRecipient(idx)}
                className="h-7 w-7 p-0 text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-lg"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function LembarDisposisiForm({ initialData, onSave, isSubmitting }: LembarDisposisiFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const loading = isSubmitting || internalSubmitting;

  // Main form values
  const [formData1, setFormData1] = useState<SuratMasuk>(() => ({
    id: initialData?.id,
    no_agenda: initialData?.no_agenda || "",
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
  }));

  // Dynamic Diteruskan Options List (Load custom default from localStorage if available)
  const [diteruskanList1, setDiteruskanList1] = useState<string[]>(loadDefaultRecipients);
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
  const [diteruskanList2, setDiteruskanList2] = useState<string[]>(loadDefaultRecipients);
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

    // Disposisi recipients are left empty on initial entry until physical direction from pimpinan
    const actualRecipients = (initialData?.disposisi?.diteruskan_json || []).filter(
      (d) => !/^\d+\.\s+/.test(d)
    );
    actualRecipients.forEach((d) => fd.append("disposisi[diteruskan_json][]", d));
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
      sifat_json: initialData?.sifat_json || ["Penting"],
      disposisi: {
        diteruskan_json: actualRecipients,
        catatan: catatanDisposisi1 || "",
      },
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
      if (onSave) {
        await onSave(fd);
      } else if (initialData?.id) {
        // Mode Edit: Kirim request update
        await api.post(`/surat-masuk/${initialData.id}?_method=PUT`, fd);
      } else {
        // Mode Create: Kirim request simpan baru
        await api.post("/surat-masuk", fd);
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
            await api.post("/surat-masuk", fd2);
          } catch {
            toast.warning("Surat masuk pertama tersimpan, tetapi surat kedua gagal disimpan.");
          }
        }
      }

      // Invalidate cache immediately so agenda list and counters update without manual refresh
      queryClient.invalidateQueries({ queryKey: ["surat-masuk"] });
      queryClient.invalidateQueries({ queryKey: ["surat-masuk-next-agenda"] });
      queryClient.invalidateQueries({ queryKey: ["surat-hub-summary"] });
      if (initialData?.id) {
        queryClient.invalidateQueries({ queryKey: ["surat-masuk-detail", String(initialData.id)] });
      }

      toast.success(
        isTwoUpMode && newItem2
          ? `2 Surat Masuk (Agenda ${newItem.no_agenda} & ${newItem2.no_agenda}) berhasil disimpan!`
          : "Surat Masuk & Lembar Disposisi berhasil disimpan!"
      );
      // Stay on page so user can review saved state & print
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Gagal menyimpan Surat Masuk.";
      toast.error(errorMsg);
    } finally {
      setInternalSubmitting(false);
    }
  };

  return (
    <div className="psr-ui space-y-6">
      {/* ── Action Toolbar ── */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="kpg-support-icon w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--ds-fg)]">
              Form Lembar Disposisi (BKSDA KALTIM)
            </h2>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              Form isian informasi surat masuk untuk dicetak 2-Up (Letter dibagi 2).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isTwoUpMode && (
            <div className="flex items-center gap-1 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 p-1 rounded-lg text-xs font-semibold">
              <span className="px-2 text-xs text-[var(--ds-fg-muted)] font-bold">Posisi 1-Up:</span>
              <button
                type="button"
                aria-pressed={oneUpPosition === "kiri"}
                onClick={() => setOneUpPosition("kiri")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  oneUpPosition === "kiri"
                    ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                }`}
              >
                ⬅️ Kiri
              </button>
              <button
                type="button"
                aria-pressed={oneUpPosition === "kanan"}
                onClick={() => setOneUpPosition("kanan")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  oneUpPosition === "kanan"
                    ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
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
            aria-pressed={isTwoUpMode}
            onClick={handleToggleTwoUpMode}
            className={`h-9 text-xs font-semibold rounded-lg gap-2 ${
              isTwoUpMode
                ? "border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)]"
                : "kpg-secondary"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {isTwoUpMode ? "Mode 2-Up Aktif (2 Form)" : "Aktifkan Input 2 Form"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="kpg-secondary h-9 text-xs font-semibold rounded-lg gap-2"
          >
            <Printer className="h-3.5 w-3.5" />
            {isTwoUpMode ? "Cetak 2-Up (2 Disposisi Side-by-Side)" : "Cetak 1-Up (1 Disposisi)"}
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading}
            className="h-9 text-xs font-bold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            {loading ? "Menyimpan..." : "Simpan Surat Masuk"}
          </Button>
        </div>
      </div>

      {/* ── Form Input Fields (Form 1) ── */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1 Input Card */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 md:p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-zinc-800 pb-3">
            <span className="font-bold text-xs text-[var(--ds-accent-fg)] uppercase tracking-wider">
              1. Informasi Agenda & Header
            </span>
            <span className="text-xs text-[var(--ds-fg-muted)]">Lembar 1 (Utama)</span>
          </div>

          <LembarDisposisiCardFields
            formData={formData1}
            setFormData={setFormData1}
            diteruskanList={diteruskanList1}
            newRecipientText={newRecipientText}
            setNewRecipientText={setNewRecipientText}
            onAddRecipient={handleAddRecipient1}
            onUpdateRecipient={handleUpdateRecipient1}
            onDeleteRecipient={handleDeleteRecipient1}
            onResetRecipients={handleResetRecipients1}
            resetLabel="Reset Bawaan"
            onSaveDefaultRecipients={handleSaveDefaultRecipients1}
            required
            onNoAgendaSync={(val) => {
              if (val && !isNaN(Number(val))) {
                setFormData2((prev: SuratMasuk) => ({ ...prev, no_agenda: String(Number(val) + 1) }));
              }
            }}
          />
        </form>

        {/* Form 2 Input Card (Optional 2-Up Mode) */}
        {isTwoUpMode ? (
          <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 md:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-zinc-800 pb-3">
              <span className="font-bold text-xs text-[var(--ds-accent-fg)] uppercase tracking-wider">
                Disposisi 2 (Form Kanan 2-Up)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyForm1ToForm2}
                className="h-7 text-xs font-semibold text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] rounded-lg"
              >
                <Copy className="mr-1 h-3 w-3" />
                Salin dari Form 1
              </Button>
            </div>

            <span className="font-bold text-xs text-[var(--ds-accent-fg)] uppercase tracking-wider block">
              1. Informasi Agenda & Header
            </span>
            <LembarDisposisiCardFields
              formData={formData2}
              setFormData={setFormData2}
              diteruskanList={diteruskanList2}
              newRecipientText={newRecipientText2}
              setNewRecipientText={setNewRecipientText2}
              onAddRecipient={handleAddRecipient2}
              onUpdateRecipient={handleUpdateRecipient2}
              onDeleteRecipient={handleDeleteRecipient2}
              onResetRecipients={handleResetRecipients2}
              resetLabel="Reset 1-9"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200/80 dark:border-zinc-800 rounded-3xl bg-[var(--ds-surface-muted)] text-center shadow-xs">
            <Shield className="h-10 w-10 text-[var(--ds-fg-muted)] mb-2" />
            <h4 className="font-bold text-xs text-[var(--ds-fg)]">Pratinjau Cetak Lembar Disposisi 2-Up</h4>
            <p className="text-xs text-[var(--ds-fg-muted)] max-w-xs mt-1 leading-relaxed">
              Secara bawaan, cetakan akan merender <strong>2-Up (salinan duplikat Form 1)</strong> pada 1 halaman kertas Letter Landscape agar pas dibagi 2.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTwoUpMode(true)}
              className="kpg-secondary mt-4 h-8 text-xs font-semibold rounded-lg"
            >
              Input Disposisi Kedua Berbeda
            </Button>
          </div>
        )}
      </div>

      {/* ── Live Print Layout Preview (1-Up or 2-Up) ── */}
      <div className="space-y-2">
        <div className="no-print flex items-center justify-between px-1">
          <span className="font-bold text-xs text-[var(--ds-fg-muted)] uppercase tracking-wider">
            {isTwoUpMode ? "Pratinjau Cetak Fisik 2-Up (Letter Landscape)" : "Pratinjau Cetak Fisik 1-Up (1 Lembar Disposisi)"}
          </span>
          <span className="text-xs text-[var(--ds-fg-muted)]">
            {isTwoUpMode ? "Ukuran Kertas: Letter divided by 2 (Side-by-side)" : "Ukuran Kertas: 1 Lembar Disposisi"}
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
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
    </div>
  );
}
