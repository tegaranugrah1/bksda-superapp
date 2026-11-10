"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Save } from "lucide-react";
import {
  handlePrintCoveringLetter,
  CoveringLetterDocument,
  type CoveringLetterItem,
  type CoveringLetterParty,
} from "../_components/CoveringLetterDocument";
import {
  todayInputValue,
  buildCoveringNumber,
  formatNip,
  isDraftNumber,
  extractDocumentSequence,
  extractDocumentKap,
  type EmployeeOption,
} from "../_lib/report-utils";
import {
  type CoveringLetterHistory,
  type EditingDocumentState,
  DEFAULT_COVERING_SENDER,
  DEFAULT_COVERING_RECEIVER,
  DEFAULT_COVERING_ITEMS,
} from "../_lib/types";

export interface CoveringLetterTabProps {
  formState: ReturnType<typeof useCoveringLetterFormState>;
  employees: EmployeeOption[];
  loadingEmployees?: boolean;
  canGenerate?: boolean;
  editingDocument?: EditingDocumentState | null;
  onClearEditing?: () => void;
  onRefetchHistory?: () => Promise<void> | void;
}

export function useCoveringLetterFormState(editingDocument?: EditingDocumentState | null) {
  const editingAppliedRef = useRef<EditingDocumentState | null | undefined>(undefined);
  const initialItem =
    editingDocument && editingDocument.type === "covering_letter"
      ? (editingDocument.item as CoveringLetterHistory | undefined)
      : undefined;

  const [coveringSequence, setCoveringSequence] = useState(
    editingDocument?.isDuplicate ? "" : (initialItem?.number ? extractDocumentSequence(initialItem.number) : "")
  );
  const [coveringKap, setCoveringKap] = useState(
    (initialItem?.number ? extractDocumentKap(initialItem.number) : null) || (initialItem as any)?.kap || "KAP.06.01"
  );
  const [coveringDate, setCoveringDate] = useState(
    initialItem?.document_date ? initialItem.document_date.split("T")[0] : todayInputValue()
  );
  const [coveringRegarding, setCoveringRegarding] = useState(
    initialItem?.regarding ||
      "Penyampaian Permohonan Jadwal Lelang Non Eksekusi Wajib Barang Milik Negara (BMN) Berupa Kendaraan Bermotor Operasional / Dinas Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur"
  );
  const [coveringRecipientTitle, setCoveringRecipientTitle] = useState(
    initialItem?.recipient_title || "Kepala Kantor Pelayanan Kekayaan Negara dan Lelang"
  );
  const [coveringRecipientLocation, setCoveringRecipientLocation] = useState(
    initialItem?.recipient_location || "Samarinda"
  );
  const [coveringItems, setCoveringItems] = useState<CoveringLetterItem[]>(
    Array.isArray(initialItem?.items_snapshot) && initialItem!.items_snapshot.length > 0
      ? initialItem!.items_snapshot
      : DEFAULT_COVERING_ITEMS
  );
  const [coveringClosingPhrase, setCoveringClosingPhrase] = useState(
    initialItem?.closing_phrase || "Demikian kami sampaikan, atas kerja samanya diucapkan terima kasih."
  );
  const [coveringReceivedDate, setCoveringReceivedDate] = useState(
    initialItem?.received_date ? initialItem.received_date.split("T")[0] : ""
  );
  const [coveringShowSignatures, setCoveringShowSignatures] = useState(
    initialItem?.show_signatures ?? true
  );
  const [coveringShowReceiver, setCoveringShowReceiver] = useState(
    initialItem?.metadata?.show_receiver ?? true
  );
  const [coveringReceiverIsBlank, setCoveringReceiverIsBlank] = useState(
    initialItem?.metadata?.receiver_is_blank ?? false
  );
  const [coveringReceiverIncludePhone, setCoveringReceiverIncludePhone] = useState(
    initialItem?.metadata?.receiver_include_phone ?? false
  );
  const [coveringReceiverPhone, setCoveringReceiverPhone] = useState(
    initialItem?.metadata?.receiver_phone || ""
  );
  const [coveringSenderEmployeeId, setCoveringSenderEmployeeId] = useState(
    initialItem?.sender_employee_id ? String(initialItem.sender_employee_id) : ""
  );
  const [coveringReceiverEmployeeId, setCoveringReceiverEmployeeId] = useState(
    (initialItem?.metadata as any)?.receiver_employee_id ? String((initialItem?.metadata as any).receiver_employee_id) : ""
  );
  const [coveringSender, setCoveringSender] = useState<CoveringLetterParty>(
    initialItem?.sender_snapshot || DEFAULT_COVERING_SENDER
  );
  const [coveringReceiver, setCoveringReceiver] = useState<CoveringLetterParty>(
    initialItem?.receiver_snapshot || DEFAULT_COVERING_RECEIVER
  );
  const [coveringHeaderMode, setCoveringHeaderMode] = useState<"with-number" | "dash" | "none">(
    initialItem?.metadata?.header_mode ||
      (initialItem && isDraftNumber(initialItem.number) && !extractDocumentSequence(initialItem.number) ? "dash" : "with-number")
  );
  const [savingCoveringLetter, setSavingCoveringLetter] = useState(false);

  return {
    editingAppliedRef, coveringSequence,
    setCoveringSequence, coveringKap,
    setCoveringKap, coveringDate,
    setCoveringDate, coveringRegarding,
    setCoveringRegarding, coveringRecipientTitle,
    setCoveringRecipientTitle, coveringRecipientLocation,
    setCoveringRecipientLocation, coveringItems,
    setCoveringItems, coveringClosingPhrase,
    setCoveringClosingPhrase, coveringReceivedDate,
    setCoveringReceivedDate, coveringShowSignatures,
    setCoveringShowSignatures, coveringShowReceiver,
    setCoveringShowReceiver, coveringReceiverIsBlank,
    setCoveringReceiverIsBlank, coveringReceiverIncludePhone,
    setCoveringReceiverIncludePhone, coveringReceiverPhone,
    setCoveringReceiverPhone, coveringSenderEmployeeId,
    setCoveringSenderEmployeeId, coveringReceiverEmployeeId,
    setCoveringReceiverEmployeeId, coveringSender,
    setCoveringSender, coveringReceiver,
    setCoveringReceiver, coveringHeaderMode,
    setCoveringHeaderMode, savingCoveringLetter,
    setSavingCoveringLetter,
  };
}

