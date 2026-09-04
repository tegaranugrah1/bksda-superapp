"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Plus,
  ReceiptText,
  Sparkles,
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
  DipaConfig,
  Official,
  RecipientRow,
  TransportItem,
  buildDefaultDipa,
  buildDefaultSptjbUraian,
  calculateDays,
  calculateDipaTotal,
  formatNip,
  formatRupiahInput,
  parseRupiahInput,
} from "@/app/keuangan/_components/templates/shared";
import { SearchableOfficialSelect } from "./SearchableOfficialSelect";

export interface Step1DipaTabsProps {
  recipients: RecipientRow[];
  setRecipients: React.Dispatch<React.SetStateAction<RecipientRow[]>>;
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  activeDipaTab: "nominatif" | "sptb" | "rinba" | "spby" | "spd";
  setActiveDipaTab: (t: "nominatif" | "sptb" | "rinba" | "spby" | "spd") => void;
  ppk: Official;
  setPpk: (o: Official) => void;
  pdo: Official;
  setPdo: (o: Official) => void;
  verifikator: Official;
  setVerifikator: (o: Official) => void;
  allEmployees: FinanceEmployee[];
  dipaConfig: DipaConfig;
  setDipaConfig: React.Dispatch<React.SetStateAction<DipaConfig>>;
  defaultEvidenceSuffix: string;
  setDefaultEvidenceSuffix: (v: string) => void;
  spbNumber: { no: string; suffix: string };
  setSpbNumber: React.Dispatch<React.SetStateAction<{ no: string; suffix: string }>>;
  spdNumber: { no: string; suffix: string };
  setSpdNumber: React.Dispatch<React.SetStateAction<{ no: string; suffix: string }>>;
  activity: { awpCode: string; name: string };
  spjName: string;
}

