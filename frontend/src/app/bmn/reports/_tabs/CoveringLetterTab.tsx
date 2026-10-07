"use client";

import { useEffect, useMemo, useState } from "react";
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
  employees: EmployeeOption[];
  loadingEmployees?: boolean;
  canGenerate?: boolean;
  editingDocument?: EditingDocumentState | null;
  onClearEditing?: () => void;
  onRefetchHistory?: () => Promise<void> | void;
}

export function CoveringLetterTab({
  employees,
  loadingEmployees = false,
  canGenerate = true,
  editingDocument,
  onClearEditing,
  onRefetchHistory,
}: CoveringLetterTabProps) {
  const [coveringSequence, setCoveringSequence] = useState("");
  const [coveringKap, setCoveringKap] = useState("KAP.06.01");
  const [coveringDate, setCoveringDate] = useState(todayInputValue());
  const [coveringRegarding, setCoveringRegarding] = useState(
    "Penyampaian Permohonan Jadwal Lelang Non Eksekusi Wajib Barang Milik Negara (BMN) Berupa Kendaraan Bermotor Operasional / Dinas Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur"
  );
  const [coveringRecipientTitle, setCoveringRecipientTitle] = useState(
    "Kepala Kantor Pelayanan Kekayaan Negara dan Lelang"
  );
  const [coveringRecipientLocation, setCoveringRecipientLocation] = useState("Samarinda");
  const [coveringItems, setCoveringItems] = useState<CoveringLetterItem[]>(DEFAULT_COVERING_ITEMS);
  const [coveringClosingPhrase, setCoveringClosingPhrase] = useState(
    "Demikian kami sampaikan, atas kerja samanya diucapkan terima kasih."
  );
  const [coveringReceivedDate, setCoveringReceivedDate] = useState("");
  const [coveringShowSignatures, setCoveringShowSignatures] = useState(true);
  const [coveringShowReceiver, setCoveringShowReceiver] = useState(true);
  const [coveringReceiverIsBlank, setCoveringReceiverIsBlank] = useState(false);
  const [coveringReceiverIncludePhone, setCoveringReceiverIncludePhone] = useState(false);
  const [coveringReceiverPhone, setCoveringReceiverPhone] = useState("");
  const [coveringSenderEmployeeId, setCoveringSenderEmployeeId] = useState("");
  const [coveringReceiverEmployeeId, setCoveringReceiverEmployeeId] = useState("");
  const [coveringSender, setCoveringSender] = useState<CoveringLetterParty>(DEFAULT_COVERING_SENDER);
  const [coveringReceiver, setCoveringReceiver] = useState<CoveringLetterParty>(DEFAULT_COVERING_RECEIVER);
  const [coveringHeaderMode, setCoveringHeaderMode] = useState<"with-number" | "dash" | "none">("with-number");
  const [savingCoveringLetter, setSavingCoveringLetter] = useState(false);

  const fullCoveringNumber = useMemo(
    () => buildCoveringNumber(coveringSequence, coveringKap, coveringDate),
    [coveringDate, coveringKap, coveringSequence]
  );

  const coveringHasNumber = coveringHeaderMode === "with-number";

  useEffect(() => {
    if (!coveringSenderEmployeeId) {
      setCoveringSender(DEFAULT_COVERING_SENDER);
      return;
    }
    const emp = employees.find((e) => String(e.id) === coveringSenderEmployeeId);
    if (!emp) return;
    setCoveringSender({
      name: emp.nama_lengkap,
      nip: formatNip(emp.nip),
      role: emp.jabatan || DEFAULT_COVERING_SENDER.role || "Pengirim",
    });
  }, [employees, coveringSenderEmployeeId]);

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

      if (editingDocument && editingDocument.type === "covering_letter") {
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Generate Surat Pengantar BMN</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
            {editingDocument?.type === "covering_letter"
              ? coveringSequence.trim() || coveringHeaderMode !== "with-number"
                ? "Simpan Perubahan"
                : "Simpan Perubahan (Draf)"
              : !coveringSequence.trim() && coveringHeaderMode === "with-number"
              ? "Simpan Draf"
              : "Simpan Riwayat"}
          </Button>
          <Button
            className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500"
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
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                1. Detail Surat Pengantar
              </h3>
              <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-[11px] font-medium dark:border-zinc-700 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => setCoveringHeaderMode("with-number")}
                  className={`rounded-md px-2.5 py-0.5 transition ${
                    coveringHeaderMode === "with-number"
                      ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  Ada Nomor
                </button>
                <button
                  type="button"
                  onClick={() => setCoveringHeaderMode("dash")}
                  className={`rounded-md px-2.5 py-0.5 transition ${
                    coveringHeaderMode === "dash"
                      ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  Tanpa Nomor (-)
                </button>
                <button
                  type="button"
                  onClick={() => setCoveringHeaderMode("none")}
                  className={`rounded-md px-2.5 py-0.5 transition ${
                    coveringHeaderMode === "none"
                      ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
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
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Nomor Urut</span>
                      <div className="mt-0.5 flex items-center rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                        <span className="font-mono text-zinc-400 mr-1 select-none">SP.</span>
                        <input
                          value={coveringSequence}
                          onChange={(e) => setCoveringSequence(e.target.value)}
                          placeholder="52"
                          className="w-full bg-transparent outline-none dark:text-zinc-100 font-mono"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">KAP</span>
                      <input
                        value={coveringKap}
                        onChange={(e) => setCoveringKap(e.target.value)}
                        placeholder="KAP.06.01"
                        className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 font-mono"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                    <span className="text-zinc-500">Hasil Format Nomor: </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{fullCoveringNumber}</span>
                  </div>
                </>
              )}

              {coveringHeaderMode === "dash" && (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300">
                  Nomor surat diatur: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">Nomor : -</span>
                </div>
              )}

              {coveringHeaderMode === "none" && (
                <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2 text-center text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Surat pengantar diatur: <span className="font-semibold">Tanpa Nomor & Hal (langsung ke Yth.)</span>
                </div>
              )}

              {coveringHeaderMode !== "none" && (
                <label className="block">
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Hal</span>
                  <textarea
                    rows={2}
                    value={coveringRegarding}
                    onChange={(e) => setCoveringRegarding(e.target.value)}
                    placeholder="Hal surat pengantar..."
                    className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Tanggal Surat</span>
                <input
                  type="date"
                  value={coveringDate}
                  onChange={(e) => setCoveringDate(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
          </div>

          {/* 2. Tujuan Surat (Yth) */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              2. Tujuan Surat (Yth)
            </h3>
            <div className="space-y-2.5">
              <label className="block">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Kepada (Yth.)</span>
                <textarea
                  rows={2}
                  value={coveringRecipientTitle}
                  onChange={(e) => setCoveringRecipientTitle(e.target.value)}
                  placeholder="Kepala Kantor Pelayanan Kekayaan Negara dan Lelang"
                  className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Di (Lokasi Tujuan)</span>
                <input
                  value={coveringRecipientLocation}
                  onChange={(e) => setCoveringRecipientLocation(e.target.value)}
                  placeholder="Samarinda"
                  className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
          </div>

          {/* 3. Daftar Berkas yang Dikirim */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                3. Daftar Berkas yang Dikirim
              </h3>
              <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg px-2 text-[11px]" onClick={addCoveringItem}>
                + Tambah Berkas
              </Button>
            </div>
            <div className="space-y-3">
              {coveringItems.map((item, index) => (
                <div key={item.id || index} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                    <span>Berkas #{index + 1}</span>
                    {coveringItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCoveringItem(index)}
                        className="text-rose-500 hover:text-rose-700 text-[11px]"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <label className="block">
                    <span className="text-[10px] text-zinc-500">Berkas yang Dikirim</span>
                    <textarea
                      rows={4}
                      value={item.title}
                      onChange={(e) => updateCoveringItem(index, "title", e.target.value)}
                      placeholder="Rincian berkas dokumen yang dikirim..."
                      className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-xs leading-relaxed outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 min-h-[90px] resize-y"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[10px] text-zinc-500">Banyaknya</span>
                      <input
                        value={item.quantity || ""}
                        onChange={(e) => updateCoveringItem(index, "quantity", e.target.value)}
                        placeholder="1 (satu berkas)"
                        className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-zinc-500">Keterangan</span>
                      <input
                        value={item.description || ""}
                        onChange={(e) => updateCoveringItem(index, "description", e.target.value)}
                        placeholder="Lelang Non-Eksekusi"
                        className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Kalimat Penutup & Tanggal Terima */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              4. Penutup & Tanggal Terima
            </h3>
            <div className="space-y-2.5">
              <label className="block">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Kalimat Penutup</span>
                <textarea
                  rows={2}
                  value={coveringClosingPhrase}
                  onChange={(e) => setCoveringClosingPhrase(e.target.value)}
                  placeholder="Demikian kami sampaikan..."
                  className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Tanggal Diterima</span>
                  {coveringReceivedDate && (
                    <button
                      type="button"
                      onClick={() => setCoveringReceivedDate("")}
                      className="text-[10px] text-zinc-400 hover:text-zinc-600 underline"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={coveringReceivedDate || ""}
                  onChange={(e) => setCoveringReceivedDate(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
          </div>

          {/* 5. Konfigurasi Tanda Tangan */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                5. Penandatangan
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coveringShowSignatures}
                  onChange={(e) => setCoveringShowSignatures(e.target.checked)}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Tampilkan TTD</span>
              </label>
            </div>

            {coveringShowSignatures && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-2 text-xs dark:bg-zinc-800/50">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">Pilihan TTD:</span>
                  <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-[11px] font-medium dark:border-zinc-700 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setCoveringShowReceiver(true)}
                      className={`rounded-md px-2.5 py-0.5 transition ${
                        coveringShowReceiver
                          ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400 font-semibold"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                      }`}
                    >
                      Pengirim & Penerima
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoveringShowReceiver(false)}
                      className={`rounded-md px-2.5 py-0.5 transition ${
                        !coveringShowReceiver
                          ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400 font-semibold"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                      }`}
                    >
                      Hanya Pengirim
                    </button>
                  </div>
                </div>

                {/* Pengirim */}
                <div className="rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800 space-y-2">
                  <div className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Pengirim</div>
                  <label className="block">
                    <span className="text-[10px] text-zinc-500">Pilih dari Pegawai</span>
                    <select
                      value={coveringSenderEmployeeId}
                      onChange={(e) => handleCoveringSenderEmployeeChange(e.target.value)}
                      disabled={loadingEmployees}
                      className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      <option value="">Input Manual</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.nama_lengkap} - {formatNip(employee.nip)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[10px] text-zinc-500">Nama Pengirim</span>
                      <input
                        value={coveringSender.name || ""}
                        onChange={(e) => setCoveringSender((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nama Pengirim"
                        className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-zinc-500">NIP Pengirim</span>
                      <input
                        value={coveringSender.nip || ""}
                        onChange={(e) => setCoveringSender((p) => ({ ...p, nip: e.target.value }))}
                        onBlur={(e) => setCoveringSender((p) => ({ ...p, nip: formatNip(e.target.value) }))}
                        placeholder="NIP Pengirim"
                        className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[10px] text-zinc-500">Jabatan / Judul TTD Pengirim</span>
                    <textarea
                      rows={2}
                      value={coveringSender.role || ""}
                      onChange={(e) => setCoveringSender((p) => ({ ...p, role: e.target.value }))}
                      placeholder={"Pengirim,\nPenjual Lelang"}
                      className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>
                </div>

                {/* Penerima */}
                {coveringShowReceiver && (
                  <div className="rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Penerima</span>
                        <button
                          type="button"
                          onClick={() => setCoveringReceiver((p) => ({ ...p, name: "", nip: " " }))}
                          title="Kosongkan Nama dan isi spasi pada NIP agar muncul tulisan NIP kosong di kertas untuk diisi manual"
                          className="text-[10px] text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          (Kosongkan TTD)
                        </button>
                      </div>
                      <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-[11px] font-medium dark:border-zinc-700 dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={() => setCoveringReceiver((p) => ({ ...p, idType: "NIP" }))}
                          className={`rounded-md px-2.5 py-0.5 transition ${
                            coveringReceiver.idType !== "NIK"
                              ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400 font-semibold"
                              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
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
                          className={`rounded-md px-2.5 py-0.5 transition ${
                            coveringReceiver.idType === "NIK"
                              ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400 font-semibold"
                              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                          }`}
                        >
                          NIK
                        </button>
                      </div>
                    </div>

                    {coveringReceiver.idType !== "NIK" && (
                      <label className="block">
                        <span className="text-[10px] text-zinc-500">Pilih dari Pegawai (Opsional)</span>
                        <select
                          value={coveringReceiverEmployeeId}
                          onChange={(e) => handleCoveringReceiverEmployeeChange(e.target.value)}
                          disabled={loadingEmployees}
                          className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        >
                          <option value="">Input Manual</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.nama_lengkap} - {formatNip(employee.nip)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] text-zinc-500">Nama Penerima</span>
                        <input
                          value={coveringReceiver.name || ""}
                          onChange={(e) => setCoveringReceiver((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Nama Pejabat Penerima"
                          className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-zinc-500">
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
                          className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-[10px] text-zinc-500">Jabatan / Judul TTD Penerima</span>
                      <textarea
                        rows={2}
                        value={coveringReceiver.role || ""}
                        onChange={(e) => setCoveringReceiver((p) => ({ ...p, role: e.target.value }))}
                        placeholder={"Penerima,\nPejabat Lelang"}
                        className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>

                    {/* No. Telepon Penerima */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={coveringReceiverIncludePhone}
                          onChange={(e) => setCoveringReceiverIncludePhone(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700"
                        />
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Tampilkan No. Telp / HP Penerima di Dokumen
                        </span>
                      </label>

                      {coveringReceiverIncludePhone && (
                        <label className="block pl-6">
                          <span className="text-[10px] text-zinc-500">
                            No. Telepon / HP Penerima (Opsional, kosongkan jika ingin diisi manual di kertas)
                          </span>
                          <input
                            type="text"
                            value={coveringReceiverPhone}
                            onChange={(e) => setCoveringReceiverPhone(e.target.value)}
                            placeholder="Contoh: 081234567890 (atau kosongkan)"
                            className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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
        <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sticky top-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">6. Preview Dokumen</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {coveringHeaderMode === "none"
                  ? "Tanpa Nomor & Hal"
                  : coveringHeaderMode === "dash"
                  ? "Nomor : -"
                  : fullCoveringNumber}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-2 sm:p-4 dark:border-zinc-800 dark:bg-zinc-950 flex justify-center">
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
