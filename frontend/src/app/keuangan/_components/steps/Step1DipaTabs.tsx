"use client";

import React, { useState, useMemo } from "react";
import {
  Car,
  ChevronDown,
  ChevronUp,
  Copy,
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Hotel,
  Plane,
  Plus,
  ReceiptText,
  Sparkles,
  Table2,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FinanceEmployee, formatRupiah } from "@/app/keuangan/_components/finance-data";
import {
  DipaConfig,
  DipaTransportItem,
  Official,
  RecipientRow,
  TransportItem,
  buildDefaultDipa,
  buildDefaultSptjbUraian,
  calculateDays,
  calculateDipaTotal,
  computeDipaMak,
  DEFAULT_DIPA_KLASIFIKASI_MAK,
  DEFAULT_DIPA_KODE_MAK,
  formatNip,
  formatRupiahInput,
  parseRupiahInput,
  getDipaTransportBreakdown,
  SBM_HOTEL_PRESETS,
  isGolongan4,
  getSbmStandardRate,
  toIsoDateString,
  formatIndoDateOptional,
  getRomanMonth,
  formatMaksudSpd,
} from "@/app/keuangan/_components/templates/shared";
import { SearchableOfficialSelect } from "./SearchableOfficialSelect";

export interface Step1DipaTabsProps {
  recipients: RecipientRow[];
  setRecipients: React.Dispatch<React.SetStateAction<RecipientRow[]>>;
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  activeDipaTab: "nominatif" | "sptb" | "rinba" | "dpril" | "spby" | "spd";
  setActiveDipaTab: (t: "nominatif" | "sptb" | "rinba" | "dpril" | "spby" | "spd") => void;
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
  const [expandedTransportRecipientId, setExpandedTransportRecipientId] = useState<string | null>(null);

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
      const breakdown = getDipaTransportBreakdown(r.dipa);
      const tu = breakdown.udara;
      const tp = breakdown.darat;
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

  const autoMak = useMemo(() => computeDipaMak(recipients, travel), [recipients, travel]);
  const effectiveKodeMak = dipaConfig.kodeMak?.trim() ? dipaConfig.kodeMak : autoMak.kodeMak;

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

