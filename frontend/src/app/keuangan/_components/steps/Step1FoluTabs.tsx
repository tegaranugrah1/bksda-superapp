"use client";

import React, { useState } from "react";
import {
  Banknote,
  Check,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Plus,
  ReceiptText,
  Table2,
  Trash2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FinanceEmployee, formatRupiah } from "@/app/keuangan/_components/finance-data";
import {
  KwitansiConfig,
  MengetahuiOfficial,
  Official,
  RecipientRow,
  SpbConfig,
  SpdConfig,
  TransportItem,
  DEFAULT_SUFFIX,
  DEFAULT_SPD_ANGGARAN_HEADER,
  buildDefaultRinba,
  buildExternalMcuDescription,
  calculateRinbaTotal,
  formatNip,
  formatRupiahInput,
  parseRupiahInput,
} from "@/app/keuangan/_components/templates/shared";
import { SearchableOfficialSelect } from "./SearchableOfficialSelect";

export interface Step1FoluTabsProps {
  recipients: RecipientRow[];
  setRecipients: React.Dispatch<React.SetStateAction<RecipientRow[]>>;
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  total: number;
  activeFoluTab: "rekap" | "spb" | "kwitansi" | "rinba" | "spd";
  setActiveFoluTab: (t: "rekap" | "spb" | "kwitansi" | "rinba" | "spd") => void;
  defaultEvidenceSuffix: string;
  setDefaultEvidenceSuffix: (v: string) => void;
  ppk: Official;
  setPpk: (o: Official) => void;
  pdo: Official;
  setPdo: (o: Official) => void;
  verifikator: Official;
  setVerifikator: (o: Official) => void;
  allEmployees: FinanceEmployee[];
  spbNumber: { no: string; suffix: string };
  setSpbNumber: React.Dispatch<React.SetStateAction<{ no: string; suffix: string }>>;
  spdNumber: { no: string; suffix: string };
  setSpdNumber: React.Dispatch<React.SetStateAction<{ no: string; suffix: string }>>;
  spbConfig: SpbConfig;
  setSpbConfig: React.Dispatch<React.SetStateAction<SpbConfig>>;
  spdConfig: SpdConfig;
  setSpdConfig: React.Dispatch<React.SetStateAction<SpdConfig>>;
  kwitansiConfig: KwitansiConfig;
  setKwitansiConfig: React.Dispatch<React.SetStateAction<KwitansiConfig>>;
  pejabatMengetahuiList: MengetahuiOfficial[];
  activity: { awpCode: string; name: string };
  spjName: string;
}