export function CoveringLetterTab({
  formState,
  employees,
  loadingEmployees = false,
  canGenerate = true,
  editingDocument,
  onClearEditing,
  onRefetchHistory,
}: CoveringLetterTabProps) {
  const {
    editingAppliedRef, coveringSequence,
    setCoveringSequence, coveringKap,
    setCoveringKap, coveringDate,
    setCoveringDate, coveringRegarding,
    setCoveringRegarding, coveringRecipientTitle,
    setCoveringRecipientTitle, coveringRecipientLocation,
    setCoveringRecipientLocation, coveringItems,
    setCoveringItems, coveringClosingPhrase,
    setCoveringClosingPhrase, coveringReceivedDate,
    setCoveringReceivedDate, coveringShowSignatures,
    setCoveringShowSignatures, coveringShowReceiver,
    setCoveringShowReceiver, coveringReceiverIsBlank,
    setCoveringReceiverIsBlank, coveringReceiverIncludePhone,
    setCoveringReceiverIncludePhone, coveringReceiverPhone,
    setCoveringReceiverPhone, coveringSenderEmployeeId,
    setCoveringSenderEmployeeId, coveringReceiverEmployeeId,
    setCoveringReceiverEmployeeId, coveringSender,
    setCoveringSender, coveringReceiver,
    setCoveringReceiver, coveringHeaderMode,
    setCoveringHeaderMode, savingCoveringLetter,
    setSavingCoveringLetter,
  } = formState;

  const applyDataToForm = (item: CoveringLetterHistory, isDuplicate = false) => {
    setCoveringSequence(isDuplicate ? "" : extractDocumentSequence(item.number));
    const kapVal = extractDocumentKap(item.number) || (item as any).kap;
    if (kapVal) setCoveringKap(kapVal);
    if (item.document_date) {
      setCoveringDate(item.document_date.split("T")[0]);
    }
    setCoveringRegarding(item.regarding || "");
    setCoveringRecipientTitle(item.recipient_title || "");
    setCoveringRecipientLocation(item.recipient_location || "");
    if (Array.isArray(item.items_snapshot) && item.items_snapshot.length > 0) {
      setCoveringItems(item.items_snapshot);
    }
    setCoveringClosingPhrase(item.closing_phrase || "Demikian kami sampaikan, atas kerja samanya diucapkan terima kasih.");
    setCoveringReceivedDate(item.received_date ? item.received_date.split("T")[0] : "");
    setCoveringShowSignatures(item.show_signatures ?? true);
    setCoveringShowReceiver(item.metadata?.show_receiver ?? (item.receiver_snapshot?.name ? true : true));
    setCoveringReceiverIsBlank(item.metadata?.receiver_is_blank ?? false);
    setCoveringReceiverIncludePhone(item.metadata?.receiver_include_phone ?? false);
    setCoveringReceiverPhone(item.metadata?.receiver_phone || "");
    setCoveringSenderEmployeeId(item.sender_employee_id ? String(item.sender_employee_id) : "");
    setCoveringReceiverEmployeeId((item.metadata as any)?.receiver_employee_id ? String((item.metadata as any).receiver_employee_id) : "");
    setCoveringSender(item.sender_snapshot || DEFAULT_COVERING_SENDER);
    setCoveringReceiver(item.receiver_snapshot || DEFAULT_COVERING_RECEIVER);
    setCoveringHeaderMode(
      item.metadata?.header_mode ||
        (isDraftNumber(item.number) && !extractDocumentSequence(item.number) ? "dash" : "with-number")
    );
  };

  const resetForm = () => {
    setCoveringSequence("");
    setCoveringKap("KAP.06.01");
    setCoveringDate(todayInputValue());
    setCoveringRegarding(
      "Penyampaian Permohonan Jadwal Lelang Non Eksekusi Wajib Barang Milik Negara (BMN) Berupa Kendaraan Bermotor Operasional / Dinas Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur"
    );
    setCoveringRecipientTitle("Kepala Kantor Pelayanan Kekayaan Negara dan Lelang");
    setCoveringRecipientLocation("Samarinda");
    setCoveringItems(DEFAULT_COVERING_ITEMS);
    setCoveringClosingPhrase("Demikian kami sampaikan, atas kerja samanya diucapkan terima kasih.");
    setCoveringReceivedDate("");
    setCoveringShowSignatures(true);
    setCoveringShowReceiver(true);
    setCoveringReceiverIsBlank(false);
    setCoveringReceiverIncludePhone(false);
    setCoveringReceiverPhone("");
    setCoveringSenderEmployeeId("");
    setCoveringReceiverEmployeeId("");
    setCoveringSender(DEFAULT_COVERING_SENDER);
    setCoveringReceiver(DEFAULT_COVERING_RECEIVER);
    setCoveringHeaderMode("with-number");
  };

  // History resources include full snapshots; synchronize edit mode once, without refetch overwriting a draft.

  useEffect(() => {
    if (editingAppliedRef.current === editingDocument) return;
    editingAppliedRef.current = editingDocument;
    if (editingDocument && editingDocument.type === "covering_letter" && editingDocument.item) {
      applyDataToForm(editingDocument.item as CoveringLetterHistory, Boolean(editingDocument.isDuplicate));
    } else if (!editingDocument) {
      resetForm();
    }
  }, [editingDocument, editingAppliedRef]);

  const fullCoveringNumber = useMemo(
    () => buildCoveringNumber(coveringSequence, coveringKap, coveringDate),
    [coveringDate, coveringKap, coveringSequence]
  );

  const coveringHasNumber = coveringHeaderMode === "with-number";



  const handleCoveringSenderEmployeeChange = (id: string) => {
    setCoveringSenderEmployeeId(id);
    if (!id) return;
    const emp = employees.find((e) => String(e.id) === id);
    if (!emp) return;
    setCoveringSender({
      name: emp.nama_lengkap,
      nip: formatNip(emp.nip),
      role: emp.jabatan || DEFAULT_COVERING_SENDER.role || "Pengirim",
    });
  };

  const handleCoveringReceiverEmployeeChange = (id: string) => {
    setCoveringReceiverEmployeeId(id);
    if (!id) return;
    const emp = employees.find((e) => String(e.id) === id);
    if (!emp) return;
    setCoveringReceiver((prev) => ({
      ...prev,
      name: emp.nama_lengkap,
      nip: formatNip(emp.nip),
      role: emp.jabatan || prev.role || "Penerima",
    }));
  };

  const addCoveringItem = () => {
    setCoveringItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        title: "",
        quantity: "1 (satu berkas)",
        description: "Lelang Non-Eksekusi",
      },
    ]);
  };

  const updateCoveringItem = (index: number, field: keyof CoveringLetterItem, value: string) => {
    setCoveringItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeCoveringItem = (index: number) => {
    setCoveringItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const saveCoveringLetter = async () => {
    const validItems = coveringItems.filter((it) => it.title.trim() !== "");
    if (coveringHeaderMode !== "none" && !coveringRegarding.trim()) {
      toast.error("Hal Surat Pengantar wajib diisi.");
      return;
    }
    if (validItems.length === 0) {
      toast.error("Tambahkan minimal 1 berkas yang dikirim.");
      return;
    }

    let finalNumber = "-";
    let docStatus = "draft";
    if (coveringHeaderMode === "with-number") {
      finalNumber = fullCoveringNumber;
      docStatus = coveringSequence.trim() ? "published" : "draft";
    } else if (coveringHeaderMode === "dash") {
      finalNumber = "-";
      docStatus = "published";
    } else {
      finalNumber = "-";
      docStatus = "draft";
    }

    setSavingCoveringLetter(true);
    try {
      const payload = {
        number: finalNumber,
        status: docStatus,
        regarding: coveringHeaderMode === "none" ? coveringRegarding.trim() || "-" : coveringRegarding,
        document_date: coveringDate,
        recipient_title: coveringRecipientTitle,
        recipient_location: coveringRecipientLocation,
        items: validItems,
        closing_phrase: coveringClosingPhrase,
        received_date: coveringReceivedDate || null,
        show_signatures: coveringShowSignatures,
        sender_employee_id: coveringSenderEmployeeId ? Number(coveringSenderEmployeeId) : null,
        sender: coveringSender,
        receiver: coveringShowReceiver ? coveringReceiver : null,
        metadata: {
          has_number: coveringHeaderMode === "with-number",
          header_mode: coveringHeaderMode,
          show_receiver: coveringShowReceiver,
          receiver_is_blank: coveringReceiverIsBlank,
          receiver_include_phone: coveringReceiverIncludePhone,
          receiver_phone: coveringReceiverPhone,
        },
      };

      if (editingDocument && editingDocument.type === "covering_letter" && editingDocument.id && !editingDocument.isDuplicate) {
        await api.put(`/bmn/covering-letters/${editingDocument.id}`, payload);
        toast.success(
          docStatus === "draft"
            ? "Draf Surat Pengantar berhasil diperbarui."
            : "Perubahan Surat Pengantar berhasil disimpan."
        );
        if (onClearEditing) onClearEditing();
      } else {
        await api.post("/bmn/covering-letters", payload);
        toast.success(
          docStatus === "draft"
            ? "Draf Surat Pengantar berhasil disimpan."
            : "Riwayat Surat Pengantar berhasil disimpan."
        );
        if (onClearEditing) onClearEditing();
      }
      if (onRefetchHistory) {
        await onRefetchHistory();
      }
    } catch {
      toast.error("Gagal menyimpan riwayat Surat Pengantar.");
    } finally {
      setSavingCoveringLetter(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
        <div>
          <h2 className="text-base font-bold text-[var(--ds-fg)]">Generate Surat Pengantar BMN</h2>
          <p className="text-xs text-[var(--ds-fg-muted)]">
            {coveringHasNumber ? fullCoveringNumber : "Nomor : -"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={saveCoveringLetter}
            disabled={savingCoveringLetter || !canGenerate}
          >
            {savingCoveringLetter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingDocument?.type === "covering_letter" && !editingDocument.isDuplicate
              ? coveringSequence.trim() || coveringHeaderMode !== "with-number"
                ? "Simpan Perubahan"
                : "Simpan Perubahan (Draf)"
              : !coveringSequence.trim() && coveringHeaderMode === "with-number"
              ? "Simpan Draf"
              : "Simpan Riwayat"}
          </Button>
          <Button
            className="rounded-xl gap-2"
            onClick={() => handlePrintCoveringLetter()}
          >
            <Printer className="w-4 h-4" />
            Cetak
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[370px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-4">
          {/* 1. Detail Surat Pengantar */}
          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)]">
                1. Detail Surat Pengantar
              </h3>
              <div className="flex flex-wrap items-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-0.5 text-xs font-medium">
                <button
                  type="button"
                  aria-pressed={coveringHeaderMode === "with-number"}
                  onClick={() => setCoveringHeaderMode("with-number")}
                  className={`rounded-md px-2.5 py-0.5 transition-colors duration-150 ease-out ${
                    coveringHeaderMode === "with-number"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs   font-semibold"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                  }`}
                >
                  Ada Nomor
                </button>
                <button
                  type="button"
                  aria-pressed={coveringHeaderMode === "dash"}
                  onClick={() => setCoveringHeaderMode("dash")}
                  className={`rounded-md px-2.5 py-0.5 transition-colors duration-150 ease-out ${
                    coveringHeaderMode === "dash"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs   font-semibold"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                  }`}
                >
                  Tanpa Nomor (-)
                </button>
                <button
                  type="button"
                  aria-pressed={coveringHeaderMode === "none"}
                  onClick={() => setCoveringHeaderMode("none")}
                  className={`rounded-md px-2.5 py-0.5 transition-colors duration-150 ease-out ${
                    coveringHeaderMode === "none"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs   font-semibold"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                  }`}
                >
                  Tanpa Nomor & Hal
                </button>
              </div>
            </div>
            <div className="space-y-2.5">
              {coveringHeaderMode === "with-number" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Nomor Urut</span>
                      <div className="mt-0.5 flex items-center rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2.5 py-1.5 text-xs">
                        <span className="font-mono text-[var(--ds-fg-muted)] mr-1 select-none">SP.</span>
                        <input
                          aria-label="Nomor Urut Surat Pengantar"
                  value={coveringSequence}
                          onChange={(e) => setCoveringSequence(e.target.value)}
                          placeholder="52"
                          className="w-full bg-transparent outline-none font-mono"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">KAP</span>
                      <input
                        value={coveringKap}
                        onChange={(e) => setCoveringKap(e.target.value)}
                        placeholder="KAP.06.01"
                        className="mt-0.5 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs outline-none font-mono"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg bg-[var(--ds-surface-muted)] px-3 py-2 text-xs text-[var(--ds-fg-secondary)]">
                    <span className="text-[var(--ds-fg-muted)]">Hasil Format Nomor: </span>
                    <span className="font-mono font-bold text-[var(--ds-accent-fg)]">{fullCoveringNumber}</span>
                  </div>
                </>
              )}

              {coveringHeaderMode === "dash" && (
                <div className="rounded-lg border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-2 text-center text-xs text-[var(--ds-fg-secondary)]">
                  Nomor surat diatur: <span className="font-mono font-bold text-[var(--ds-accent-fg)]">Nomor : -</span>
                </div>
              )}

              {coveringHeaderMode === "none" && (
                <div className="rounded-lg border border-dashed border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-3 py-2 text-center text-xs text-[var(--ds-accent-fg)]">
                  Surat pengantar diatur: <span className="font-semibold">Tanpa Nomor & Hal (langsung ke Yth.)</span>
                </div>
              )}

              {coveringHeaderMode !== "none" && (
                <label className="block">
                  <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Hal</span>
                  <textarea
                    rows={2}
                    value={coveringRegarding}
                    onChange={(e) => setCoveringRegarding(e.target.value)}
                    placeholder="Hal surat pengantar..."
                    className="mt-0.5 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs outline-none"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Tanggal Surat</span>
                <input
                  type="date"
                  value={coveringDate}
                  onChange={(e) => setCoveringDate(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs outline-none"
                />
              </label>
            </div>
          </div>

          {/* 2. Tujuan Surat (Yth) */}
          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)]">
              2. Tujuan Surat (Yth)
            </h3>
            <div className="space-y-2.5">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Kepada (Yth.)</span>
                <textarea
                  rows={2}
                  value={coveringRecipientTitle}
                  onChange={(e) => setCoveringRecipientTitle(e.target.value)}
                  placeholder="Kepala Kantor Pelayanan Kekayaan Negara dan Lelang"
                  className="mt-0.5 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Di (Lokasi Tujuan)</span>
                <input
                  value={coveringRecipientLocation}
                  onChange={(e) => setCoveringRecipientLocation(e.target.value)}
                  placeholder="Samarinda"
                  className="mt-0.5 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs outline-none"
                />
              </label>
            </div>
          </div>

          {/* 3. Daftar Berkas yang Dikirim */}
          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
            <div className="mb-3 flex flex-wrap gap-2 items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)]">
                3. Daftar Berkas yang Dikirim
              </h3>
              <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={addCoveringItem}>
                + Tambah Berkas
              </Button>
            </div>
            <div className="space-y-3">
              {coveringItems.map((item, index) => (
                <div key={item.id || index} className="rounded-xl border border-[var(--ds-border-subtle)] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--ds-fg-muted)]">
                    <span>Berkas #{index + 1}</span>
                    {coveringItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCoveringItem(index)}
                        className="text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] text-xs"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <label className="block">
                    <span className="text-xs text-[var(--ds-fg-muted)]">Berkas yang Dikirim</span>
                    <textarea
                      rows={4}
                      value={item.title}
                      onChange={(e) => updateCoveringItem(index, "title", e.target.value)}
                      placeholder="Rincian berkas dokumen yang dikirim..."
                      className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-2.5 text-xs leading-relaxed outline-none min-h-22.5 resize-y"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-xs text-[var(--ds-fg-muted)]">Banyaknya</span>
                      <input
                        value={item.quantity || ""}
                        onChange={(e) => updateCoveringItem(index, "quantity", e.target.value)}
                        placeholder="1 (satu berkas)"
                        className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-[var(--ds-fg-muted)]">Keterangan</span>
                      <input
                        value={item.description || ""}
                        onChange={(e) => updateCoveringItem(index, "description", e.target.value)}
                        placeholder="Lelang Non-Eksekusi"
                        className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Kalimat Penutup & Tanggal Terima */}
          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)]">
              4. Penutup & Tanggal Terima
            </h3>
            <div className="space-y-2.5">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Kalimat Penutup</span>
                <textarea
                  rows={2}
                  value={coveringClosingPhrase}
                  onChange={(e) => setCoveringClosingPhrase(e.target.value)}
                  placeholder="Demikian kami sampaikan..."
                  className="mt-0.5 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs outline-none"
                />
              </label>
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Tanggal Diterima</span>
                  {coveringReceivedDate && (
                    <button
                      type="button"
                      onClick={() => setCoveringReceivedDate("")}
                      className="text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)] underline"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={coveringReceivedDate || ""}
                  onChange={(e) => setCoveringReceivedDate(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs outline-none"
                />
              </label>
            </div>
          </div>

          {/* 5. Konfigurasi Tanda Tangan */}
          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
            <div className="mb-3 flex flex-wrap gap-2 items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-secondary)]">
                5. Penandatangan
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coveringShowSignatures}
                  onChange={(e) => setCoveringShowSignatures(e.target.checked)}
                  className="rounded border-[var(--ds-border-subtle)] text-[var(--ds-accent-fg)]"
                />
                <span className="text-xs font-medium text-[var(--ds-fg-secondary)]">Tampilkan TTD</span>
              </label>
            </div>

            {coveringShowSignatures && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[var(--ds-surface-muted)] p-2 text-xs">
                  <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Pilihan TTD:</span>
                  <div className="flex flex-wrap items-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-0.5 text-xs font-medium">
                    <button
                      type="button"
                      aria-pressed={coveringShowReceiver}
                      onClick={() => setCoveringShowReceiver(true)}
                      className={`rounded-md px-2.5 py-0.5 transition-colors duration-150 ease-out ${
                        coveringShowReceiver
                          ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs   font-semibold"
                          : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                      }`}
                    >
                      Pengirim & Penerima
                    </button>
                    <button
                      type="button"
                      aria-pressed={!coveringShowReceiver}
                      onClick={() => setCoveringShowReceiver(false)}
                      className={`rounded-md px-2.5 py-0.5 transition-colors duration-150 ease-out ${
                        !coveringShowReceiver
                          ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs   font-semibold"
                          : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                      }`}
                    >
                      Hanya Pengirim
                    </button>
                  </div>
                </div>

                {/* Pengirim */}
                <div className="rounded-xl border border-[var(--ds-border-subtle)] p-2.5 space-y-2">
                  <div className="text-xs font-bold text-[var(--ds-fg-secondary)]">Pengirim</div>
                  <label className="block">
                    <span className="text-xs text-[var(--ds-fg-muted)]">Pilih dari Pegawai</span>
                    <select
                      value={coveringSenderEmployeeId}
                      onChange={(e) => handleCoveringSenderEmployeeChange(e.target.value)}
                      disabled={loadingEmployees}
                      className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs"
                    >
                      <option value="">Input Manual</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.nama_lengkap || employee.name} - {formatNip(employee.nip)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-xs text-[var(--ds-fg-muted)]">Nama Pengirim</span>
                      <input
                        value={coveringSender.name || ""}
                        onChange={(e) => setCoveringSender((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nama Pengirim"
                        className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-[var(--ds-fg-muted)]">NIP Pengirim</span>
                      <input
                        value={coveringSender.nip || ""}
                        onChange={(e) => setCoveringSender((p) => ({ ...p, nip: e.target.value }))}
                        onBlur={(e) => setCoveringSender((p) => ({ ...p, nip: formatNip(e.target.value) }))}
                        placeholder="NIP Pengirim"
                        className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs text-[var(--ds-fg-muted)]">Jabatan / Judul TTD Pengirim</span>
                    <textarea
                      rows={2}
                      value={coveringSender.role || ""}
                      onChange={(e) => setCoveringSender((p) => ({ ...p, role: e.target.value }))}
                      placeholder={"Pengirim,\nPenjual Lelang"}
                      className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                    />
                  </label>
                </div>

                {/* Penerima */}
                {coveringShowReceiver && (
                  <div className="rounded-xl border border-[var(--ds-border-subtle)] p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--ds-fg-secondary)]">Penerima</span>
                        <button
                          type="button"
                          onClick={() => setCoveringReceiver((p) => ({ ...p, name: "", nip: " " }))}
                          title="Kosongkan Nama dan isi spasi pada NIP agar muncul tulisan NIP kosong di kertas untuk diisi manual"
                          className="text-xs text-[var(--ds-accent-fg)] hover:text-[var(--ds-accent-fg)] hover:underline cursor-pointer"
                        >
                          (Kosongkan TTD)
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-0.5 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setCoveringReceiver((p) => ({ ...p, idType: "NIP" }))}
                          className={`rounded-md px-2.5 py-0.5 transition-colors duration-150 ease-out ${
                            coveringReceiver.idType !== "NIK"
                              ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs   font-semibold"
                              : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                          }`}
                        >
                          NIP
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCoveringReceiver((p) => ({ ...p, idType: "NIK" }));
                            setCoveringReceiverEmployeeId("");
                          }}
                          className={`rounded-md px-2.5 py-0.5 transition-colors duration-150 ease-out ${
                            coveringReceiver.idType === "NIK"
                              ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs   font-semibold"
                              : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                          }`}
                        >
                          NIK
                        </button>
                      </div>
                    </div>

                    {coveringReceiver.idType !== "NIK" && (
                      <label className="block">
                        <span className="text-xs text-[var(--ds-fg-muted)]">Pilih dari Pegawai (Opsional)</span>
                        <select
                          value={coveringReceiverEmployeeId}
                          onChange={(e) => handleCoveringReceiverEmployeeChange(e.target.value)}
                          disabled={loadingEmployees}
                          className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs"
                        >
                          <option value="">Input Manual</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.nama_lengkap || employee.name} - {formatNip(employee.nip)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-xs text-[var(--ds-fg-muted)]">Nama Penerima</span>
                        <input
                          value={coveringReceiver.name || ""}
                          onChange={(e) => setCoveringReceiver((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Nama Pejabat Penerima"
                          className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-[var(--ds-fg-muted)]">
                          {coveringReceiver.idType === "NIK" ? "NIK Penerima" : "NIP Penerima"}
                        </span>
                        <input
                          value={coveringReceiver.nip ?? ""}
                          onChange={(e) => setCoveringReceiver((p) => ({ ...p, nip: e.target.value }))}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val.startsWith(" ")) {
                              setCoveringReceiver((p) => ({ ...p, nip: " " }));
                            } else if (coveringReceiver.idType === "NIK") {
                              setCoveringReceiver((p) => ({ ...p, nip: val.trim() }));
                            } else {
                              setCoveringReceiver((p) => ({ ...p, nip: val.trim() ? formatNip(val) : "" }));
                            }
                          }}
                          placeholder={
                            coveringReceiver.idType === "NIK"
                              ? "NIK... (spasi untuk NIK kosong)"
                              : "NIP... (spasi untuk NIP kosong)"
                          }
                          className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs text-[var(--ds-fg-muted)]">Jabatan / Judul TTD Penerima</span>
                      <textarea
                        rows={2}
                        value={coveringReceiver.role || ""}
                        onChange={(e) => setCoveringReceiver((p) => ({ ...p, role: e.target.value }))}
                        placeholder={"Penerima,\nPejabat Lelang"}
                        className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                      />
                    </label>

                    {/* No. Telepon Penerima */}
                    <div className="pt-2 border-t border-[var(--ds-border-subtle)] space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={coveringReceiverIncludePhone}
                          onChange={(e) => setCoveringReceiverIncludePhone(e.target.checked)}
                          className="rounded border-[var(--ds-border-subtle)] text-[var(--ds-accent-fg)]"
                        />
                        <span className="text-xs font-medium text-[var(--ds-fg-secondary)]">
                          Tampilkan No. Telp / HP Penerima di Dokumen
                        </span>
                      </label>

                      {coveringReceiverIncludePhone && (
                        <label className="block pl-6">
                          <span className="text-xs text-[var(--ds-fg-muted)]">
                            No. Telepon / HP Penerima (Opsional, kosongkan jika ingin diisi manual di kertas)
                          </span>
                          <input
                            type="text"
                            value={coveringReceiverPhone}
                            onChange={(e) => setCoveringReceiverPhone(e.target.value)}
                            placeholder="Contoh: 081234567890 (atau kosongkan)"
                            className="mt-0.5 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs outline-none"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Dokumen */}
        <div className="min-w-0 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 sticky top-4">
          <div className="mb-3 flex flex-wrap gap-2 items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">6. Preview Dokumen</h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                {coveringHeaderMode === "none"
                  ? "Tanpa Nomor & Hal"
                  : coveringHeaderMode === "dash"
                  ? "Nomor : -"
                  : fullCoveringNumber}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-2 sm:p-4 flex justify-center">
            <CoveringLetterDocument
              number={coveringHeaderMode === "with-number" ? fullCoveringNumber : "-"}
              hasNumber={coveringHeaderMode === "with-number"}
              showNumberAndRegarding={coveringHeaderMode !== "none"}
              regarding={coveringRegarding}
              documentDate={coveringDate}
              recipientTitle={coveringRecipientTitle}
              recipientLocation={coveringRecipientLocation}
              items={coveringItems}
              closingPhrase={coveringClosingPhrase}
              receivedDate={coveringReceivedDate}
              showSignatures={coveringShowSignatures}
              showReceiverSignature={coveringShowReceiver}
              receiverIncludePhone={coveringReceiverIncludePhone}
              receiverPhone={coveringReceiverPhone}
              sender={coveringSender}
              receiver={coveringShowReceiver ? coveringReceiver : null}
            />
          </div>
        </div>
      </div>
    </>
  );
}