  const addDipaTransportItem = (
    recipientId: string,
    category: "udara" | "darat" = "darat",
    label = "",
    amount = 0
  ) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const currentBreakdown = getDipaTransportBreakdown(currentDipa);
        const existingItems = [...currentBreakdown.items];
        const newItem: DipaTransportItem = {
          id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          category,
          label: label || (category === "udara" ? "Tiket Pesawat PP" : "Transportasi Darat / Laut PP"),
          amount,
        };
        const updatedItems = [...existingItems, newItem];
        const updatedBreakdown = getDipaTransportBreakdown({
          ...currentDipa,
          transportItems: updatedItems,
          transportUdara: 0,
          taksiPp: 0,
        });
        const updatedDipa = {
          ...currentDipa,
          transportItems: updatedItems,
          transportUdara: updatedBreakdown.udara,
          taksiPp: updatedBreakdown.darat,
        };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
  };

  const updateDipaTransportItem = (
    recipientId: string,
    itemIdx: number,
    patch: Partial<DipaTransportItem>
  ) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const currentBreakdown = getDipaTransportBreakdown(currentDipa);
        const items = [...currentBreakdown.items];
        if (!items[itemIdx]) return r;
        items[itemIdx] = { ...items[itemIdx], ...patch };
        const updatedBreakdown = getDipaTransportBreakdown({
          ...currentDipa,
          transportItems: items,
          transportUdara: 0,
          taksiPp: 0,
        });
        const updatedDipa = {
          ...currentDipa,
          transportItems: items,
          transportUdara: updatedBreakdown.udara,
          taksiPp: updatedBreakdown.darat,
        };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
  };

  const removeDipaTransportItem = (recipientId: string, itemIdx: number) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== recipientId) return r;
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const currentBreakdown = getDipaTransportBreakdown(currentDipa);
        const items = [...currentBreakdown.items];
        items.splice(itemIdx, 1);
        const updatedBreakdown = getDipaTransportBreakdown({
          ...currentDipa,
          transportItems: items,
          transportUdara: 0,
          taksiPp: 0,
        });
        const updatedDipa = {
          ...currentDipa,
          transportItems: items,
          transportUdara: updatedBreakdown.udara,
          taksiPp: updatedBreakdown.darat,
        };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
  };

  const copyTransportItemsToAll = (sourceRecipientId: string) => {
    const source = recipients.find((r) => r.id === sourceRecipientId);
    if (!source) return;
    const sourceDipa = source.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
    const sourceBreakdown = getDipaTransportBreakdown(sourceDipa);
    const templateItems = sourceBreakdown.items.map((it) => ({
      ...it,
      id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    }));

    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id === sourceRecipientId) return r;
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const clonedItems = templateItems.map((it) => ({
          ...it,
          id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        }));
        const updatedBreakdown = getDipaTransportBreakdown({
          ...currentDipa,
          transportItems: clonedItems,
          transportUdara: 0,
          taksiPp: 0,
        });
        const updatedDipa = {
          ...currentDipa,
          transportItems: clonedItems,
          transportUdara: updatedBreakdown.udara,
          taksiPp: updatedBreakdown.darat,
        };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
    toast.success(`Rincian transportasi (${templateItems.length} item) disalin ke semua personil lain!`);
  };

  const copyPenginapanToAll = (sourceRecipientId: string) => {
    const source = recipients.find((r) => r.id === sourceRecipientId);
    if (!source) return;
    const sourceDipa = source.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
    const nights = sourceDipa.penginapanNights ?? Math.max(1, calculateDays(travel.startDate, travel.endDate) - 1);
    const isDpRil = sourceDipa.dpRilEnabled !== false && (sourceDipa.penginapanRate || 0) > 0;
    const province = sourceDipa.dpRilProvince || travel.destination || "Provinsi Kalimantan Timur";

    let detectedPresetKey: string | null = null;
    if (sourceDipa.dpRilHotelStandardRate) {
      for (const pr of SBM_HOTEL_PRESETS) {
        if (getSbmStandardRate(pr.key, source.rank) === sourceDipa.dpRilHotelStandardRate) {
          detectedPresetKey = pr.key;
          break;
        }
      }
    }

    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id === sourceRecipientId) return r;
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        let updatedRate = sourceDipa.penginapanRate || 0;
        let stdRate = sourceDipa.dpRilHotelStandardRate;

        if (isDpRil) {
          if (detectedPresetKey) {
            stdRate = getSbmStandardRate(detectedPresetKey, r.rank);
            updatedRate = Math.round(0.3 * stdRate);
          } else if (stdRate) {
            updatedRate = Math.round(0.3 * stdRate);
          }
        }

        const updatedDipa = {
          ...currentDipa,
          dpRilEnabled: sourceDipa.dpRilEnabled !== false,
          dpRilHotelStandardRate: stdRate,
          penginapanRate: updatedRate,
          penginapanNights: nights,
          dpRilProvince: province,
        };

        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
    toast.success("Pengaturan penginapan disalin ke semua personil!");
  };

  const applyBatchSbmHotel = (presetKey: string) => {
    const preset = SBM_HOTEL_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;
    const defaultNights = Math.max(1, calculateDays(travel.startDate, travel.endDate) - 1);
    setRecipients((prev) =>
      prev.map((r) => {
        const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
        const standard = getSbmStandardRate(preset.key, r.rank);
        const rate30 = Math.round(0.3 * standard);
        const updatedDipa = {
          ...currentDipa,
          dpRilEnabled: true,
          dpRilHotelStandardRate: standard,
          penginapanRate: rate30,
          penginapanNights: currentDipa.penginapanNights || defaultNights,
          dpRilProvince: preset.provinceName,
        };
        return {
          ...r,
          dipa: updatedDipa,
          amount: calculateDipaTotal(updatedDipa),
        };
      })
    );
    toast.success(`Tarif SBM ${preset.label} (30%) diterapkan ke semua personil sesuai golongan!`);
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
        const currentBreakdown = getDipaTransportBreakdown(currentDipa);
        const nonUdaraItems = currentBreakdown.items.filter((it) => it.category !== "udara");
        const newUdaraItem: DipaTransportItem = {
          id: `trans-udara-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          category: "udara",
          label: "Tiket Pesawat PP",
          amount: batchTransportUdara,
        };
        const updatedItems = batchTransportUdara > 0 ? [...nonUdaraItems, newUdaraItem] : nonUdaraItems;
        const updatedBreakdown = getDipaTransportBreakdown({
          ...currentDipa,
          transportItems: updatedItems,
          transportUdara: 0,
          taksiPp: 0,
        });
        const updatedDipa = {
          ...currentDipa,
          transportItems: updatedItems,
          transportUdara: updatedBreakdown.udara,
          taksiPp: updatedBreakdown.darat,
        };
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
        const currentBreakdown = getDipaTransportBreakdown(currentDipa);
        const nonDaratItems = currentBreakdown.items.filter((it) => it.category !== "darat");
        const newDaratItem: DipaTransportItem = {
          id: `trans-darat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          category: "darat",
          label: "Taksi Bandara / Stasiun PP",
          amount: batchTaksiPp,
        };
        const updatedItems = batchTaksiPp > 0 ? [...nonDaratItems, newDaratItem] : nonDaratItems;
        const updatedBreakdown = getDipaTransportBreakdown({
          ...currentDipa,
          transportItems: updatedItems,
          transportUdara: 0,
          taksiPp: 0,
        });
        const updatedDipa = {
          ...currentDipa,
          transportItems: updatedItems,
          transportUdara: updatedBreakdown.udara,
          taksiPp: updatedBreakdown.darat,
        };
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { key: "nominatif" as const, label: "1. Nominatif PD", desc: "Wajib diisi n ttd", icon: Table2, badge: `${recipients.length} Orang` },
            { key: "sptb" as const, label: "2. SPTB", desc: "SP DIPA & Uraian", icon: FileCheck2, badge: "SPTJB" },
            { key: "rinba" as const, label: "3. Rinba", desc: "Biaya Riil & Bukti", icon: ReceiptText, badge: "Kuitansi" },
            { key: "dpril" as const, label: "4. DP Ril", desc: "Penginapan 30% / Riil", icon: ReceiptText, badge: "Pernyataan" },
            { key: "spby" as const, label: "5. SPBy", desc: "Perintah Bayar", icon: CreditCard, badge: effectiveKodeMak },
            { key: "spd" as const, label: "6. SPD", desc: "No. SPD & Angkutan", icon: FileText, badge: "Lembar Muka" },
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

          {/* Form Header Dokumen: Nomor SPD & Tanggal TTD Nominatif */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Nomor SPD */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nomor SPD:
                </span>
                <Input
                  value={
                    dipaConfig.nominatifSpd !== undefined
                      ? dipaConfig.nominatifSpd
                      : (dipaConfig.nominatifSpdNo || dipaConfig.nominatifSpdSuffix
                          ? `${dipaConfig.nominatifSpdNo ? `${dipaConfig.nominatifSpdNo} ` : ""}${dipaConfig.nominatifSpdSuffix || ""}`.trim()
                          : "")
                  }
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, nominatifSpd: e.target.value }))}
                  placeholder="Kosong (manual pulpen) atau nomor SPD"
                  className="h-8 w-64 sm:w-80 rounded-lg font-mono text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
                {Boolean(
                  dipaConfig.nominatifSpd !== undefined
                    ? dipaConfig.nominatifSpd
                    : (dipaConfig.nominatifSpdNo || dipaConfig.nominatifSpdSuffix)
                ) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDipaConfig((prev) => ({
                        ...prev,
                        nominatifSpd: "",
                        nominatifSpdNo: "",
                        nominatifSpdSuffix: "",
                      }))
                    }
                    className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2"
                  >
                    Kosongkan
                  </Button>
                )}
              </div>

              {/* Tanggal TTD Nominatif */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tanggal TTD Nominatif:
                </span>
                <Input
                  type="date"
                  value={toIsoDateString(dipaConfig.nominatifDate)}
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, nominatifDate: e.target.value }))}
                  className="h-8 w-40 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
                {dipaConfig.nominatifDate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDipaConfig((prev) => ({ ...prev, nominatifDate: "" }))}
                    className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2"
                  >
                    Kosongkan
                  </Button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Default: Kosong (Pulpen)</span>
                )}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
              * Khusus lembar Daftar Nominatif: jika nomor SPD dan tanggal kosong, lembar cetak otomatis diberi spasi untuk diisi manual dengan pulpen.
            </p>
          </div>

          {/* Table of Personnel & Costs */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Daftar Pelaksana &amp; Rincian Biaya Nominatif
                </h3>
                <p className="text-[11px] text-slate-500">
                  Edit langsung rincian biaya per personil di tabel bawah ini.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 font-semibold px-1">SBM Hotel 30%:</span>
                  {SBM_HOTEL_PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => applyBatchSbmHotel(preset.key)}
                      className="h-6 text-[10px] px-2 text-emerald-700 hover:bg-emerald-100/70 dark:text-emerald-300 font-semibold gap-1 rounded-lg"
                    >
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      {preset.key === "kaltim" ? "Kaltim" : preset.key === "jabar" ? "Jabar" : "DKI"}
                    </Button>
                  ))}
                </div>
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {recipients.length} Pelaksana
                </Badge>
              </div>
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
                    const breakdown = getDipaTransportBreakdown(dipa);
                    const rowTotal = recipient.amount || calculateDipaTotal(dipa);
                    const isExpanded = expandedTransportRecipientId === recipient.id;

                    return (
                      <React.Fragment key={recipient.id}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
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
                            <button
                              type="button"
                              onClick={() => setExpandedTransportRecipientId(isExpanded ? null : recipient.id)}
                              className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border transition ${
                                isExpanded
                                  ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              }`}
                            >
                              <Car className="h-3 w-3" />
                              <span>Rincian Transport ({breakdown.items.length})</span>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatRupiahInput(breakdown.udara)}
                              onChange={(e) => {
                                const val = parseRupiahInput(e.target.value);
                                const udaraItems = breakdown.items.filter((it) => it.category === "udara");
                                if (udaraItems.length <= 1) {
                                  const otherItems = breakdown.items.filter((it) => it.category !== "udara");
                                  const newUdara: DipaTransportItem[] = val > 0 ? [{
                                    id: udaraItems[0]?.id || `trans-udara-${Date.now()}`,
                                    category: "udara",
                                    label: udaraItems[0]?.label || "Tiket Pesawat PP",
                                    amount: val,
                                  }] : [];
                                  const newItems = [...otherItems, ...newUdara];
                                  const updatedBreakdown = getDipaTransportBreakdown({
                                    ...dipa,
                                    transportItems: newItems,
                                    transportUdara: 0,
                                    taksiPp: 0,
                                  });
                                  updateDipaField(recipient.id, {
                                    transportItems: newItems,
                                    transportUdara: updatedBreakdown.udara,
                                    taksiPp: updatedBreakdown.darat,
                                  });
                                } else {
                                  toast.info("Memiliki beberapa item tiket pesawat, silakan ubah pada rincian transport.");
                                  setExpandedTransportRecipientId(recipient.id);
                                }
                              }}
                              placeholder="0"
                              className="rounded-lg text-right font-mono text-xs h-8"
                            />
                            {breakdown.items.filter((i) => i.category === "udara").length > 1 && (
                              <div className="mt-0.5 text-right">
                                <span className="text-[9px] text-sky-700 bg-sky-50 dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 rounded font-mono font-medium">
                                  {breakdown.items.filter((i) => i.category === "udara").length} item tiket
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatRupiahInput(breakdown.darat)}
                              onChange={(e) => {
                                const val = parseRupiahInput(e.target.value);
                                const daratItems = breakdown.items.filter((it) => it.category === "darat");
                                if (daratItems.length <= 1) {
                                  const otherItems = breakdown.items.filter((it) => it.category !== "darat");
                                  const newDarat: DipaTransportItem[] = val > 0 ? [{
                                    id: daratItems[0]?.id || `trans-darat-${Date.now()}`,
                                    category: "darat",
                                    label: daratItems[0]?.label || "Taksi Bandara / Stasiun PP",
                                    amount: val,
                                  }] : [];
                                  const newItems = [...otherItems, ...newDarat];
                                  const updatedBreakdown = getDipaTransportBreakdown({
                                    ...dipa,
                                    transportItems: newItems,
                                    transportUdara: 0,
                                    taksiPp: 0,
                                  });
                                  updateDipaField(recipient.id, {
                                    transportItems: newItems,
                                    transportUdara: updatedBreakdown.udara,
                                    taksiPp: updatedBreakdown.darat,
                                  });
                                } else {
                                  toast.info("Memiliki beberapa item transportasi darat (Tol/Ferry), silakan ubah pada rincian transport.");
                                  setExpandedTransportRecipientId(recipient.id);
                                }
                              }}
                              placeholder="0"
                              className="rounded-lg text-right font-mono text-xs h-8"
                            />
                            {breakdown.items.filter((i) => i.category === "darat").length > 1 && (
                              <div className="mt-0.5 text-right">
                                <span className="text-[9px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono font-medium">
                                  {breakdown.items.filter((i) => i.category === "darat").length} item darat
                                </span>
                              </div>
                            )}
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
                            <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
                              {hotelSubtotal > 0 ? (
                                dipa.dpRilEnabled !== false ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 rounded border border-emerald-200">
                                    DPRill (30%)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 bg-sky-50 rounded border border-sky-200">
                                    Hotel Riil
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 italic text-[9px]">Tanpa Hotel</span>
                              )}
                              <span className="font-mono text-slate-500 font-medium">
                                = {formatRupiah(hotelSubtotal)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              {SBM_HOTEL_PRESETS.map((pr) => {
                                const std = getSbmStandardRate(pr.key, recipient.rank);
                                const r30 = Math.round(0.3 * std);
                                const defaultNights = dipa.penginapanNights || Math.max(1, calculateDays(travel.startDate, travel.endDate) - 1);
                                return (
                                  <button
                                    key={pr.key}
                                    type="button"
                                    onClick={() => {
                                      updateDipaField(recipient.id, {
                                        dpRilEnabled: true,
                                        dpRilHotelStandardRate: std,
                                        penginapanRate: r30,
                                        penginapanNights: defaultNights,
                                        dpRilProvince: pr.provinceName,
                                      });
                                    }}
                                    title={`Terapkan ${pr.label} (100% SBM: ${formatRupiah(std)}, 30%: ${formatRupiah(r30)})`}
                                    className="text-[9px] px-1 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 transition-colors"
                                  >
                                    {pr.key === "kaltim" ? "Kaltim" : pr.key === "jabar" ? "Jabar" : "DKI"}
                                  </button>
                                );
                              })}
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

                        {/* Inline Expandable Transport Breakdown Panel */}
                        {isExpanded && (
                          <tr className="bg-emerald-50/40 dark:bg-slate-800/80 border-y border-emerald-200 dark:border-emerald-800">
                            <td colSpan={8} className="p-4">
                              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                                  <div className="flex items-center gap-2">
                                    <Car className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                      Rincian Biaya Transportasi: {recipient.name}
                                    </h5>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 px-2 py-0.5 rounded font-mono text-[11px] border border-sky-200 dark:border-sky-800">
                                      Udara (Kol 5): {formatRupiah(breakdown.udara)}
                                    </span>
                                    <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px] border border-emerald-200 dark:border-emerald-800">
                                      Taksi/Darat (Kol 6): {formatRupiah(breakdown.darat)}
                                    </span>
                                    <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                                      Total Transport: {formatRupiah(breakdown.total)}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {breakdown.items.map((item, itemIdx) => (
                                    <div
                                      key={item.id || itemIdx}
                                      className="grid grid-cols-1 sm:grid-cols-[160px_1fr_140px_auto] items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-700"
                                    >
                                      <select
                                        value={item.category}
                                        onChange={(e) =>
                                          updateDipaTransportItem(recipient.id, itemIdx, {
                                            category: e.target.value as "udara" | "darat",
                                          })
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 h-8"
                                      >
                                        <option value="darat">🚗 Darat/Laut/Taksi</option>
                                        <option value="udara">✈️ Udara / Pesawat</option>
                                      </select>

                                      <Input
                                        value={item.label}
                                        onChange={(e) =>
                                          updateDipaTransportItem(recipient.id, itemIdx, { label: e.target.value })
                                        }
                                        placeholder="Contoh: Tol Samarinda - Balikpapan (PP) / Ferry Kariangau..."
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />

                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatRupiahInput(item.amount)}
                                        onChange={(e) =>
                                          updateDipaTransportItem(recipient.id, itemIdx, {
                                            amount: parseRupiahInput(e.target.value),
                                          })
                                        }
                                        placeholder="Rp 0"
                                        className="h-8 text-right font-mono text-xs bg-white dark:bg-slate-900"
                                      />

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeDipaTransportItem(recipient.id, itemIdx)}
                                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                                        title="Hapus item"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}

                                  {breakdown.items.length === 0 && (
                                    <p className="text-xs text-slate-400 italic py-1">
                                      Belum ada rincian transportasi. Tambahkan item Tol, Ferry, Taksi, atau Tiket Pesawat di bawah ini.
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addDipaTransportItem(recipient.id, "darat", "Tol Samarinda - Balikpapan (PP)", 0)}
                                      className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 gap-1 rounded-lg"
                                    >
                                      <Plus className="h-3 w-3" /> + Transport Darat/Laut (Tol, Ferry, Taksi)
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addDipaTransportItem(recipient.id, "udara", "Tiket Pesawat PP", 0)}
                                      className="h-7 text-xs text-sky-700 hover:bg-sky-50 dark:text-sky-400 gap-1 rounded-lg"
                                    >
                                      <Plane className="h-3 w-3" /> + Tiket Pesawat (Udara)
                                    </Button>
                                  </div>

                                  {recipients.length > 1 && breakdown.items.length > 0 && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => copyTransportItemsToAll(recipient.id)}
                                      className="h-7 text-xs text-slate-700 hover:bg-slate-200 dark:text-slate-300 gap-1 rounded-lg"
                                    >
                                      <Copy className="h-3 w-3" /> Salin Rincian ke Semua Personil
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
                placeholder={DEFAULT_DIPA_KLASIFIKASI_MAK}
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
                placeholder={effectiveKodeMak}
                className="mt-1 rounded-xl font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Tempat SPTJB
              </label>
              <Input
                value={dipaConfig.cityDateText || "Samarinda,"}
                onChange={(e) => setDipaConfig((prev) => ({ ...prev, cityDateText: e.target.value }))}
                placeholder="Samarinda,"
                className="mt-1 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Tanggal SPTJB
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <Input
                  type="date"
                  value={toIsoDateString(dipaConfig.sptjbDate)}
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, sptjbDate: e.target.value }))}
                  className="rounded-xl text-xs font-medium bg-white dark:bg-slate-900"
                />
                {dipaConfig.sptjbDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDipaConfig((prev) => ({ ...prev, sptjbDate: "" }))}
                    className="h-9 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 shrink-0"
                  >
                    Kosongkan
                  </Button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Default: Kosong (dapat diisi saat pencairan)
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Nomor Bukti SPTJB
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <Input
                  value={
                    dipaConfig.buktiSptjb !== undefined
                      ? dipaConfig.buktiSptjb
                      : `/${getRomanMonth(new Date())}/${new Date().getFullYear()}`
                  }
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, buktiSptjb: e.target.value }))}
                  placeholder={`/${getRomanMonth(new Date())}/${new Date().getFullYear()}`}
                  className="rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-900"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDipaConfig((prev) => ({
                      ...prev,
                      buktiSptjb: `/${getRomanMonth(new Date())}/${new Date().getFullYear()}`,
                    }))
                  }
                  className="h-9 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 px-2 shrink-0"
                >
                  Bulan Berjalan
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Default: /{getRomanMonth(new Date())}/{new Date().getFullYear()} (Bulan berjalan angka romawi)
              </p>
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
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Nomor Lampiran SPD (RINBA)
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 font-mono">SPD.</span>
                  <Input
                    value={spdNumber.no || dipaConfig.rinbaSpdNo || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSpdNumber((prev) => ({ ...prev, no: val }));
                      setDipaConfig((prev) => ({ ...prev, rinbaSpdNo: val }));
                    }}
                    placeholder="No."
                    className="w-16 shrink-0 rounded-xl text-center font-mono text-xs font-semibold"
                  />
                  <Input
                    value={spdNumber.suffix || dipaConfig.rinbaSpdSuffix || defaultEvidenceSuffix}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSpdNumber((prev) => ({ ...prev, suffix: val }));
                      setDipaConfig((prev) => ({ ...prev, rinbaSpdSuffix: val }));
                    }}
                    placeholder="/K.18-TU/KEU/01/2026"
                    className="min-w-0 flex-1 rounded-xl font-mono text-xs font-semibold"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Cukup 1 nomor untuk seluruh personil RINBA. Kosongkan jika ditulis manual pulpen.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Default Suffix Kuitansi Rinba
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
                    Terapkan Semua
                  </button>
                </div>
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

              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Tanggal Tanda Terima Rinba
                </h4>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={toIsoDateString(dipaConfig.rinbaDate)}
                    onChange={(e) => setDipaConfig((prev) => ({ ...prev, rinbaDate: e.target.value }))}
                    className="rounded-xl text-xs font-medium bg-white dark:bg-slate-900"
                  />
                  {dipaConfig.rinbaDate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDipaConfig((prev) => ({ ...prev, rinbaDate: "" }))}
                      className="h-9 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 shrink-0"
                    >
                      Kosongkan
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Default: Kosong (diisi saat penerimaan biaya dinas)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {recipients.map((recipient, index) => {
              const dipa = recipient.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
              const uhSubtotal = (dipa.uangHarianDays || 1) * (dipa.uangHarianRate || 0);
              const breakdown = getDipaTransportBreakdown(dipa);
              const transportSubtotal = breakdown.total;
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
                      <div className="space-y-0.5 text-[11px] w-full">
                        <div className="flex justify-between">
                          <span className="text-slate-500">1. Uang Harian:</span>
                          <span className="font-mono font-semibold">{formatRupiah(uhSubtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">2. Transportasi (Udara &amp; Darat):</span>
                          <span className="font-mono font-semibold">{formatRupiah(transportSubtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">3. Penginapan:</span>
                          <span className="font-mono font-semibold">{formatRupiah(hotelSubtotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION: 2. RINCIAN TRANSPORTASI (DARAT, LAUT, UDARA) */}
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            2. Rincian Biaya Transportasi (Darat / Laut &amp; Udara)
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Tercetak di baris 2 Rinba, dan terdistribusi ke Kolom 5 (Udara) &amp; Kolom 6 (Taksi PP) Nominatif.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addDipaTransportItem(recipient.id, "darat", "Tol Samarinda - Balikpapan (PP)", 0)}
                          className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 gap-1 rounded-lg"
                        >
                          <Plus className="h-3 w-3" /> + Darat/Laut
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addDipaTransportItem(recipient.id, "udara", "Tiket Pesawat PP", 0)}
                          className="h-7 text-xs text-sky-700 hover:bg-sky-50 dark:text-sky-400 gap-1 rounded-lg"
                        >
                          <Plane className="h-3 w-3" /> + Udara
                        </Button>
                        {recipients.length > 1 && breakdown.items.length > 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => copyTransportItemsToAll(recipient.id)}
                            className="h-7 text-xs text-slate-700 hover:bg-slate-200 dark:text-slate-300 gap-1 rounded-lg"
                          >
                            <Copy className="h-3 w-3" /> Salin ke Semua
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {breakdown.items.map((item, itemIdx) => (
                        <div
                          key={item.id || itemIdx}
                          className="grid grid-cols-1 sm:grid-cols-[160px_1fr_140px_auto] items-center gap-2 p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 dark:bg-slate-800/50 dark:border-slate-700"
                        >
                          <select
                            value={item.category}
                            onChange={(e) =>
                              updateDipaTransportItem(recipient.id, itemIdx, {
                                category: e.target.value as "udara" | "darat",
                              })
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 h-8"
                          >
                            <option value="darat">🚗 Darat / Laut / Taksi PP</option>
                            <option value="udara">✈️ Udara / Pesawat</option>
                          </select>

                          <Input
                            value={item.label || ""}
                            onChange={(e) =>
                              updateDipaTransportItem(recipient.id, itemIdx, { label: e.target.value })
                            }
                            placeholder="Contoh: Tol Samarinda - Balikpapan (PP) / Ferry Kariangau..."
                            className="h-8 text-xs bg-white dark:bg-slate-900"
                          />

                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatRupiahInput(item.amount)}
                            onChange={(e) =>
                              updateDipaTransportItem(recipient.id, itemIdx, {
                                amount: parseRupiahInput(e.target.value),
                              })
                            }
                            placeholder="Rp 0"
                            className="h-8 text-right font-mono text-xs bg-white dark:bg-slate-900"
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDipaTransportItem(recipient.id, itemIdx)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      {breakdown.items.length === 0 && (
                        <p className="text-[11px] italic text-slate-400 py-1">
                          Belum ada item transportasi. Klik tombol di atas untuk menambah rincian (Tol, Ferry, Pesawat, dll).
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SECTION: 3. PENGINAPAN (HOTEL / DP RIL 30%) */}
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Hotel className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              3. Penginapan (Hotel / DP Ril 30%)
                            </span>
                            {hotelSubtotal > 0 && (
                              dipa.dpRilEnabled !== false ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1.5 py-0 font-semibold border border-emerald-200">
                                  DPRill (30% SBM)
                                </Badge>
                              ) : (
                                <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[9px] px-1.5 py-0 font-semibold border border-sky-200">
                                  Hotel Riil (Kuitansi)
                                </Badge>
                              )
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Tercetak di baris 3 Rinba sebagai &quot;Penginapan&quot; (Keterangan: {dipa.dpRilEnabled !== false && hotelSubtotal > 0 ? "DPRill" : "-"}).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-emerald-600 mr-1">
                          {formatRupiah(hotelSubtotal)}
                        </span>
                        {recipients.length > 1 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => copyPenginapanToAll(recipient.id)}
                            className="h-7 text-xs text-slate-700 hover:bg-slate-200 dark:text-slate-300 gap-1 rounded-lg"
                          >
                            <Copy className="h-3 w-3" /> Salin ke Semua
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const defaultNights = dipa.penginapanNights || Math.max(1, calculateDays(travel.startDate, travel.endDate) - 1);
                          const std = dipa.dpRilHotelStandardRate || getSbmStandardRate("kaltim", recipient.rank);
                          const r30 = Math.round(0.3 * std);
                          updateDipaField(recipient.id, {
                            dpRilEnabled: true,
                            dpRilHotelStandardRate: std,
                            penginapanRate: r30,
                            penginapanNights: defaultNights,
                            dpRilProvince: dipa.dpRilProvince || travel.destination || "Provinsi Kalimantan Timur",
                          });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                          dipa.dpRilEnabled !== false && (dipa.penginapanRate || 0) > 0
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        ✓ DP Ril (30% SBM)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const defaultNights = dipa.penginapanNights || Math.max(1, calculateDays(travel.startDate, travel.endDate) - 1);
                          updateDipaField(recipient.id, {
                            dpRilEnabled: false,
                            penginapanNights: defaultNights,
                            penginapanRate: dipa.penginapanRate || 500000,
                          });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                          dipa.dpRilEnabled === false && (dipa.penginapanRate || 0) > 0
                            ? "bg-sky-600 text-white border-sky-600 font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        Hotel Riil (100% Kuitansi)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateDipaField(recipient.id, {
                            penginapanRate: 0,
                            penginapanNights: 0,
                          });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                          (dipa.penginapanRate || 0) === 0 || (dipa.penginapanNights || 0) === 0
                            ? "bg-slate-200 text-slate-800 border-slate-300 font-bold dark:bg-slate-700 dark:text-white"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                        }`}
                      >
                        Tanpa Penginapan (Rp 0)
                      </button>
                    </div>

                    {/* Mode Form Content */}
                    {dipa.dpRilEnabled !== false && (dipa.penginapanRate || 0) > 0 ? (
                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-semibold">Preset Standar SBM:</span>
                          {SBM_HOTEL_PRESETS.map((preset) => {
                            const std = getSbmStandardRate(preset.key, recipient.rank);
                            const r30 = Math.round(0.3 * std);
                            const isSelected = (dipa.dpRilHotelStandardRate || 0) === std;
                            return (
                              <button
                                key={preset.key}
                                type="button"
                                onClick={() => {
                                  updateDipaField(recipient.id, {
                                    dpRilEnabled: true,
                                    dpRilHotelStandardRate: std,
                                    penginapanRate: r30,
                                    penginapanNights: dipa.penginapanNights || 1,
                                    dpRilProvince: preset.provinceName,
                                  });
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                  isSelected
                                    ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                                    : "bg-white hover:bg-emerald-50 text-slate-700 border-emerald-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {preset.label.split(" ")[0]} ({formatRupiah(std)})
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">Tarif 100% SBM (Rp)</label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatRupiahInput(dipa.dpRilHotelStandardRate || Math.round((dipa.penginapanRate || 0) / 0.3))}
                              onChange={(e) => {
                                const newStd = parseRupiahInput(e.target.value);
                                const new30 = Math.round(0.3 * newStd);
                                updateDipaField(recipient.id, {
                                  dpRilHotelStandardRate: newStd,
                                  penginapanRate: new30,
                                });
                              }}
                              className="h-8 text-xs font-mono mt-0.5 bg-white dark:bg-slate-900"
                            />
                            <p className="text-[9.5px] text-emerald-700 font-semibold mt-0.5">
                              30% = {formatRupiah(dipa.penginapanRate || 0)} / malam
                            </p>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">Jumlah Malam</label>
                            <Input
                              type="number"
                              min={0}
                              max={60}
                              value={dipa.penginapanNights ?? 0}
                              onChange={(e) => {
                                updateDipaField(recipient.id, { penginapanNights: parseInt(e.target.value, 10) || 0 });
                              }}
                              className="h-8 text-xs font-mono mt-0.5 bg-white dark:bg-slate-900 text-center"
                            />
                            <p className="text-[9.5px] text-slate-400 mt-0.5">
                              Total: {dipa.penginapanNights || 0} malam
                            </p>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">Subtotal Penginapan Rinba</label>
                            <div className="h-8 flex items-center justify-between px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 mt-0.5 font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                              <span>= {formatRupiah(hotelSubtotal)}</span>
                              <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-sans font-bold border border-emerald-200">
                                DPRill
                              </span>
                            </div>
                            <p className="text-[9.5px] text-slate-400 mt-0.5">
                              Tercetak di baris 3 Rinba: &quot;Penginapan&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : dipa.dpRilEnabled === false && (dipa.penginapanRate || 0) > 0 ? (
                      <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-3 dark:border-sky-900/40 dark:bg-sky-950/20 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">Tarif Hotel Riil / Malam (Rp)</label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatRupiahInput(dipa.penginapanRate || 0)}
                              onChange={(e) => {
                                updateDipaField(recipient.id, { penginapanRate: parseRupiahInput(e.target.value) });
                              }}
                              className="h-8 text-xs font-mono mt-0.5 bg-white dark:bg-slate-900"
                              placeholder="Rp 0"
                            />
                            <p className="text-[9.5px] text-sky-700 font-semibold mt-0.5">
                              Sesuai bukti kuitansi hotel riil
                            </p>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">Jumlah Malam</label>
                            <Input
                              type="number"
                              min={0}
                              max={60}
                              value={dipa.penginapanNights ?? 0}
                              onChange={(e) => {
                                updateDipaField(recipient.id, { penginapanNights: parseInt(e.target.value, 10) || 0 });
                              }}
                              className="h-8 text-xs font-mono mt-0.5 bg-white dark:bg-slate-900 text-center"
                            />
                            <p className="text-[9.5px] text-slate-400 mt-0.5">
                              Total: {dipa.penginapanNights || 0} malam
                            </p>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">Subtotal Penginapan Rinba</label>
                            <div className="h-8 flex items-center justify-between px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 mt-0.5 font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                              <span>= {formatRupiah(hotelSubtotal)}</span>
                              <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded font-sans font-semibold border border-slate-200">
                                Keterangan: -
                              </span>
                            </div>
                            <p className="text-[9.5px] text-slate-400 mt-0.5">
                              Dokumen DP Ril nonaktif untuk personil ini
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 flex items-center justify-between">
                        <span>Biaya penginapan dinonaktifkan (Rp 0). Baris penginapan tidak akan dicetak di lembar Rinba.</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const defaultNights = Math.max(1, calculateDays(travel.startDate, travel.endDate) - 1);
                            const std = getSbmStandardRate("kaltim", recipient.rank);
                            const r30 = Math.round(0.3 * std);
                            updateDipaField(recipient.id, {
                              dpRilEnabled: true,
                              dpRilHotelStandardRate: std,
                              penginapanRate: r30,
                              penginapanNights: defaultNights,
                              dpRilProvince: "Provinsi Kalimantan Timur",
                            });
                          }}
                          className="h-6 text-[10px] text-emerald-700 hover:bg-emerald-50 rounded-md"
                        >
                          + Aktifkan DP Ril 30% (Kaltim)
                        </Button>
                      </div>
                    )}
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

      {/* TAB: DP RIL (DAFTAR PENGELUARAN RIIL) */}
      {activeDipaTab === "dpril" && (
        <div className="space-y-6">
          {/* Header & Quick batch applicator */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-emerald-600" />
                  Daftar Pengeluaran Riil (DP Ril)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Surat pernyataan tanggung jawab mutlak atas biaya penginapan 30% standar SBM atau transpor riil tanpa bukti kuitansi resmi.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-semibold mr-1">Terapkan Cepat SBM:</span>
                {SBM_HOTEL_PRESETS.map((preset) => (
                  <Button
                    key={preset.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const defaultNights = Math.max(1, calculateDays(travel.startDate, travel.endDate) - 1);
                      setRecipients((prev) =>
                        prev.map((r) => {
                          const currentDipa = r.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
                          const standard = getSbmStandardRate(preset.key, r.rank);
                          const rate30 = Math.round(0.3 * standard);
                          const updatedDipa = {
                            ...currentDipa,
                            dpRilEnabled: true,
                            dpRilHotelStandardRate: standard,
                            penginapanRate: rate30,
                            penginapanNights: defaultNights,
                            dpRilProvince: preset.provinceName,
                          };
                          return {
                            ...r,
                            dipa: updatedDipa,
                            amount: calculateDipaTotal(updatedDipa),
                          };
                        })
                      );
                      toast.success(`Tarif SBM ${preset.label} diterapkan sesuai Golongan masing-masing personil!`);
                    }}
                    className="h-7 text-[10px] px-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                  >
                    <Sparkles className="h-3 w-3 mr-1 text-emerald-600" />
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Official SBM rates reference banner */}
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-[11px] text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold mb-1.5 text-xs text-amber-900 dark:text-amber-100">
                <span>📋 Standar Biaya Masukan (SBM) Penginapan Resmi (PMK):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-white/80 dark:bg-slate-900/70 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                  <p className="font-bold text-slate-800 dark:text-slate-100">Kaltim dan Kaltara</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">Gol 1+2+3 = <span className="font-mono font-semibold text-slate-900 dark:text-white">Rp 804.000</span> (30% = Rp 241.200)</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">Gol 4 = <span className="font-mono font-semibold text-slate-900 dark:text-white">Rp 1.507.000</span> (30% = Rp 452.100)</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/70 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                  <p className="font-bold text-slate-800 dark:text-slate-100">Jawa Barat</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">Gol 1+2+3 = <span className="font-mono font-semibold text-slate-900 dark:text-white">Rp 570.000</span> (30% = Rp 171.000)</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">Gol 4 = <span className="font-mono font-semibold text-slate-900 dark:text-white">Rp 1.201.000</span> (30% = Rp 360.300)</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/70 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                  <p className="font-bold text-slate-800 dark:text-slate-100">DKI Jakarta</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">Gol 1+2+3 = <span className="font-mono font-semibold text-slate-900 dark:text-white">Rp 730.000</span> (30% = Rp 219.000)</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">Gol 4 = <span className="font-mono font-semibold text-slate-900 dark:text-white">Rp 992.000</span> (30% = Rp 297.600)</p>
                </div>
              </div>
            </div>

            {/* Tanggal DP Ril */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Tanggal Daftar Pengeluaran Riil:</span>
                <Input
                  type="date"
                  value={toIsoDateString(dipaConfig.dpRilDate)}
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, dpRilDate: e.target.value }))}
                  className="h-8 w-40 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
                {dipaConfig.dpRilDate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDipaConfig((prev) => ({ ...prev, dpRilDate: "" }))}
                    className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2"
                  >
                    Kosongkan
                  </Button>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Default: Kosong</span>
                )}
              </div>
            </div>
          </div>

          {/* Cards per recipient */}
          <div className="space-y-4">
            {recipients.map((recipient, idx) => {
              const dipa = recipient.dipa || buildDefaultDipa(travel.startDate, travel.endDate);
              const nights = dipa.penginapanNights ?? Math.max(1, calculateDays(travel.startDate, travel.endDate) - 1);
              const isGol4 = isGolongan4(recipient.rank);
              const defaultStandard = getSbmStandardRate("kaltim", recipient.rank);
              const standardRate = dipa.dpRilHotelStandardRate ?? (dipa.penginapanRate ? Math.round(dipa.penginapanRate / 0.3) : defaultStandard);
              const rate30 = Math.round(0.3 * standardRate);
              const hotelSubtotal = (dipa.penginapanRate || 0) * nights;
              const isEnabled = dipa.dpRilEnabled !== false && ((dipa.penginapanRate || 0) > 0 || (dipa.dpRilItems?.length || 0) > 0 || dipa.dpRilEnabled === true);
              const province = dipa.dpRilProvince || travel.destination || "Provinsi Kalimantan Timur";
              const extraRiilItems = dipa.dpRilItems || [];
              const extraRiilTotal = extraRiilItems.reduce((acc, it) => acc + (it.amount || 0), 0);
              const totalRiil = hotelSubtotal + extraRiilTotal;

              return (
                <div
                  key={recipient.id || idx}
                  className={`rounded-2xl border p-5 transition-all shadow-sm ${
                    isEnabled
                      ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      : "border-slate-200/60 bg-slate-50/70 opacity-75 dark:border-slate-800/60 dark:bg-slate-900/40"
                  }`}
                >
                  {/* Recipient Header & Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs dark:bg-emerald-950 dark:text-emerald-300">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase">
                            {recipient.name}
                          </h4>
                          {isGol4 ? (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[9px] px-1.5 py-0 font-semibold border border-purple-200">
                              Golongan IV
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[9px] px-1.5 py-0 font-semibold border border-blue-200">
                              Golongan I/II/III
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          NIP. {formatNip(recipient.nip || recipient.id)} • {recipient.position || "Pelaksana"} • Pangkat: {recipient.rank || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateDipaField(recipient.id, {
                              dpRilEnabled: checked,
                              ...(checked && !dipa.penginapanRate ? {
                                dpRilHotelStandardRate: standardRate,
                                penginapanRate: rate30,
                                penginapanNights: nights,
                                dpRilProvince: province,
                              } : {}),
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Sertakan Dokumen DP Ril
                        </span>
                      </label>

                      {isEnabled && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                          Total DP Ril: {formatRupiah(totalRiil)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Form fields if enabled */}
                  {isEnabled && (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {/* Box 1: Biaya Penginapan 30% */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                            1. Biaya Penginapan 30% SBM
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-600">
                            {formatRupiah(hotelSubtotal)}
                          </span>
                        </div>

                        {/* Preset quick buttons for this recipient */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[9px] text-slate-400 font-semibold">Pilih SBM:</span>
                          {SBM_HOTEL_PRESETS.map((preset) => {
                            const std = getSbmStandardRate(preset.key, recipient.rank);
                            const r30 = Math.round(0.3 * std);
                            const isSelected = standardRate === std;
                            return (
                              <button
                                key={preset.key}
                                type="button"
                                onClick={() => {
                                  updateDipaField(recipient.id, {
                                    dpRilHotelStandardRate: std,
                                    penginapanRate: r30,
                                    penginapanNights: nights,
                                    dpRilProvince: preset.provinceName,
                                  });
                                }}
                                className={`text-[9.5px] px-2 py-0.5 rounded border transition-colors ${
                                  isSelected
                                    ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {preset.label.split(" ")[0]} ({formatRupiah(std)})
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">Tarif 100% SBM (Rp)</label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatRupiahInput(standardRate)}
                              onChange={(e) => {
                                const newStd = parseRupiahInput(e.target.value);
                                const new30 = Math.round(0.3 * newStd);
                                updateDipaField(recipient.id, {
                                  dpRilHotelStandardRate: newStd,
                                  penginapanRate: new30,
                                });
                              }}
                              className="h-8 text-xs font-mono mt-1"
                              placeholder="1.507.000"
                            />
                            <p className="text-[9.5px] text-slate-400 mt-0.5">30% = {formatRupiah(rate30)}/mlm</p>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">Jumlah Malam</label>
                            <Input
                              type="number"
                              min={0}
                              max={60}
                              value={nights}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateDipaField(recipient.id, { penginapanNights: val });
                              }}
                              className="h-8 text-xs font-mono mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Provinsi / Lokasi Hotel</label>
                          <Input
                            type="text"
                            value={province}
                            onChange={(e) => updateDipaField(recipient.id, { dpRilProvince: e.target.value })}
                            className="h-8 text-xs mt-1"
                            placeholder="Provinsi Kalimantan Timur"
                          />
                        </div>
                      </div>

                      {/* Box 2: Biaya Transpor / Riil Tambahan */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                            2. Pengeluaran Riil Tambahan
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const items = dipa.dpRilItems || [];
                              const newItem = { label: "Transpor Lokal Riil", amount: 0 };
                              updateDipaField(recipient.id, { dpRilItems: [...items, newItem] });
                            }}
                            className="h-7 text-[10px] px-2 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Tambah Baris
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {extraRiilItems.map((it, itIdx) => (
                            <div key={itIdx} className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={it.label}
                                onChange={(e) => {
                                  const items = [...extraRiilItems];
                                  items[itIdx] = { ...items[itIdx], label: e.target.value };
                                  updateDipaField(recipient.id, { dpRilItems: items });
                                }}
                                className="h-8 text-xs flex-1"
                                placeholder="Uraian (misal Ojek lokal)"
                              />
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={formatRupiahInput(it.amount)}
                                onChange={(e) => {
                                  const items = [...extraRiilItems];
                                  items[itIdx] = { ...items[itIdx], amount: parseRupiahInput(e.target.value) };
                                  updateDipaField(recipient.id, { dpRilItems: items });
                                }}
                                className="h-8 text-xs w-28 font-mono text-right"
                                placeholder="Rp"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const items = extraRiilItems.filter((_, i) => i !== itIdx);
                                  updateDipaField(recipient.id, { dpRilItems: items });
                                }}
                                className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          {extraRiilItems.length === 0 && (
                            <p className="text-[11px] italic text-slate-400 py-2">
                              Tidak ada biaya riil tambahan. Biaya penginapan 30% di atas sudah mencukupi.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: SPBy */}
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
                Nomor SPBy
              </label>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs">
                <Input
                  value={dipaConfig.spbyNo || ""}
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyNo: e.target.value }))}
                  placeholder="No."
                  className="w-16 rounded-xl text-center font-mono text-xs bg-white dark:bg-slate-900"
                />
                <span className="text-slate-400 font-bold text-sm">/</span>
                <Input
                  value={dipaConfig.spbyMonth !== undefined ? dipaConfig.spbyMonth : getRomanMonth(new Date())}
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyMonth: e.target.value }))}
                  placeholder="Romawi"
                  className="w-20 rounded-xl text-center font-mono text-xs font-semibold bg-white dark:bg-slate-900"
                />
                <span className="text-slate-400 font-bold text-sm">/</span>
                <Input
                  value={dipaConfig.spbyYear !== undefined ? dipaConfig.spbyYear : new Date().getFullYear().toString()}
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyYear: e.target.value }))}
                  placeholder="Tahun"
                  className="w-20 rounded-xl text-center font-mono text-xs font-semibold bg-white dark:bg-slate-900"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Kosongkan nomor jika akan diisi manual pulpen.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Tanggal SPBy
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <Input
                  type="date"
                  value={toIsoDateString(dipaConfig.spbyDate)}
                  onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyDate: e.target.value }))}
                  className="rounded-xl text-xs font-medium bg-white dark:bg-slate-900"
                />
                {dipaConfig.spbyDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDipaConfig((prev) => ({ ...prev, spbyDate: "" }))}
                    className="h-9 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 shrink-0"
                  >
                    Kosongkan
                  </Button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Default: Kosong (diisi saat pembayaran)
              </p>
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
                placeholder={DEFAULT_DIPA_KLASIFIKASI_MAK}
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
                placeholder={effectiveKodeMak}
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

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Atas Dasar Bukti Pembayaran (SPBY)
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    1. Kuitansi/bukti pembayaran
                  </label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Input
                      value={dipaConfig.spbyKuitansi || ""}
                      onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyKuitansi: e.target.value }))}
                      placeholder="Kosong (manual pulpen)"
                      className="rounded-xl text-xs bg-white dark:bg-slate-900 font-medium"
                    />
                    {dipaConfig.spbyKuitansi && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDipaConfig((prev) => ({ ...prev, spbyKuitansi: "" }))}
                        className="h-9 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 shrink-0"
                      >
                        Kosongkan
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Default: Kosong (diberi jarak spasi agar bisa diisi manual). Teks akhir: (Bukti Pembayaran).
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    2. Nota/bukti penerimaan barang/jasa
                  </label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Input
                      value={dipaConfig.spbyNota || ""}
                      onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyNota: e.target.value }))}
                      placeholder="Kosong (manual pulpen) atau isi contoh: 5 / -"
                      className="rounded-xl text-xs bg-white dark:bg-slate-900 font-medium"
                    />
                    {dipaConfig.spbyNota && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDipaConfig((prev) => ({ ...prev, spbyNota: "" }))}
                        className="h-9 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 shrink-0"
                      >
                        Kosongkan
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Default: Kosong (diberi jarak spasi agar bisa diisi manual). Teks akhir: (Bukti Pembelian) / (Bukti lainnya).
                  </p>
                </div>
              </div>
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Maksud Perjalanan Dinas (Poin 4 SPD)
              </label>
              <button
                type="button"
                onClick={() => {
                  const cleaned = formatMaksudSpd(activity.name, travel);
                  setDipaConfig((prev) => ({ ...prev, maksudTujuan: cleaned }));
                  toast.success("Maksud perjalanan dinas diringkas!");
                }}
                className="text-[10px] text-emerald-600 hover:underline font-semibold"
              >
                Reset ke Format Ringkas
              </button>
            </div>
            <Textarea
              value={
                dipaConfig.maksudTujuan !== undefined
                  ? dipaConfig.maksudTujuan
                  : formatMaksudSpd(activity.name, travel)
              }
              onChange={(e) => setDipaConfig((prev) => ({ ...prev, maksudTujuan: e.target.value }))}
              rows={2}
              placeholder="Perjalanan Dinas dari Samarinda ke Jakarta dalam rangka Kunjungan Menteri di Jakarta"
              className="rounded-xl text-xs font-medium leading-relaxed"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Format baku SPD: Hanya sampai tujuan/kegiatan saja (tanpa durasi waktu dan klausul laporan).
            </p>
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
                value={toIsoDateString(dipaConfig.spdDate) || travel.startDate || ""}
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