export function Step1DipaTabs({
  recipients,
  setRecipients,
  travel,
  activeDipaTab,
  setActiveDipaTab,
  ppk,
  setPpk,
  pdo,
  setPdo,
  verifikator,
  setVerifikator,
  allEmployees,
  dipaConfig,
  setDipaConfig,
  defaultEvidenceSuffix,
  setDefaultEvidenceSuffix,
  spbNumber,
  setSpbNumber,
  spdNumber,
  setSpdNumber,
  activity,
  spjName,
}: Step1DipaTabsProps) {
  // Local states for batch applicator
  const [batchUangHarianRate, setBatchUangHarianRate] = useState(360000);
  const [batchUangHarianDays, setBatchUangHarianDays] = useState(3);
  const [batchTransportUdara, setBatchTransportUdara] = useState(0);
  const [batchTaksiPp, setBatchTaksiPp] = useState(0);

  const dipaTotals = useMemo(() => {
    let transportUdara = 0;
    let taksiPp = 0;
    let uangHarian = 0;
    let penginapan = 0;
    let extraItems = 0;
    let grandTotal = 0;

    recipients.forEach((r) => {
      const days = r.dipa?.uangHarianDays ?? calculateDays(travel.startDate, travel.endDate);
      const dailyRate = r.dipa?.uangHarianRate ?? 360000;
      const uh = days * dailyRate;
      const tu = r.dipa?.transportUdara || 0;
      const tp = r.dipa?.taksiPp || 0;
      const nights = r.dipa?.penginapanNights || 0;
      const nRate = r.dipa?.penginapanRate || 0;
      const hotel = nights * nRate;
      const ex = (r.dipa?.extraItems || []).reduce((sum, it) => sum + (it.amount || 0), 0);

      transportUdara += tu;
      taksiPp += tp;
      uangHarian += uh;
      penginapan += hotel;
      extraItems += ex;
      grandTotal += (uh + tu + tp + hotel + ex);
    });

    return {
      transportUdara,
      taksiPp,
      transportTotal: transportUdara + taksiPp,
      uangHarian,
      penginapan,
      extraItems,
      grandTotal,
    };
  }, [recipients, travel.startDate, travel.endDate]);

  const updateRecipient = (id: string, patch: Partial<RecipientRow>) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const updateDipaField = (recipientId: string, patch: Partial<RecipientRow["dipa"]>) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const updatedDipa = { ...currentDipa, ...patch };
        const newTotal = calculateDipaTotal(updatedDipa);
        return {
          ...r,
          dipa: updatedDipa,
          amount: newTotal,
        };
      })
    );
  };

  const addDipaExtraItem = (recipientId: string) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const items = currentDipa.extraItems || [];
        const newItem: TransportItem = {
          id: `extra-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          label: "Biaya Riil Tambahan",
          amount: 0,
        };
        const updatedDipa = { ...currentDipa, extraItems: [...items, newItem] };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
  };

  const removeDipaExtraItem = (recipientId: string, itemIdx: number) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const items = [...(currentDipa.extraItems || [])];
        items.splice(itemIdx, 1);
        const updatedDipa = { ...currentDipa, extraItems: items };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
  };

  const removeRecipient = (id: string) => {
    if (recipients.length <= 1) {
      toast.error("Minimal harus ada 1 personil pelaksana.");
      return;
    }
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    toast.success("Personil berhasil dihapus dari daftar.");
  };

  const applyBatchUangHarianRate = () => {
    setRecipients((prev) =>
      prev.map((r) => {
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const updatedDipa = { ...currentDipa, uangHarianRate: batchUangHarianRate };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
    toast.success(`Tarif uang harian ${formatRupiah(batchUangHarianRate)} diterapkan ke semua personil!`);
  };

  const applyBatchUangHarianDays = () => {
    setRecipients((prev) =>
      prev.map((r) => {
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const updatedDipa = { ...currentDipa, uangHarianDays: batchUangHarianDays };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
    toast.success(`Jumlah ${batchUangHarianDays} hari diterapkan ke semua personil!`);
  };

  const applyBatchTransportUdara = () => {
    setRecipients((prev) =>
      prev.map((r) => {
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const updatedDipa = { ...currentDipa, transportUdara: batchTransportUdara };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
    toast.success(`Biaya tiket pesawat ${formatRupiah(batchTransportUdara)} diterapkan ke semua personil!`);
  };

  const applyBatchTaksiPp = () => {
    setRecipients((prev) =>
      prev.map((r) => {
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const updatedDipa = { ...currentDipa, taksiPp: batchTaksiPp };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
    toast.success(`Biaya taksi PP ${formatRupiah(batchTaksiPp)} diterapkan ke semua personil!`);
  };

  return (
    <div className="space-y-6 mt-6">
      {/* EXCEL-STYLE 5-TAB NAVIGATION FOR DIPA */}
      <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-2 dark:border-slate-800 dark:bg-slate-900/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 mb-1.5 border-b border-slate-200/80 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              5 Form Dokumen DIPA (Sheet Tab)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Total Biaya DIPA:</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              {formatRupiah(dipaTotals.grandTotal)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { key: "nominatif" as const, label: "1. Nominatif PD", desc: "Wajib diisi n ttd", icon: Table2, badge: `${recipients.length} Orang` },
            { key: "sptb" as const, label: "2. SPTB", desc: "SP DIPA & Uraian", icon: FileCheck2, badge: "SPTJB" },
            { key: "rinba" as const, label: "3. Rinba", desc: "Biaya Riil & Bukti", icon: ReceiptText, badge: "Kuitansi" },
            { key: "spby" as const, label: "4. SPBy", desc: "Perintah Bayar", icon: CreditCard, badge: dipaConfig.kodeMak || "051.F.077" },
            { key: "spd" as const, label: "5. SPD", desc: "No. SPD & Angkutan", icon: FileText, badge: "Lembar Muka" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDipaTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDipaTab(tab.key)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                  isActive
                    ? "border-emerald-500 bg-white text-emerald-950 shadow-md ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-slate-800 dark:text-emerald-100"
                    : "border-transparent bg-slate-200/50 text-slate-600 hover:border-slate-300 hover:bg-white dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                    <span>{tab.label}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 font-semibold ${
                      isActive
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
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

      {/* TAB 1: NOMINATIF PD */}
      {activeDipaTab === "nominatif" && (
        <div className="space-y-6">
          {/* Batch Quick Applicator Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Terapkan Tarif Seragam ke Semua Pelaksana
              </h4>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
                <label className="text-[10px] font-bold uppercase text-slate-500">Tarif Uang Harian (Rp)</label>
                <div className="mt-1 flex items-center gap-1.5">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatRupiahInput(batchUangHarianRate)}
                    onChange={(e) => setBatchUangHarianRate(parseRupiahInput(e.target.value))}
                    className="rounded-lg text-right font-mono text-xs bg-white dark:bg-slate-900"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={applyBatchUangHarianRate}
                    className="text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 shrink-0"
                  >
                    Terapkan
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
                <label className="text-[10px] font-bold uppercase text-slate-500">Jumlah Hari Pelaksanaan</label>
                <div className="mt-1 flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={batchUangHarianDays}
                    onChange={(e) => setBatchUangHarianDays(parseInt(e.target.value, 10) || 1)}
                    className="rounded-lg text-center font-mono text-xs bg-white dark:bg-slate-900"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={applyBatchUangHarianDays}
                    className="text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 shrink-0"
                  >
                    Terapkan
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
                <label className="text-[10px] font-bold uppercase text-slate-500">Transport Udara PP (Rp)</label>
                <div className="mt-1 flex items-center gap-1.5">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatRupiahInput(batchTransportUdara)}
                    onChange={(e) => setBatchTransportUdara(parseRupiahInput(e.target.value))}
                    placeholder="0"
                    className="rounded-lg text-right font-mono text-xs bg-white dark:bg-slate-900"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={applyBatchTransportUdara}
                    className="text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 shrink-0"
                  >
                    Terapkan
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
                <label className="text-[10px] font-bold uppercase text-slate-500">Taksi Bandara PP (Rp)</label>
                <div className="mt-1 flex items-center gap-1.5">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatRupiahInput(batchTaksiPp)}
                    onChange={(e) => setBatchTaksiPp(parseRupiahInput(e.target.value))}
                    placeholder="0"
                    className="rounded-lg text-right font-mono text-xs bg-white dark:bg-slate-900"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={applyBatchTaksiPp}
                    className="text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 shrink-0"
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Table of Personnel & Costs */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Daftar Pelaksana &amp; Rincian Biaya Nominatif
                </h3>
                <p className="text-[11px] text-slate-500">
                  Edit langsung rincian biaya per personil di tabel bawah ini.
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                {recipients.length} Pelaksana
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3 min-w-44">Nama &amp; NIP</th>
                    <th className="py-3 px-3 min-w-36 text-right">Transport Udara</th>
                    <th className="py-3 px-3 min-w-36 text-right">Taksi Bandara PP</th>
                    <th className="py-3 px-3 min-w-44 text-center">Uang Harian</th>
                    <th className="py-3 px-3 min-w-44 text-center">Penginapan</th>
                    <th className="py-3 px-3 min-w-36 text-right">Total Biaya</th>
                    <th className="py-3 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {recipients.map((recipient, index) => {
                    const dipa = recipient.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
                    const uhSubtotal = (dipa.uangHarianDays || 1) * (dipa.uangHarianRate || 0);
                    const hotelSubtotal = (dipa.penginapanNights || 0) * (dipa.penginapanRate || 0);
                    const rowTotal = recipient.amount || calculateDipaTotal(dipa);

                    return (
                      <tr key={recipient.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {recipient.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {formatNip(recipient.nip)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {recipient.position || "Pelaksana"}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatRupiahInput(dipa.transportUdara || 0)}
                            onChange={(e) => updateDipaField(recipient.id, { transportUdara: parseRupiahInput(e.target.value) })}
                            placeholder="0"
                            className="rounded-lg text-right font-mono text-xs h-8"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatRupiahInput(dipa.taksiPp || 0)}
                            onChange={(e) => updateDipaField(recipient.id, { taksiPp: parseRupiahInput(e.target.value) })}
                            placeholder="0"
                            className="rounded-lg text-right font-mono text-xs h-8"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min="1"
                              max="60"
                              value={dipa.uangHarianDays ?? 3}
                              onChange={(e) => updateDipaField(recipient.id, { uangHarianDays: parseInt(e.target.value, 10) || 1 })}
                              className="w-12 text-center rounded-lg text-xs h-8 font-mono"
                              title="Jumlah Hari"
                            />
                            <span className="text-slate-400 text-[10px]">x</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatRupiahInput(dipa.uangHarianRate ?? 360000)}
                              onChange={(e) => updateDipaField(recipient.id, { uangHarianRate: parseRupiahInput(e.target.value) })}
                              className="w-24 text-right rounded-lg font-mono text-xs h-8"
                              title="Tarif per Hari"
                            />
                          </div>
                          <div className="mt-1 text-right text-[10px] text-slate-500 font-mono">
                            = {formatRupiah(uhSubtotal)}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min="0"
                              max="60"
                              value={dipa.penginapanNights ?? 0}
                              onChange={(e) => updateDipaField(recipient.id, { penginapanNights: parseInt(e.target.value, 10) || 0 })}
                              className="w-12 text-center rounded-lg text-xs h-8 font-mono"
                              title="Jumlah Malam"
                            />
                            <span className="text-slate-400 text-[10px]">x</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatRupiahInput(dipa.penginapanRate ?? 0)}
                              onChange={(e) => updateDipaField(recipient.id, { penginapanRate: parseRupiahInput(e.target.value) })}
                              placeholder="0"
                              className="w-24 text-right rounded-lg font-mono text-xs h-8"
                              title="Tarif per Malam"
                            />
                          </div>
                          <div className="mt-1 text-right text-[10px] text-slate-500 font-mono">
                            = {formatRupiah(hotelSubtotal)}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatRupiah(rowTotal)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                            onClick={() => removeRecipient(recipient.id)}
                            aria-label="Hapus personil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4 Summary Cards */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total Transport (077)</span>
                  <p className="mt-1 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {formatRupiah(dipaTotals.transportTotal)}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Udara: {formatRupiah(dipaTotals.transportUdara)} | Taksi: {formatRupiah(dipaTotals.taksiPp)}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total Uang Harian</span>
                  <p className="mt-1 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {formatRupiah(dipaTotals.uangHarian)}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {recipients.length} personil
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total Penginapan</span>
                  <p className="mt-1 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {formatRupiah(dipaTotals.penginapan)}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Hotel / Penginapan riil
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Grand Total Biaya SPJ</span>
                  <p className="mt-1 font-mono font-black text-base text-emerald-800 dark:text-emerald-200">
                    {formatRupiah(dipaTotals.grandTotal)}
                  </p>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    Tersinkron ke SPTB, Rinba, SPBy
                  </span>
                </div>
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
                  label="Bendahara Pengeluaran"
                  value={pdo}
                  onChange={setPdo}
                  employees={allEmployees}
                  defaultRoleLabel="Bendahara Pengeluaran"
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

      {/* TAB 2: SPTB (SPTJB) */}
      {activeDipaTab === "sptb" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Surat Pernyataan Tanggung Jawab Belanja (SPTJB / SPTB)
              </h3>
              <p className="text-[11px] text-slate-500">
                Konfigurasi nomor SP DIPA, pembebanan MAK, dan uraian pertanggungjawaban belanja perjalanan.
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              Total SPTJB: {formatRupiah(dipaTotals.grandTotal)}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                1. Kode Satuan Kerja
              </label>
              <Input
                value={dipaConfig.kodeSatker || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, kodeSatker: e.target.value }))}
                placeholder="143.04.16.693614"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-3">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                2. Nama Satuan Kerja
              </label>
              <Input
                value={dipaConfig.namaSatker || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, namaSatker: e.target.value }))}
                placeholder="Balai Konservasi Sumber Daya Alam Kalimantan Timur"
                className="mt-1 rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                3. Tanggal dan Nomor DIPA
              </label>
              <Input
                value={dipaConfig.noSpDipa || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, noSpDipa: e.target.value }))}
                placeholder="No. SP DIPA- 143.04.2.693614/2025 Tanggal 23 Desember 2025"
                className="mt-1 rounded-xl text-xs font-mono font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                4. Klasifikasi Anggaran (MAK)
              </label>
              <Input
                value={dipaConfig.klasifikasiMak || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, klasifikasiMak: e.target.value }))}
                placeholder="7271.REA.001.524111"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Subkomponen / Item MAK
              </label>
              <Input
                value={dipaConfig.kodeMak || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, kodeMak: e.target.value }))}
                placeholder="051.F.077"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Tempat &amp; Tanggal SPTJB
              </label>
              <Input
                value={dipaConfig.cityDateText || "Samarinda,"}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, cityDateText: e.target.value }))}
                placeholder="Samarinda,"
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Uraian Belanja SPTJB DIPA
              </label>
              <button
                type="button"
                onClick={() => {
                  const generated = buildDefaultSptjbUraian(
                    travel,
                    recipients.length || 1,
                    activity.name || spjName
                  );
                  setDipaConfig((prev) => ({ ...prev, uraianSptjb: generated }));
                  toast.success("Uraian SPTJB direset ke template otomatis!");
                }}
                className="text-[10px] text-emerald-600 hover:underline font-semibold"
              >
                Reset ke Template Otomatis
              </button>
            </div>
            <Textarea
              value={
                dipaConfig.uraianSptjb ||
                buildDefaultSptjbUraian(
                  travel,
                  recipients.length || 1,
                  activity.name || spjName
                )
              }
              onChange={(e) => setDipaConfig((prev) => ({ ...prev, uraianSptjb: e.target.value }))}
              rows={4}
              className="rounded-xl text-xs leading-relaxed"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Format baku Ditjen KSDAE: Belanja Perjalanan Dinas Biasa, Perjalanan Dinas dari [Asal] ke [Tujuan] sebanyak [X] ([terbilang]) orang tugas (OT) dalam rangka [Maksud] selama [Y] ([terbilang]) hari terhitung mulai tanggal [Tgl Mulai] sampai dengan [Tgl Selesai].
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[10px] font-bold uppercase text-slate-500">Pejabat Penandatangan SPTJB</span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <span className="text-[10px] text-slate-400">Pejabat Pembuat Komitmen:</span>
                <p className="font-bold text-slate-900 dark:text-slate-100">{ppk.name || "RUSMANTO, S.Hut"}</p>
                <p className="font-mono text-[10px] text-slate-500">NIP. {formatNip(ppk.nik)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <span className="text-[10px] text-slate-400">Bendahara Pengeluaran:</span>
                <p className="font-bold text-slate-900 dark:text-slate-100">{dipaConfig.bendahara?.name || pdo.name || "SOERENDENG, SE"}</p>
                <p className="font-mono text-[10px] text-slate-500">NIP. {formatNip(dipaConfig.bendahara?.nik || pdo.nik)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RINBA */}
      {activeDipaTab === "rinba" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Default Format Suffix Penomoran Bukti / Kuitansi Rinba
              </h4>
              <button
                type="button"
                onClick={() => {
                  setRecipients((prev) =>
                    prev.map((r) => ({ ...r, evidenceSuffix: defaultEvidenceSuffix }))
                  );
                  toast.success("Suffix diterapkan ke semua personil!");
                }}
                className="text-[10px] text-emerald-600 hover:underline font-semibold"
              >
                Terapkan Suffix ke Semua
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
                placeholder="/I/2026"
                className="rounded-xl font-mono text-xs font-semibold"
              />
            </div>
          </div>

          <div className="space-y-4">
            {recipients.map((recipient, index) => {
              const dipa = recipient.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
              const uhSubtotal = (dipa.uangHarianDays || 1) * (dipa.uangHarianRate || 0);
              const transportSubtotal = (dipa.transportUdara || 0) + (dipa.taksiPp || 0);
              const hotelSubtotal = (dipa.penginapanNights || 0) * (dipa.penginapanRate || 0);
              const extraTotal = (dipa.extraItems || []).reduce((sum, it) => sum + (it.amount || 0), 0);
              const totalPersonil = uhSubtotal + transportSubtotal + hotelSubtotal + extraTotal;

              return (
                <div key={recipient.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 font-black text-xs text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Total Kuitansi:</span>
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-mono font-bold dark:bg-emerald-950/40 dark:text-emerald-300">
                        {formatRupiah(totalPersonil)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Nomor Bukti Kuitansi</label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Input
                          value={recipient.evidenceNo || ""}
                          onChange={(e) => updateRecipient(recipient.id, { evidenceNo: e.target.value })}
                          placeholder="001"
                          className="w-16 text-center font-mono text-xs rounded-xl"
                        />
                        <Input
                          value={recipient.evidenceSuffix || defaultEvidenceSuffix}
                          onChange={(e) => updateRecipient(recipient.id, { evidenceSuffix: e.target.value })}
                          className="min-w-0 flex-1 font-mono text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                      <div className="space-y-0.5 text-[11px]">
                        <div>Transport: <span className="font-mono font-semibold">{formatRupiah(transportSubtotal)}</span></div>
                        <div>Uang Harian: <span className="font-mono font-semibold">{formatRupiah(uhSubtotal)}</span></div>
                        <div>Penginapan: <span className="font-mono font-semibold">{formatRupiah(hotelSubtotal)}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        Pengeluaran Riil Tambahan (Daftar Biaya Riil)
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDipaExtraItem(recipient.id)}
                        className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 gap-1 rounded-lg"
                      >
                        <Plus className="h-3 w-3" /> Tambah Biaya Riil
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {(dipa.extraItems || []).map((item, itemIdx) => (
                        <div key={item.id || itemIdx} className="grid grid-cols-[1fr_140px_auto] items-center gap-2">
                          <Input
                            value={item.label || ""}
                            onChange={(e) => {
                              const next = [...(dipa.extraItems || [])];
                              next[itemIdx] = { ...next[itemIdx], label: e.target.value };
                              updateDipaField(recipient.id, { extraItems: next });
                            }}
                            placeholder="Keterangan pengeluaran riil..."
                            className="rounded-xl text-xs"
                          />
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatRupiahInput(item.amount)}
                            onChange={(e) => {
                              const next = [...(dipa.extraItems || [])];
                              next[itemIdx] = { ...next[itemIdx], amount: parseRupiahInput(e.target.value) };
                              updateDipaField(recipient.id, { extraItems: next });
                            }}
                            placeholder="Rp 0"
                            className="rounded-xl text-right font-mono text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDipaExtraItem(recipient.id, itemIdx)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {(!dipa.extraItems || dipa.extraItems.length === 0) && (
                        <p className="text-[11px] italic text-slate-400">Tidak ada pengeluaran riil tambahan.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SPBy */}
      {activeDipaTab === "spby" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Surat Perintah Bayar (SPBy)
              </h3>
              <p className="text-[11px] text-slate-500">
                Perintah pembayaran kepada Bendahara Pengeluaran untuk pelaksanaan belanja DIPA.
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-mono font-bold dark:bg-emerald-950/40 dark:text-emerald-300">
              Jumlah: {formatRupiah(dipaTotals.grandTotal)}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Nomor SPBy (No. &amp; Suffix)
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
                  placeholder="/K.18-TU/KEU/01/2026"
                  className="min-w-0 flex-1 rounded-xl font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Kode Satker
              </label>
              <Input
                value={dipaConfig.kodeSatker || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, kodeSatker: e.target.value }))}
                placeholder="143.04.16.693614"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Nama Satuan Kerja
              </label>
              <Input
                value={dipaConfig.namaSatker || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, namaSatker: e.target.value }))}
                placeholder="Balai Konservasi Sumber Daya Alam Kalimantan Timur"
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Klasifikasi Anggaran / MAK
              </label>
              <Input
                value={dipaConfig.klasifikasiMak || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, klasifikasiMak: e.target.value }))}
                placeholder="7271.REA.001.524111"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Kode MAK
              </label>
              <Input
                value={dipaConfig.kodeMak || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, kodeMak: e.target.value }))}
                placeholder="051.F.077"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Akun Pembebanan
              </label>
              <Input
                value={dipaConfig.akun || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, akun: e.target.value }))}
                placeholder="524111"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Kepada (Penerima Pembayaran)
              </label>
              <Input
                value={
                  dipaConfig.spbyKepada ||
                  (recipients.length > 0
                    ? `${recipients[0]?.name}${recipients.length > 1 ? ", Dkk" : ""}`
                    : "Pelaksana Perjalanan Dinas")
                }
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyKepada: e.target.value }))}
                placeholder="Nama Pegawai, Dkk"
                className="mt-1 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Untuk Pembayaran
              </label>
              <Textarea
                value={
                  dipaConfig.spbyUraian ||
                  `Pembayaran Biaya Perjalanan Dinas dalam rangka ${activity.name || spjName} dari ${travel.origin} ke ${travel.destination} selama ${calculateDays(travel.startDate, travel.endDate)} hari.`
                }
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyUraian: e.target.value }))}
                rows={3}
                className="mt-1 rounded-xl text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SPD */}
      {activeDipaTab === "spd" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Surat Perjalanan Dinas (SPD - Lembar Muka)
              </h3>
              <p className="text-[11px] text-slate-500">
                Konfigurasi nomor SPD, alat angkutan, tanggal SPD, dan pembebanan anggaran.
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
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
                  placeholder="/K.18-TU/KEU/01/2026"
                  className="min-w-0 flex-1 rounded-xl font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Alat Angkutan yang dipergunakan (Poin 5 SPD)
              </label>
              <Input
                value={dipaConfig.transportMode || "Kendaraan Dinas"}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, transportMode: e.target.value }))}
                placeholder="Kendaraan Dinas / Pesawat Terbang"
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Tanggal SPD Dikeluarkan
              </label>
              <Input
                type="date"
                value={dipaConfig.spdDate || travel.startDate || ""}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, spdDate: e.target.value }))}
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Tempat Dikeluarkan (Poin TTD SPD)
              </label>
              <Input
                value={dipaConfig.cityDateText || "Samarinda"}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, cityDateText: e.target.value }))}
                placeholder="Samarinda"
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Instansi Pembebanan Anggaran (Poin 9.a SPD)
              </label>
              <Input
                value={dipaConfig.namaSatker || "Balai KSDA Kalimantan Timur"}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, namaSatker: e.target.value }))}
                placeholder="Balai KSDA Kalimantan Timur"
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Mata Anggaran / Akun (Poin 9.b SPD)
              </label>
              <Input
                value={dipaConfig.akun || "524111"}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, akun: e.target.value }))}
                placeholder="524111"
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Pangkat / Golongan &amp; Jabatan Personil (Poin 2, 3, 4 SPD)
            </span>
            <div className="mt-2 space-y-2">
              {recipients.map((recipient) => (
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