export function Step1FoluTabs({
  recipients,
  setRecipients,
  travel,
  total,
  activeFoluTab,
  setActiveFoluTab,
  defaultEvidenceSuffix,
  setDefaultEvidenceSuffix,
  ppk,
  setPpk,
  pdo,
  setPdo,
  verifikator,
  setVerifikator,
  allEmployees,
  spbNumber,
  setSpbNumber,
  spdNumber,
  setSpdNumber,
  spbConfig,
  setSpbConfig,
  spdConfig,
  setSpdConfig,
  kwitansiConfig,
  setKwitansiConfig,
  pejabatMengetahuiList,
  activity,
  spjName,
}: Step1FoluTabsProps) {
  // Local states for external recipient modal/form
  const [externalName, setExternalName] = useState("UPTD Lab. Kesehatan Daerah Kota Samarinda");
  const [externalAmount, setExternalAmount] = useState(115000);
  const [externalBankName, setExternalBankName] = useState("BPD Kaltimtara");
  const [externalAccountNo, setExternalAccountNo] = useState("00360012402202040039");
  const [externalAccountHolder, setExternalAccountHolder] = useState("UPTD Lab. Kesehatan Daerah Kota Samarinda");
  const [externalEvidenceNo, setExternalEvidenceNo] = useState("");
  const [externalEvidenceSuffix, setExternalEvidenceSuffix] = useState(DEFAULT_SUFFIX);
  const [externalDescription, setExternalDescription] = useState(() =>
    buildExternalMcuDescription("Menik Tjahyoningrum, A.Md.", travel.startDate)
  );

  const updateRecipient = (id: string, patch: Partial<RecipientRow>) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const removeRecipient = (id: string) => {
    if (recipients.length <= 1) {
      toast.error("Minimal harus ada 1 personil penerima.");
      return;
    }
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    toast.success("Penerima berhasil dihapus dari daftar.");
  };

  const addExternal = () => {
    if (!externalName.trim()) {
      toast.error("Nama instansi penerima eksternal harus diisi.");
      return;
    }
    if (externalAmount <= 0) {
      toast.error("Jumlah biaya harus lebih dari 0.");
      return;
    }

    const newId = `ext-${Date.now()}`;
    const newExt: RecipientRow = {
      id: newId,
      name: externalName.trim(),
      type: "pihak_ketiga",
      description: externalDescription.trim() || `Biaya Medical Check Up a.n. Peserta Kegiatan`,
      evidenceNo: externalEvidenceNo.trim(),
      evidenceSuffix: externalEvidenceSuffix.trim() || defaultEvidenceSuffix,
      amount: externalAmount,
      bankName: externalBankName.trim() || "BPD Kaltimtara",
      accountNo: externalAccountNo.trim() || "",
      accountHolder: externalAccountHolder.trim() || externalName.trim(),
    };

    setRecipients((prev) => [...prev, newExt]);
    toast.success(`Penerima eksternal "${newExt.name}" berhasil ditambahkan.`);
  };

  const updateRinbaOperasionalDays = (recipientId: string, days: number) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentRinba = r.rinba || buildDefaultRinba(r.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const updatedRinba = { ...currentRinba, operasionalDays: days };
        const newTotal = calculateRinbaTotal(updatedRinba);
        return {
          ...r,
          amount: newTotal,
          rinba: updatedRinba,
        };
      })
    );
  };

  const updateRinbaOperasionalDailyRate = (recipientId: string, rate: number) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentRinba = r.rinba || buildDefaultRinba(r.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const updatedRinba = { ...currentRinba, operasionalDailyRate: rate };
        const newTotal = calculateRinbaTotal(updatedRinba);
        return {
          ...r,
          amount: newTotal,
          rinba: updatedRinba,
        };
      })
    );
  };

  const updateRinbaTransportItem = (recipientId: string, itemIdx: number, patch: Partial<TransportItem>) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentRinba = r.rinba || buildDefaultRinba(r.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const nextItems = [...currentRinba.transportItems];
        nextItems[itemIdx] = { ...nextItems[itemIdx], ...patch };
        const updatedRinba = { ...currentRinba, transportItems: nextItems };
        const newTotal = calculateRinbaTotal(updatedRinba);
        return {
          ...r,
          amount: newTotal,
          rinba: updatedRinba,
        };
      })
    );
  };

  const addRinbaTransportItem = (recipientId: string) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentRinba = r.rinba || buildDefaultRinba(r.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const newItem: TransportItem = {
          id: `t-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          label: "Transportasi Darat / Sungai Tambahan",
          amount: 0,
        };
        const updatedRinba = {
          ...currentRinba,
          transportItems: [...currentRinba.transportItems, newItem],
        };
        const newTotal = calculateRinbaTotal(updatedRinba);
        return {
          ...r,
          amount: newTotal,
          rinba: updatedRinba,
        };
      })
    );
  };

  const removeRinbaTransportItem = (recipientId: string, itemIdx: number) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentRinba = r.rinba || buildDefaultRinba(r.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const nextItems = [...currentRinba.transportItems];
        nextItems.splice(itemIdx, 1);
        const updatedRinba = { ...currentRinba, transportItems: nextItems };
        const newTotal = calculateRinbaTotal(updatedRinba);
        return {
          ...r,
          amount: newTotal,
          rinba: updatedRinba,
        };
      })
    );
  };

  return (
    <div className="space-y-6 mt-6">
      {/* EXCEL-STYLE 5-TAB NAVIGATION FOR FOLU */}
      <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-2 dark:border-slate-800 dark:bg-slate-900/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 mb-1.5 border-b border-slate-200/80 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              5 Form Dokumen FOLU (Sheet Tab)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Total Biaya FOLU:</span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { key: "rekap" as const, label: "1. Rekap", desc: "Tabel Penerima", icon: Table2, badge: `${recipients.length} Org` },
            { key: "spb" as const, label: "2. SPB", desc: "Persetujuan Bayar", icon: CreditCard, badge: "SPB" },
            { key: "kwitansi" as const, label: "3. Kwitansi", desc: "Rekening & Pejabat", icon: Banknote, badge: "Bank" },
            { key: "rinba" as const, label: "4. Rinba", desc: "Hari & Transport", icon: ReceiptText, badge: "Riil" },
            { key: "spd" as const, label: "5. SPD", desc: "Lembar Muka", icon: FileText, badge: "SPD" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFoluTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFoluTab(tab.key)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all ${
                  isActive
                    ? "border-amber-500 bg-white text-amber-950 shadow-md ring-2 ring-amber-500/20 dark:border-amber-500 dark:bg-slate-800 dark:text-amber-100"
                    : "border-transparent bg-slate-200/50 text-slate-600 hover:border-slate-300 hover:bg-white dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-600" : "text-slate-400"}`} />
                    <span>{tab.label}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 font-semibold ${
                      isActive
                        ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                        : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700"
                    }`}
                  >
                    {tab.badge}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{tab.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: REKAP */}
      {activeFoluTab === "rekap" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Format Default Suffix Bukti / Kwitansi FOLU
              </label>
              <button
                type="button"
                onClick={() => {
                  setRecipients((prev) =>
                    prev.map((r) => ({ ...r, evidenceSuffix: defaultEvidenceSuffix }))
                  );
                  toast.success("Suffix diterapkan ke semua baris penerima!");
                }}
                className="text-[10px] text-amber-600 hover:underline font-semibold"
              >
                Terapkan ke Semua
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={defaultEvidenceSuffix || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setDefaultEvidenceSuffix(val);
                  setRecipients((prev) =>
                    prev.map((r) => ({ ...r, evidenceSuffix: val }))
                  );
                }}
                placeholder="/K.18/FOLU.NC-23/08/2026"
                className="w-full rounded-xl font-mono text-xs text-amber-800 dark:text-amber-300 font-semibold"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Daftar Penerima &amp; Rekapitulasi Pembayaran SPJ FOLU
                </h3>
                <p className="text-[11px] text-slate-500">
                  Uraian, nomor bukti, dan nominal pertanggungjawaban belanja.
                </p>
              </div>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {recipients.length} Penerima
              </Badge>
            </div>

            <div className="hidden grid-cols-[2.5rem_1.1fr_2fr_1.4fr_1fr_auto] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:grid dark:bg-slate-800">
              <span className="whitespace-nowrap">NO</span>
              <span>Penerima</span>
              <span>Uraian</span>
              <span>Bukti (No. &amp; Format)</span>
              <span>Jumlah (Rp.)</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recipients.map((recipient, index) => (
                <div key={recipient.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                  <div className="grid gap-4 md:grid-cols-[2.5rem_1.1fr_2fr_1.4fr_1fr_auto] md:items-start">
                    <div className="text-xs font-bold text-slate-400 whitespace-nowrap pt-2">{index + 1}</div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Penerima</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          value={recipient.name || ""}
                          onChange={(e) => updateRecipient(recipient.id, { name: e.target.value })}
                          className="rounded-lg font-semibold text-xs"
                        />
                        <Badge
                          variant="outline"
                          className={
                            recipient.type === "pegawai"
                              ? "border-amber-200 bg-amber-50 text-amber-800 text-[10px]"
                              : "border-violet-200 bg-violet-50 text-violet-700 text-[10px]"
                          }
                        >
                          {recipient.type === "pegawai" ? "Pegawai" : "Eksternal"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Uraian</label>
                      <Textarea
                        value={recipient.description || ""}
                        onChange={(e) => updateRecipient(recipient.id, { description: e.target.value })}
                        className="mt-1 min-h-20 rounded-lg text-xs leading-5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Bukti</label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Input
                          value={recipient.evidenceNo || ""}
                          onChange={(e) => updateRecipient(recipient.id, { evidenceNo: e.target.value })}
                          placeholder="001"
                          className="w-16 shrink-0 rounded-lg text-center font-mono text-xs"
                        />
                        <Input
                          value={recipient.evidenceSuffix || DEFAULT_SUFFIX}
                          onChange={(e) => updateRecipient(recipient.id, { evidenceSuffix: e.target.value })}
                          className="min-w-0 flex-1 rounded-lg font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Jumlah (Rp.)</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatRupiahInput(recipient.amount)}
                        onChange={(e) => updateRecipient(recipient.id, { amount: parseRupiahInput(e.target.value) })}
                        className="mt-1 rounded-lg text-right font-mono text-xs font-semibold"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-rose-500 hover:bg-rose-50"
                        onClick={() => removeRecipient(recipient.id)}
                        aria-label="Hapus penerima"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Total {recipients.length} Penerima
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-500">Grand Total:</span>
                <span className="font-mono font-black text-base text-amber-800 dark:text-amber-300">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Tambah Penerima Eksternal Section */}
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-violet-600" />
                <h3 className="font-bold text-sm">Tambah Penerima Eksternal (Pihak Ketiga / MCU)</h3>
              </div>
              <Badge variant="outline" className="border-violet-300 bg-violet-50 text-[10px] text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                Labkesda / Puskesmas / Vendor
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Nama Instansi / Pihak Ketiga</label>
                  <Input
                    value={externalName || ""}
                    onChange={(e) => setExternalName(e.target.value)}
                    placeholder="Nama instansi (contoh: UPTD Labkesda)"
                    className="mt-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">No. Bukti</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Input
                      value={externalEvidenceNo || ""}
                      onChange={(e) => setExternalEvidenceNo(e.target.value)}
                      placeholder="No."
                      className="w-16 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-mono text-xs"
                    />
                    <Input
                      value={externalEvidenceSuffix || DEFAULT_SUFFIX}
                      onChange={(e) => setExternalEvidenceSuffix(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Jumlah Biaya (Rp)</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatRupiahInput(externalAmount)}
                    onChange={(e) => setExternalAmount(parseRupiahInput(e.target.value))}
                    placeholder="115.000"
                    className="mt-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-right font-mono text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Nama Bank</label>
                  <Input
                    value={externalBankName || ""}
                    onChange={(e) => setExternalBankName(e.target.value)}
                    placeholder="BPD Kaltimtara"
                    className="mt-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Nomor Rekening</label>
                  <Input
                    value={externalAccountNo || ""}
                    onChange={(e) => setExternalAccountNo(e.target.value)}
                    placeholder="00360012402202040039"
                    className="mt-1 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Rekening Atas Nama</label>
                  <Input
                    value={externalAccountHolder || ""}
                    onChange={(e) => setExternalAccountHolder(e.target.value)}
                    placeholder={externalName}
                    className="mt-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Uraian Pengeluaran / Keterangan Lengkap
                  </label>
                  <Textarea
                    value={externalDescription || ""}
                    onChange={(e) => setExternalDescription(e.target.value)}
                    placeholder="Uraian pengeluaran lengkap (contoh: Biaya Medical Check Up a.n ...)"
                    className="mt-1 min-h-16 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs leading-5"
                  />
                </div>

                <Button
                  type="button"
                  onClick={addExternal}
                  className="h-10 rounded-xl bg-violet-600 px-5 hover:bg-violet-500 text-white font-semibold text-xs shrink-0"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Tambah ke REKAP
                </Button>
              </div>
            </div>
          </div>

          {/* Pejabat Penandatangan Form Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-sm">Pejabat dan pengelola</h3>
              </div>
              <Badge variant="outline" className="text-[10px] text-slate-500 font-normal">
                Cari dari master pegawai
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <SearchableOfficialSelect
                  label="Pejabat Pembuat Komitmen"
                  value={ppk}
                  onChange={setPpk}
                  employees={allEmployees}
                  defaultRoleLabel="Pejabat Pembuat Komitmen"
                />
                <p className="mt-1 text-xs text-slate-500">NIK / NIP: {formatNip(ppk.nik)}</p>
              </div>
              <div>
                <SearchableOfficialSelect
                  label="Pemegang Dana Operasional"
                  value={pdo}
                  onChange={setPdo}
                  employees={allEmployees}
                  defaultRoleLabel="Pemegang Dana Operasional"
                />
                <p className="mt-1 text-xs text-slate-500">NIK / NIP: {formatNip(pdo.nik)}</p>
              </div>
              <div>
                <SearchableOfficialSelect
                  label="Verifikator Keuangan"
                  value={verifikator}
                  onChange={setVerifikator}
                  employees={allEmployees}
                  defaultRoleLabel="Verifikator Keuangan"
                />
                <p className="mt-1 text-xs text-slate-500">NIK / NIP: {formatNip(verifikator.nik)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SPB */}
      {activeFoluTab === "spb" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Surat Persetujuan Bayar (SPB FOLU)
              </h3>
              <p className="text-[11px] text-slate-500">
                Konfigurasi penomoran SPB, virtual account, PPK, dan pembebanan anggaran FOLU.
              </p>
            </div>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Total SPB: {formatRupiah(total)}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Nomor SPB (No. &amp; Suffix)
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <Input
                  value={spbNumber.no || ""}
                  onChange={(e) => setSpbNumber((prev) => ({ ...prev, no: e.target.value }))}
                  placeholder="No."
                  className="w-16 shrink-0 rounded-xl text-center font-mono text-xs"
                />
                <Input
                  value={spbNumber.suffix || ""}
                  onChange={(e) => setSpbNumber((prev) => ({ ...prev, suffix: e.target.value }))}
                  placeholder="/SPB/K.18/FOLU-NC23/05/2026"
                  className="min-w-0 flex-1 rounded-xl font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Nomor Virtual Account / Rekening
              </label>
              <Input
                value={spbConfig.virtualAccount || ""}
                onChange={(e) => setSpbConfig((prev) => ({ ...prev, virtualAccount: e.target.value }))}
                placeholder="9899410000000115"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Jabatan PPK pada Dokumen SPB
              </label>
              <Input
                value={spbConfig.ppkPosition || ""}
                onChange={(e) => setSpbConfig((prev) => ({ ...prev, ppkPosition: e.target.value }))}
                placeholder="Pejabat Pembuat Komitmen IP BKSDA Kalimantan Timur"
                className="mt-1 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Teks Butir 2 (Instruksi Pembebanan Anggaran)
            </label>
            <Textarea
              value={spbConfig.point2Text || ""}
              onChange={(e) => setSpbConfig((prev) => ({ ...prev, point2Text: e.target.value }))}
              rows={3}
              className="mt-1 rounded-xl text-xs leading-relaxed"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Gunakan placeholder <code className="font-mono text-amber-700 dark:text-amber-300">{"{awpCode}"}</code> untuk otomatis memasukkan kode AWP kegiatan.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: KWITANSI */}
      {activeFoluTab === "kwitansi" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Kwitansi FOLU (Rekening Bank &amp; Pejabat Mengetahui)
              </h3>
              <p className="text-[11px] text-slate-500">
                Atur rekening pembayaran dan pejabat yang berwenang mengetahui per baris penerima.
              </p>
            </div>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {recipients.length} Lembar Kwitansi
            </Badge>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Teks "Sudah Terima Dari" (Header Kwitansi)
            </label>
            <Textarea
              value={kwitansiConfig.sudahTerimaDari || ""}
              onChange={(e) => setKwitansiConfig((prev) => ({ ...prev, sudahTerimaDari: e.target.value }))}
              rows={2}
              className="mt-1 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-4">
            {recipients
              .filter((r) => r.type === "pegawai")
              .map((recipient, index) => (
                <div key={recipient.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 font-bold text-xs text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{recipient.name}</h4>
                        <span className="font-mono text-[10px] text-slate-500">NIP. {formatNip(recipient.nip)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-mono text-xs font-bold dark:bg-emerald-950/40 dark:text-emerald-300">
                      {formatRupiah(recipient.amount)}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Nama Bank</label>
                      <Input
                        value={recipient.bankName || ""}
                        onChange={(e) => updateRecipient(recipient.id, { bankName: e.target.value })}
                        placeholder="Bank Mandiri / BNI / BRI"
                        className="mt-1 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Nomor Rekening</label>
                      <Input
                        value={recipient.accountNo || ""}
                        onChange={(e) => updateRecipient(recipient.id, { accountNo: e.target.value })}
                        placeholder="1480016480838"
                        className="mt-1 rounded-lg font-mono text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Atas Nama Rekening</label>
                      <Input
                        value={recipient.accountHolder || ""}
                        onChange={(e) => updateRecipient(recipient.id, { accountHolder: e.target.value })}
                        placeholder={recipient.name}
                        className="mt-1 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Pejabat yang Mengetahui / Menyetujui (TTD Kiri Bawah Kwitansi)
                    </label>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pejabatMengetahuiList.map((pejabat) => {
                        const isSelected = recipient.mengetahui?.nik === pejabat.nik;
                        return (
                          <button
                            key={pejabat.nik}
                            type="button"
                            onClick={() => updateRecipient(recipient.id, { mengetahui: pejabat })}
                            className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                              isSelected
                                ? "border-amber-400 bg-amber-50/80 shadow-xs dark:border-amber-600 dark:bg-amber-500/10"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-amber-500 bg-amber-500 text-white"
                                  : "border-slate-300"
                              }`}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">{pejabat.name}</p>
                              <p className="text-[10px] text-slate-500">{pejabat.position}</p>
                              <p className="font-mono text-[9px] text-slate-400">NIP. {formatNip(pejabat.nik)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: RINBA */}
      {activeFoluTab === "rinba" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Nomor Lampiran SPD (RINBA)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Nomor dan suffix SPD yang dicetak pada bagian atas lembar Rincian Biaya Riil (RINBA).
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-bold">
                Lampiran SPD: SPD. {spdNumber.no ? spdNumber.no : "     "}{spdNumber.suffix || "/K.18-TU/FOLU.NC-23/08/2026"}
              </Badge>
            </div>

            <div className="max-w-xl">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Nomor &amp; Suffix SPD (Lampiran SPD Nomor)
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 font-mono">SPD.</span>
                <Input
                  value={spdNumber.no || ""}
                  onChange={(e) => setSpdNumber((prev) => ({ ...prev, no: e.target.value }))}
                  placeholder="No."
                  className="w-20 shrink-0 rounded-xl text-center font-mono text-xs font-semibold"
                />
                <Input
                  value={spdNumber.suffix || ""}
                  onChange={(e) => setSpdNumber((prev) => ({ ...prev, suffix: e.target.value }))}
                  placeholder="/K.18-TU/FOLU.NC-23/08/2026"
                  className="min-w-0 flex-1 rounded-xl font-mono text-xs font-semibold"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Format output cetak di atas lembar RINBA: <span className="font-mono text-slate-600 dark:text-slate-300">SPD. {spdNumber.no || "____"}{spdNumber.suffix || "/K.18-TU/FOLU.NC-23/08/2026"}</span>
              </p>
            </div>
          </div>

          {recipients
            .filter((r) => r.type === "pegawai")
            .map((recipient, index) => {
              const rinba = recipient.rinba || buildDefaultRinba(recipient.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
              const operasionalTotal = (rinba.operasionalDays || 8) * (rinba.operasionalDailyRate || 360000);

              return (
                <div key={recipient.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 font-bold text-xs text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {recipient.name}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-500">
                          NIP. {formatNip(recipient.nip)}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 font-mono font-bold dark:bg-amber-950/40 dark:text-amber-300">
                      Total RINBA: {formatRupiah(recipient.amount)}
                    </Badge>
                  </div>

                  {/* 1. Operasional Pengamanan Hutan */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 font-black text-[10px] text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          1
                        </span>
                        Operasional Pengamanan Hutan
                      </h4>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        Subtotal: {formatRupiah(operasionalTotal)}
                      </span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500">Jumlah Hari</label>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={rinba.operasionalDays || ""}
                          onChange={(e) => updateRinbaOperasionalDays(recipient.id, parseInt(e.target.value, 10) || 1)}
                          className="mt-1 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500">Tarif per Hari (Rp)</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatRupiahInput(rinba.operasionalDailyRate || 360000)}
                          onChange={(e) => updateRinbaOperasionalDailyRate(recipient.id, parseRupiahInput(e.target.value))}
                          className="mt-1 rounded-lg text-right font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Transportasi Darat / Sungai */}
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 font-black text-[10px] text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          2
                        </span>
                        Transportasi Darat / Sungai (Riil)
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addRinbaTransportItem(recipient.id)}
                        className="h-7 gap-1 rounded-lg border-amber-300 bg-amber-50/50 text-xs text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
                      >
                        <Plus className="h-3 w-3" /> Tambah Rute
                      </Button>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      {rinba.transportItems.map((item, itemIdx) => (
                        <div key={item.id || itemIdx} className="grid grid-cols-[1fr_140px_auto] items-center gap-2">
                          <Input
                            value={item.label || ""}
                            onChange={(e) => updateRinbaTransportItem(recipient.id, itemIdx, { label: e.target.value })}
                            placeholder="Rute perjalanan..."
                            className="rounded-lg text-xs"
                          />
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatRupiahInput(item.amount)}
                            onChange={(e) => updateRinbaTransportItem(recipient.id, itemIdx, { amount: parseRupiahInput(e.target.value) })}
                            placeholder="Rp 0"
                            className="rounded-lg text-right font-mono text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRinbaTransportItem(recipient.id, itemIdx)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                            aria-label="Hapus item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* TAB 5: SPD */}
      {activeFoluTab === "spd" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Surat Perjalanan Dinas (SPD - Lembar Muka FOLU)
              </h3>
              <p className="text-[11px] text-slate-500">
                Konfigurasi nomor SPD, pembebanan anggaran, dan data personil.
              </p>
            </div>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {recipients.length} Lembar SPD
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Nomor SPD (No. &amp; Suffix)
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <Input
                  value={spdNumber.no || ""}
                  onChange={(e) => setSpdNumber((prev) => ({ ...prev, no: e.target.value }))}
                  placeholder="No."
                  className="w-16 shrink-0 rounded-xl text-center font-mono text-xs"
                />
                <Input
                  value={spdNumber.suffix || ""}
                  onChange={(e) => setSpdNumber((prev) => ({ ...prev, suffix: e.target.value }))}
                  placeholder="/K.18-TU/FOLU.NC-23/04/2026"
                  className="min-w-0 flex-1 rounded-xl font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Pejabat Pembuat Komitmen (Poin 1 SPD)
              </label>
              <Input
                value={spdConfig.ppkPoin1Text || ""}
                onChange={(e) => setSpdConfig((prev) => ({ ...prev, ppkPoin1Text: e.target.value }))}
                placeholder="FOLU RBC NC 2&3 IP BKSDA KALTIM TA 2026"
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Instansi Pembebanan (Poin 9.a SPD)
              </label>
              <Input
                value={spdConfig.instansiPoin9a || ""}
                onChange={(e) => setSpdConfig((prev) => ({ ...prev, instansiPoin9a: e.target.value }))}
                placeholder="Balai KSDA Kalimantan Timur"
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Akun / Kode AWP (Poin 9.b SPD)
              </label>
              <Input
                value={spdConfig.akunPoin9b || ""}
                onChange={(e) => setSpdConfig((prev) => ({ ...prev, akunPoin9b: e.target.value }))}
                placeholder="{awpCode}"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Sumber Dana Pembebanan Anggaran (Poin 9 SPD)
            </label>
            <Textarea
              value={spdConfig.anggaranHeader || ""}
              onChange={(e) => setSpdConfig((prev) => ({ ...prev, anggaranHeader: e.target.value }))}
              placeholder={DEFAULT_SPD_ANGGARAN_HEADER}
              rows={2}
              className="mt-1 rounded-xl text-xs leading-relaxed"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Pangkat / Golongan &amp; Jabatan Personil (Dokumen SPD)
            </span>
            <div className="mt-2 space-y-2">
              {recipients
                .filter((r) => r.type === "pegawai")
                .map((recipient) => (
                  <div key={recipient.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400">Nama:</span>
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{recipient.name}</p>
                      <p className="font-mono text-[10px] text-slate-500">{formatNip(recipient.nip)}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Pangkat / Golongan</label>
                      <Input
                        value={recipient.rank || ""}
                        onChange={(e) => updateRecipient(recipient.id, { rank: e.target.value })}
                        placeholder="Penata Muda (III/a)"
                        className="mt-1 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Jabatan</label>
                      <Input
                        value={recipient.position || ""}
                        onChange={(e) => updateRecipient(recipient.id, { position: e.target.value })}
                        placeholder="Polisi Kehutanan"
                        className="mt-1 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
