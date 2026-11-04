"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getDipaKegiatanList,
  getDipaRoListByKegiatan,
  getDipaSubkomponenListByRo,
  getDipaAkunListBySubkomponen,
  getDipaItemsByAkun,
  DIPA_FA_DETAIL_ENTRIES,
  DipaBudgetEntry,
} from "./dipa-fa-detail-data";
import {
  DipaConfig,
  DEFAULT_DIPA_KLASIFIKASI_MAK,
  buildDefaultSptjbUraian,
  getDipaAkunName,
} from "./templates/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Layers,
  CheckCircle2,
  Edit3,
  Check,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface DipaCascadingBudgetSelectorProps {
  dipaConfig: DipaConfig;
  setDipaConfig: React.Dispatch<React.SetStateAction<DipaConfig>>;
  effectiveKodeMak?: string;
  travel?: { origin: string; destination: string; startDate: string; endDate: string };
  recipientCount?: number;
  activityName?: string;
  className?: string;
}

export function DipaCascadingBudgetSelector({
  dipaConfig,
  setDipaConfig,
  effectiveKodeMak = "051.E.770",
  travel,
  recipientCount = 1,
  activityName = "",
  className = "",
}: DipaCascadingBudgetSelectorProps) {
  // Cascading Selection States
  const [selectedKegiatan, setSelectedKegiatan] = useState<string>("");
  const [selectedRo, setSelectedRo] = useState<string>("");
  const [selectedSubkomponen, setSelectedSubkomponen] = useState<string>("");
  const [selectedAkun, setSelectedAkun] = useState<string>("");
  const [selectedItemSuffixes, setSelectedItemSuffixes] = useState<string[]>([]);
  const [isManualEdit, setIsManualEdit] = useState<boolean>(false);

  // Helper to format item suffix to 3 digits (e.g. "5" -> "005", "17" -> "017", "233" -> "233")
  const padSuffix = (s: string) => String(s || "").padStart(3, "0");

  // Initialize from dipaConfig on mount or when changed externally
  useEffect(() => {
    const rawKlasifikasi = (dipaConfig.klasifikasiMak || DEFAULT_DIPA_KLASIFIKASI_MAK).trim();
    const parts = rawKlasifikasi.split(".");
    if (parts.length >= 4) {
      const keg = parts[0];
      const ro = `${parts[1]}.${parts[2]}`;
      const akun = parts[3];

      setSelectedKegiatan(keg);
      setSelectedRo(ro);
      setSelectedAkun(akun);

      // Try matching subkomponen from entry with komponen and letter awareness
      let matchingEntry: DipaBudgetEntry | undefined;
      if (dipaConfig.kodeMak) {
        const makParts = dipaConfig.kodeMak.split(".");
        if (makParts.length > 1) {
          const komp = makParts[0];
          const letter = makParts[1].toUpperCase();
          matchingEntry = DIPA_FA_DETAIL_ENTRIES.find(
            (e) =>
              e.kegiatanKode === keg &&
              `${e.kroKode}.${e.roKode}` === ro &&
              e.akunKode === akun &&
              e.komponenKode === komp &&
              e.subkomponenLetter.toUpperCase() === letter
          );
        }
      }
      if (!matchingEntry) {
        matchingEntry = DIPA_FA_DETAIL_ENTRIES.find(
          (e) => e.kegiatanKode === keg && `${e.kroKode}.${e.roKode}` === ro && e.akunKode === akun
        );
      }
      if (matchingEntry) {
        setSelectedSubkomponen(matchingEntry.subkomponenKode);
      }
    }

    // Initialize item suffixes from dipaConfig.kodeMak (e.g. "051.A.749.750" or "051.A.5")
    if (dipaConfig.kodeMak) {
      const makParts = dipaConfig.kodeMak.split(".");
      // makParts: ["051", "A", "749", "750"] or ["051", "A", "5"]
      if (makParts.length > 2) {
        const suffixes = makParts.slice(2).map(padSuffix);
        setSelectedItemSuffixes(suffixes);

        // Normalize dipaConfig.kodeMak so single digits become 3 digits (e.g. 051.A.5 -> 051.A.005)
        const normalizedKodeMak = `${makParts[0]}.${makParts[1]}.${suffixes.join(".")}`;
        if (normalizedKodeMak !== dipaConfig.kodeMak) {
          setDipaConfig((prev) => ({ ...prev, kodeMak: normalizedKodeMak }));
        }
      }
    }
  }, [dipaConfig.klasifikasiMak, dipaConfig.kodeMak]);

  // Dropdown 1: Kegiatan List (7269 s/d selesai)
  const kegiatanList = useMemo(() => getDipaKegiatanList(), []);

  // Dropdown 2: RO List (filtered by selected kegiatan)
  const roList = useMemo(() => {
    if (!selectedKegiatan) return [];
    return getDipaRoListByKegiatan(selectedKegiatan);
  }, [selectedKegiatan]);

  // Dropdown 3: Subkomponen List (filtered by selected RO)
  const subkomponenList = useMemo(() => {
    if (!selectedKegiatan || !selectedRo) return [];
    return getDipaSubkomponenListByRo(selectedKegiatan, selectedRo);
  }, [selectedKegiatan, selectedRo]);

  // Dropdown 4: Akun List (filtered by selected Subkomponen)
  const akunList = useMemo(() => {
    if (!selectedKegiatan || !selectedRo || !selectedSubkomponen) return [];
    return getDipaAkunListBySubkomponen(selectedKegiatan, selectedRo, selectedSubkomponen);
  }, [selectedKegiatan, selectedRo, selectedSubkomponen]);

  // Dropdown 5: Items List (filtered by selected Akun)
  const itemsList = useMemo(() => {
    if (!selectedKegiatan || !selectedRo || !selectedSubkomponen || !selectedAkun) return [];
    return getDipaItemsByAkun(selectedKegiatan, selectedRo, selectedSubkomponen, selectedAkun);
  }, [selectedKegiatan, selectedRo, selectedSubkomponen, selectedAkun]);

  // Handle Pick 1: Kegiatan
  const handleSelectKegiatan = (kegKode: string) => {
    setSelectedKegiatan(kegKode);
    setSelectedRo("");
    setSelectedSubkomponen("");
    setSelectedAkun("");
    setSelectedItemSuffixes([]);
  };

  // Handle Pick 2: RO
  const handleSelectRo = (roFull: string) => {
    setSelectedRo(roFull);
    setSelectedSubkomponen("");
    setSelectedAkun("");
    setSelectedItemSuffixes([]);
  };

  // Handle Pick 3: Subkomponen
  const handleSelectSubkomponen = (subkKode: string) => {
    setSelectedSubkomponen(subkKode);
    setSelectedAkun("");
    setSelectedItemSuffixes([]);
  };

  // Helper to get subkomponen prefix (e.g. "051.A", "052.B", "001.A")
  const getSubkPrefix = (subkKode: string) => {
    if (!subkKode) return "051.A";
    const subkObj = subkomponenList.find((s) => s.kode === subkKode);
    const komp = subkKode.split(".")[0] || "051";
    const letter = subkObj?.letter || subkKode.split(".")[1]?.replace(/^0/, "") || "A";
    return `${komp}.${letter}`;
  };

  // Handle Pick 4: Akun
  const handleSelectAkun = (akKode: string) => {
    setSelectedAkun(akKode);

    // Auto calculate klasifikasiMak: <Kegiatan>.<RO>.<Akun>
    // e.g. 7269.CBK.001.533121 or 7273.REA.003.524111
    const newKlasifikasi = `${selectedKegiatan}.${selectedRo}.${akKode}`;
    const subkPrefix = getSubkPrefix(selectedSubkomponen);

    // Get available items for this akun
    const items = getDipaItemsByAkun(selectedKegiatan, selectedRo, selectedSubkomponen, akKode);
    const initialSuffixes = items.length > 0 ? [padSuffix(items[0].suffix)] : ["770"];
    setSelectedItemSuffixes(initialSuffixes);

    const newKodeMak = `${subkPrefix}.${initialSuffixes.join(".")}`;
    const akunName = getDipaAkunName(akKode);

    // Otomatis susun Uraian Belanja SPTJB DIPA:
    // Bagian depan nama Akun resmi (misal: "Belanja Perjalanan Dinas Biasa"), setelahnya rincian perjalanan dinas sesuai ST.
    let newUraian: string | undefined = undefined;
    if (travel?.origin && travel?.destination) {
      newUraian = buildDefaultSptjbUraian(
        travel,
        recipientCount || 1,
        dipaConfig.maksudTujuan || activityName || "",
        akKode
      );
    } else if (dipaConfig.uraianSptjb) {
      // Jika sudah ada uraian, ganti bagian depan (nama akun) dengan nama akun yang baru dipilih
      newUraian = dipaConfig.uraianSptjb.replace(
        /^[^,]+,\s*(Perjalanan Dinas)/i,
        `${akunName}, $1`
      );
    }

    // Update dipaConfig dengan kode resmi dan uraian otomatis
    setDipaConfig((prev) => ({
      ...prev,
      klasifikasiMak: newKlasifikasi,
      kodeMak: newKodeMak,
      makDescription: "",
      akun: akKode,
      ...(newUraian ? { uraianSptjb: newUraian } : {}),
    }));

    toast.success(`Klasifikasi DIPA disusun: ${newKlasifikasi} (${newKodeMak})`);
  };

  // Handle Pick 5: Toggle Item Suffix (MULTI-SELECT)
  const handleToggleItem = (suffix: string) => {
    const padded = padSuffix(suffix);
    let newSuffixes: string[];
    if (selectedItemSuffixes.includes(padded)) {
      newSuffixes = selectedItemSuffixes.filter((s) => s !== padded);
    } else {
      newSuffixes = [...selectedItemSuffixes, padded];
    }

    // Urutkan sesuai urutan item asli
    const orderedSuffixes = itemsList
      .map((it) => padSuffix(it.suffix))
      .filter((s) => newSuffixes.includes(s));

    setSelectedItemSuffixes(orderedSuffixes);

    const subkPrefix = getSubkPrefix(selectedSubkomponen);
    const newKodeMak =
      orderedSuffixes.length > 0
        ? `${subkPrefix}.${orderedSuffixes.join(".")}`
        : subkPrefix;

    setDipaConfig((prev) => ({
      ...prev,
      kodeMak: newKodeMak,
      makDescription: "", // Kosongkan keterangan teks
    }));
  };

  // Pilih Semua Item
  const handleSelectAllItems = () => {
    const allSuffixes = itemsList.map((it) => padSuffix(it.suffix));
    setSelectedItemSuffixes(allSuffixes);

    const subkPrefix = getSubkPrefix(selectedSubkomponen);
    const newKodeMak = `${subkPrefix}.${allSuffixes.join(".")}`;
    setDipaConfig((prev) => ({
      ...prev,
      kodeMak: newKodeMak,
      makDescription: "",
    }));
  };

  // Reset Pilihan Item
  const handleResetItems = () => {
    setSelectedItemSuffixes([]);
    const subkPrefix = getSubkPrefix(selectedSubkomponen);

    setDipaConfig((prev) => ({
      ...prev,
      kodeMak: subkPrefix,
      makDescription: "",
    }));
  };

  return (
    <div className={`rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/60 to-white dark:from-slate-900/90 dark:to-slate-950 p-4 sm:p-5 shadow-xs ${className}`}>
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              4. Klasifikasi Anggaran DIPA (Dropdown Berjenjang)
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-amber-400 text-amber-800 bg-amber-100/50 dark:text-amber-300">
              Laporan FA Detail 2026
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Pilih bertahap: <strong>Kegiatan</strong> ➔ <strong>RO</strong> ➔ <strong>Subkomponen</strong> ➔ <strong>Akun</strong>. Kode resmi otomatis muncul di SPTB tanpa teks berlebih.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsManualEdit((prev) => !prev)}
            className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 gap-1 rounded-lg px-2"
          >
            <Edit3 className="h-3 w-3" />
            <span>{isManualEdit ? "Tutup Edit Manual" : "Edit Manual Kode"}</span>
          </Button>
        </div>
      </div>

      {/* CASCADING DROPDOWNS GRID (PICK -> PICK -> PICK) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5">
        {/* 1. DROPDOWN KEGIATAN (7269 S/D SELESAI) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white font-bold">1</span>
            Kegiatan DIPA
          </label>
          <select
            value={selectedKegiatan}
            onChange={(e) => handleSelectKegiatan(e.target.value)}
            className="w-full h-10 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="">-- Pilih Kegiatan --</option>
            {kegiatanList.map((k) => (
              <option key={k.kode} value={k.kode}>
                {k.kode} — {k.nama}
              </option>
            ))}
          </select>
        </div>

        {/* 2. DROPDOWN KRO / RO */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white font-bold">2</span>
            KRO & SubOutput (RO)
          </label>
          <select
            disabled={!selectedKegiatan || roList.length === 0}
            value={selectedRo}
            onChange={(e) => handleSelectRo(e.target.value)}
            className={`w-full h-10 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition ${
              !selectedKegiatan ? "bg-slate-100 text-slate-400 dark:bg-slate-900 cursor-not-allowed" : "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            }`}
          >
            <option value="">
              {!selectedKegiatan ? "(Pilih Kegiatan Terlebih Dahulu)" : "-- Pilih KRO / RO --"}
            </option>
            {roList.map((ro) => (
              <option key={ro.kode} value={ro.kode}>
                {ro.kode} — {ro.nama}
              </option>
            ))}
          </select>
        </div>

        {/* 3. DROPDOWN SUBKOMPONEN */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white font-bold">3</span>
            Subkomponen Kegiatan
          </label>
          <select
            disabled={!selectedRo || subkomponenList.length === 0}
            value={selectedSubkomponen}
            onChange={(e) => handleSelectSubkomponen(e.target.value)}
            className={`w-full h-10 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition ${
              !selectedRo ? "bg-slate-100 text-slate-400 dark:bg-slate-900 cursor-not-allowed" : "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            }`}
          >
            <option value="">
              {!selectedRo ? "(Pilih RO Terlebih Dahulu)" : "-- Pilih Subkomponen --"}
            </option>
            {subkomponenList.map((subk) => (
              <option key={subk.kode} value={subk.kode}>
                {subk.kode} — {subk.nama}
              </option>
            ))}
          </select>
        </div>

        {/* 4. DROPDOWN AKUN */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white font-bold">4</span>
            Akun Belanja
          </label>
          <select
            disabled={!selectedSubkomponen || akunList.length === 0}
            value={selectedAkun}
            onChange={(e) => handleSelectAkun(e.target.value)}
            className={`w-full h-10 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition ${
              !selectedSubkomponen ? "bg-slate-100 text-slate-400 dark:bg-slate-900 cursor-not-allowed" : "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            }`}
          >
            <option value="">
              {!selectedSubkomponen ? "(Pilih Subkomponen Dulu)" : "-- Pilih Akun --"}
            </option>
            {akunList.map((ak) => (
              <option key={ak.kode} value={ak.kode}>
                {ak.kode} — {ak.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. ITEM DETAIL SELECTOR (MULTI-SELECT: BISA PILIH LEBIH DARI 1) */}
      {itemsList.length > 0 && selectedAkun && (
        <div className="mt-3.5 pt-3.5 border-t border-amber-200/60 dark:border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">5</span>
              Pilih Item Detail MAK (Bisa pilih lebih dari 1 item):
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllItems}
                className="text-[10px] font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400 underline"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleResetItems}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 underline"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {itemsList.map((it) => {
              const padded = padSuffix(it.suffix);
              const isChecked = selectedItemSuffixes.includes(padded);
              return (
                <button
                  key={it.kode}
                  type="button"
                  onClick={() => handleToggleItem(padded)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-2 border ${
                    isChecked
                      ? "border-blue-600 bg-blue-600 text-white font-bold shadow-xs ring-2 ring-blue-500/20"
                      : "border-slate-300 bg-white hover:border-blue-400 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 shadow-2xs"
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-md text-[10px] font-bold ${
                    isChecked ? "bg-white text-blue-600" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}>
                    {isChecked ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </span>
                  <span className="font-mono font-bold">{padded}</span>
                  <span className="text-[11px] font-normal opacity-90 line-clamp-1">{it.nama}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* OUTPUT RESULT BANNER (KODE MURNI YANG MUNCUL DI SPTB TANPA TEKS BERLEBIH) */}
      <div className="mt-4 p-3 rounded-xl bg-white dark:bg-slate-950 border border-amber-300/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Hasil Format Cetak Resmi di SPTB / SPTJB:
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Baris 1 (Klasifikasi):</span>
              <Badge className="font-mono text-xs font-bold bg-amber-600 text-white">
                {dipaConfig.klasifikasiMak || DEFAULT_DIPA_KLASIFIKASI_MAK}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Baris 2 (Item):</span>
              <Badge className="font-mono text-xs font-bold bg-blue-600 text-white">
                {dipaConfig.kodeMak || effectiveKodeMak}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium shrink-0">
          <CheckCircle2 className="h-4 w-4" />
          <span>Format Bersih Siap Cetak</span>
        </div>
      </div>

      {/* MANUAL EDIT MODE (OPTIONAL OVERRIDE) */}
      {isManualEdit && (
        <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Edit Manual Baris 1: Klasifikasi Anggaran
            </label>
            <Input
              value={dipaConfig.klasifikasiMak || ""}
              onChange={(e) => setDipaConfig((prev) => ({ ...prev, klasifikasiMak: e.target.value }))}
              placeholder={DEFAULT_DIPA_KLASIFIKASI_MAK}
              className="mt-1 font-mono text-xs font-semibold bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Edit Manual Baris 2: Subkomponen / Item MAK
            </label>
            <Input
              value={dipaConfig.kodeMak || ""}
              onChange={(e) => setDipaConfig((prev) => ({ ...prev, kodeMak: e.target.value }))}
              placeholder={effectiveKodeMak}
              className="mt-1 font-mono text-xs font-semibold bg-white dark:bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  );
}
