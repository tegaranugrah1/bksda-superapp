"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Layers,
  Package,
  Search,
  Shield,
  Sparkles,
  TreePine,
  Users,
  Compass,
} from "lucide-react";
import {
  DIPA_FA_DETAIL_ENTRIES,
  DipaBudgetEntry,
  searchDipaFaEntries,
} from "./dipa-fa-detail-data";

interface DipaBudgetSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentKlasifikasi?: string;
  currentKodeMak?: string;
  hasUangHarian?: boolean;
  hasPenginapan?: boolean;
  hasTransport?: boolean;
  onSelect: (selected: {
    klasifikasiMak: string;
    kodeMak: string;
    makDescription: string;
    subkomponenNama: string;
    entry: DipaBudgetEntry;
  }) => void;
}

export function DipaBudgetSelectorModal({
  open,
  onOpenChange,
  currentKlasifikasi,
  currentKodeMak,
  hasUangHarian = true,
  hasPenginapan = false,
  hasTransport = false,
  onSelect,
}: DipaBudgetSelectorModalProps) {
  const [mode, setMode] = useState<"search" | "cascade">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");

  // Cascading dropdown states
  const [cascadeKegiatan, setCascadeKegiatan] = useState<string>("");
  const [cascadeRo, setCascadeRo] = useState<string>("");
  const [cascadeSubkomponen, setCascadeSubkomponen] = useState<string>("");

  // Categories for filter pills
  const categories = [
    { key: "semua", label: "Semua Anggaran", icon: Layers },
    { key: "kebakaran", label: "🔥 Kebakaran / Karhutla", icon: Flame },
    { key: "bmn", label: "📦 BMN & Dukman", icon: Package },
    { key: "satwa", label: "🦁 Satwa / TSL", icon: Compass },
    { key: "patroli", label: "🛡️ Patroli Kawasan", icon: Shield },
    { key: "pemulihan", label: "🌱 Pemulihan Ekosistem", icon: TreePine },
    { key: "masyarakat", label: "👥 Pemberdayaan", icon: Users },
  ];

  // Filtered entries for search mode
  const filteredEntries = useMemo(() => {
    return searchDipaFaEntries(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Hierarchical lists for cascading mode
  const kegiatanList = useMemo(() => {
    const map = new Map<string, string>();
    DIPA_FA_DETAIL_ENTRIES.forEach((e) => {
      map.set(e.kegiatanKode, e.kegiatanNama);
    });
    return Array.from(map.entries()).map(([kode, nama]) => ({ kode, nama }));
  }, []);

  const roList = useMemo(() => {
    if (!cascadeKegiatan) return [];
    const map = new Map<string, { kode: string; nama: string; kroKode: string }>();
    DIPA_FA_DETAIL_ENTRIES.filter((e) => e.kegiatanKode === cascadeKegiatan).forEach((e) => {
      map.set(`${e.kroKode}.${e.roKode}`, {
        kode: `${e.kroKode}.${e.roKode}`,
        nama: e.roNama,
        kroKode: e.kroKode,
      });
    });
    return Array.from(map.values());
  }, [cascadeKegiatan]);

  const subkomponenList = useMemo(() => {
    if (!cascadeKegiatan || !cascadeRo) return [];
    return DIPA_FA_DETAIL_ENTRIES.filter((e) => {
      const matchKegiatan = e.kegiatanKode === cascadeKegiatan;
      const matchRo = `${e.kroKode}.${e.roKode}` === cascadeRo;
      return matchKegiatan && matchRo;
    });
  }, [cascadeKegiatan, cascadeRo]);

  // Helper to compute dynamic kodeMak for an entry based on active expense types
  const computeEntryKodeMak = (entry: DipaBudgetEntry) => {
    const uhItem = entry.items.find((it) => it.kategori === "uang_harian");
    const pengItem = entry.items.find((it) => it.kategori === "penginapan");
    const transItem = entry.items.find((it) => it.kategori === "transport");

    const parts: string[] = [];
    const descParts: string[] = [];

    if (hasUangHarian && uhItem) {
      parts.push(uhItem.suffix);
      descParts.push("Uang Harian");
    }
    if (hasPenginapan && pengItem) {
      parts.push(pengItem.suffix);
      descParts.push("Penginapan");
    }
    if (hasTransport && transItem) {
      parts.push(transItem.suffix);
      descParts.push("Transportasi");
    }

    if (parts.length === 0) {
      // Fallback ke item pertama atau default
      const firstItem = entry.items[0];
      const suffix = firstItem ? firstItem.suffix : "770";
      return {
        kodeMak: `${entry.makPrefix}.${suffix}`,
        description: firstItem ? firstItem.nama : "Uang Harian",
      };
    }

    return {
      kodeMak: `${entry.makPrefix}.${parts.join(".")}`,
      description: descParts.join(", "),
    };
  };

  const handleSelectEntry = (entry: DipaBudgetEntry) => {
    const computed = computeEntryKodeMak(entry);
    onSelect({
      klasifikasiMak: entry.klasifikasiMak,
      kodeMak: computed.kodeMak,
      makDescription: computed.description,
      subkomponenNama: entry.subkomponenNama,
      entry,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* HEADER */}
        <DialogHeader className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-amber-50/50 to-emerald-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Katalog Klasifikasi Anggaran DIPA
                  <Badge variant="outline" className="text-[10px] border-amber-400 bg-amber-100/50 text-amber-800 dark:text-amber-300">
                    Laporan FA Detail 2026
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Pilih kegiatan untuk mengisi otomatis kode MAK (contoh: <code>7273.REA.003.524111</code> / <code>051.E.770</code>)
                </DialogDescription>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="hidden sm:flex items-center rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setMode("search")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  mode === "search"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Pencarian Cepat
              </button>
              <button
                type="button"
                onClick={() => setMode("cascade")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  mode === "cascade"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Pilih Berjenjang
              </button>
            </div>
          </div>

          {/* SEARCH BAR (in Search Mode) */}
          {mode === "search" && (
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama kegiatan atau kode MAK (contoh: kebakaran, karhutla, 7273, bmn, patroli)..."
                  className="pl-10 h-11 rounded-xl text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-xs focus-visible:ring-amber-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* FILTER PILLS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                        isSelected
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogHeader>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {mode === "search" ? (
            /* SEARCH RESULTS */
            filteredEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-sm">Tidak ditemukan kegiatan dengan kata kunci &quot;{searchQuery}&quot;</p>
                <p className="text-xs text-slate-500 mt-1">Coba gunakan kata kunci lain seperti: <i>kebakaran, 7273, bmn, patroli, satwa</i></p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Ditemukan <strong>{filteredEntries.length}</strong> mata anggaran DIPA:</span>
                  <span className="text-[11px]">Klik kartu untuk menerapkan ke formulir</span>
                </div>

                {filteredEntries.map((entry) => {
                  const isCurrentlyActive = currentKlasifikasi === entry.klasifikasiMak;
                  const computed = computeEntryKodeMak(entry);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleSelectEntry(entry)}
                      className={`group relative rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer ${
                        isCurrentlyActive
                          ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm ring-1 ring-amber-500"
                          : "border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          {/* BADGES HIERARCHY */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-[10px] font-bold border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              {entry.klasifikasiMak}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-[10px] font-bold border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              MAK: {computed.kodeMak}
                            </Badge>
                            <span className="text-[10px] text-slate-400">
                              Kegiatan {entry.kegiatanKode} • {entry.kroKode}.{entry.roKode} • Komp {entry.subkomponenKode}
                            </span>
                          </div>

                          {/* SUBKOMPONEN / TITLE */}
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-300 transition">
                            {entry.subkomponenNama}
                          </h4>

                          {/* PARENT CONTEXT */}
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {entry.kegiatanNama} ➔ {entry.roNama}
                          </p>

                          {/* ITEMS BREAKDOWN */}
                          <div className="flex flex-wrap items-center gap-1 pt-1.5">
                            <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Item Biaya:</span>
                            {entry.items.map((it) => (
                              <span
                                key={it.kode}
                                className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                                title={it.nama}
                              >
                                <strong className="mr-1 text-amber-700 dark:text-amber-400">{it.suffix}</strong> {it.nama}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* ACTION BUTTON */}
                        <div className="shrink-0 flex items-center sm:self-center">
                          <Button
                            size="sm"
                            type="button"
                            className={`rounded-xl text-xs font-semibold transition ${
                              isCurrentlyActive
                                ? "bg-amber-600 text-white hover:bg-amber-700"
                                : "bg-slate-100 text-slate-700 hover:bg-amber-500 hover:text-white dark:bg-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {isCurrentlyActive ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" /> Terpilih
                              </>
                            ) : (
                              <>
                                Terapkan <ChevronRight className="h-3.5 w-3.5 ml-1" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* CASCADE MODE */
            <div className="space-y-5 p-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                Pilih bertahap mulai dari <strong>Kegiatan</strong> ➔ <strong>KRO/RO</strong> ➔ <strong>Subkomponen</strong> untuk menyusun kode MAK yang presisi.
              </div>

              {/* 1. KEGIATAN */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Langkah 1: Pilih Kegiatan
                </label>
                <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
                  {kegiatanList.map((k) => (
                    <button
                      key={k.kode}
                      type="button"
                      onClick={() => {
                        setCascadeKegiatan(k.kode);
                        setCascadeRo("");
                        setCascadeSubkomponen("");
                      }}
                      className={`text-left p-3 rounded-xl border text-xs transition ${
                        cascadeKegiatan === k.kode
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 font-bold ring-1 ring-amber-500"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <span className="font-mono text-amber-700 dark:text-amber-400 font-bold block">
                        Kegiatan {k.kode}
                      </span>
                      <span className="line-clamp-2 mt-0.5">{k.nama}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. RO */}
              {cascadeKegiatan && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Langkah 2: Pilih KRO / SubOutput (RO)
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
                    {roList.map((ro) => (
                      <button
                        key={ro.kode}
                        type="button"
                        onClick={() => {
                          setCascadeRo(ro.kode);
                          setCascadeSubkomponen("");
                        }}
                        className={`text-left p-3 rounded-xl border text-xs transition ${
                          cascadeRo === ro.kode
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 font-bold ring-1 ring-amber-500"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <span className="font-mono text-amber-700 dark:text-amber-400 font-bold block">
                          RO: {ro.kode}
                        </span>
                        <span className="line-clamp-2 mt-0.5">{ro.nama}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. SUBKOMPONEN & AKUN */}
              {cascadeRo && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Langkah 3: Pilih Subkomponen & Akun Perjalanan Dinas
                  </label>
                  <div className="space-y-2 mt-1.5">
                    {subkomponenList.map((entry) => {
                      const computed = computeEntryKodeMak(entry);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className="font-mono text-[10px] bg-amber-600">
                                {entry.klasifikasiMak}
                              </Badge>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {computed.kodeMak}
                              </Badge>
                            </div>
                            <p className="text-xs font-bold mt-1 text-slate-900 dark:text-white">
                              {entry.subkomponenNama}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => handleSelectEntry(entry)}
                            className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs ml-4"
                          >
                            Pilih Ini
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>
              Kode MAK saat ini: <strong className="font-mono text-slate-800 dark:text-slate-200">{currentKlasifikasi || "7273.REA.003.524111"}</strong>
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
