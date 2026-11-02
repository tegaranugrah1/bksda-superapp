"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Users, Building2, User, Search, Check, Plus, Loader2, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { SuratMasuk } from "../../_lib/surat-types";
import { SIFAT_OPTIONS } from "../../_lib/surat-types";
import { getSifatBadgeStyle } from "./SifatCellPopover";

interface DiteruskanCellPopoverProps {
  item: SuratMasuk;
  onUpdated?: (updatedItem: SuratMasuk) => void;
}

interface LocationItem {
  id: string;
  name: string;
  unit_kerja?: string;
}

interface EmployeeItem {
  id: number | string;
  nama_lengkap: string;
  jabatan?: string;
  satuan_kerja?: string;
}

// Filter out legacy print template items (e.g. "1. Ka Sub Bag TU") so default is clean/empty
function sanitizeRecipients(list?: string[] | null): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((r) => !/^\d+\.\s+/.test(r.trim()));
}

export function DiteruskanCellPopover({ item, onUpdated }: DiteruskanCellPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ruang" | "pegawai">("ruang");
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Cached master data
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  // Selected recipient labels (e.g. ["Ruang Teknis", "M. Ari Wibawanto, S.Hut., M.Sc."])
  const [selectedList, setSelectedList] = useState<string[]>(() => {
    return sanitizeRecipients(item.disposisi?.diteruskan_json);
  });

  // Selected Sifat: Strictly SINGLE SELECT (Hanya 1 Sifat yang Dipilih)
  const [selectedSifat, setSelectedSifat] = useState<string>(() => {
    return Array.isArray(item.sifat_json) && item.sifat_json.length > 0 ? item.sifat_json[0] : "Penting";
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync when prop item updates
  useEffect(() => {
    setSelectedList(sanitizeRecipients(item.disposisi?.diteruskan_json));
  }, [item.disposisi?.diteruskan_json]);

  useEffect(() => {
    if (Array.isArray(item.sifat_json) && item.sifat_json.length > 0) {
      setSelectedSifat(item.sifat_json[0]);
    }
  }, [item.sifat_json]);

  // Load locations & employees when popover is opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadMasterData() {
      setIsLoadingData(true);
      try {
        const [locRes, empRes] = await Promise.all([
          api.get("/bmn/locations").catch(() => ({ data: { data: [] } })),
          api.get("/kepegawaian/employees/select?limit=200").catch(() => ({ data: { data: [] } })),
        ]);

        if (!isMounted) return;

        const locData = locRes.data?.data || locRes.data || [];
        const empData = empRes.data?.data || empRes.data || [];

        // Filter locations belonging to Balai KSDA Kalimantan Timur
        const balaiLocs = Array.isArray(locData)
          ? locData.filter((l: any) =>
              (l.unit_kerja || "").toLowerCase().includes("balai")
            )
          : [];

        // Filter employees belonging to Balai KSDA Kalimantan Timur
        const balaiEmps = Array.isArray(empData)
          ? empData.filter((e: any) =>
              (e.satuan_kerja || "").toLowerCase().includes("balai")
            )
          : [];

        setLocations(balaiLocs.length > 0 ? balaiLocs : locData);
        setEmployees(balaiEmps.length > 0 ? balaiEmps : empData);
      } catch (err) {
        console.error("Failed to load master data for diteruskan popover", err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    }

    loadMasterData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleRecipient = (recipientName: string) => {
    setSelectedList((prev) => {
      if (prev.includes(recipientName)) {
        return prev.filter((r) => r !== recipientName);
      } else {
        return [...prev, recipientName];
      }
    });
  };

  const selectSifat = (sifatName: string) => {
    setSelectedSifat(sifatName); // Strictly single-select
  };

  const filteredLocations = useMemo(() => {
    const q = search.toLowerCase();
    return locations.filter((loc) => (loc.name || "").toLowerCase().includes(q));
  }, [locations, search]);

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(
      (emp) =>
        (emp.nama_lengkap || "").toLowerCase().includes(q) ||
        (emp.jabatan || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        no_agenda: item.no_agenda,
        no_surat: item.no_surat,
        tanggal_agenda: item.tanggal_agenda,
        sifat_json: [selectedSifat],
        disposisi: {
          diteruskan_json: selectedList,
          catatan: item.disposisi?.catatan || item.catatan || "",
        },
      };

      let resData = item;
      if (item.id) {
        const res = await api.put(`/api/surat-masuk/${item.id}`, payload);
        if (res.data?.data) {
          resData = res.data.data;
        }
      }

      // Update local storage cache
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("bksda_saved_surat_masuk");
          if (saved) {
            const list: SuratMasuk[] = JSON.parse(saved);
            const updated = list.map((s) => {
              if (s.id === item.id || (s.no_agenda && s.no_agenda === item.no_agenda)) {
                return {
                  ...s,
                  sifat_json: [selectedSifat],
                  disposisi: {
                    ...s.disposisi,
                    diteruskan_json: selectedList,
                  },
                };
              }
              return s;
            });
            localStorage.setItem("bksda_saved_surat_masuk", JSON.stringify(updated));
          }
        } catch (e) {}
      }

      toast.success("Arahan pimpinan (Sifat & Penerus) berhasil disimpan.");
      setIsOpen(false);
      if (onUpdated) {
        onUpdated({
          ...resData,
          sifat_json: [selectedSifat],
          disposisi: {
            ...resData.disposisi,
            diteruskan_json: selectedList,
          },
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan arahan pimpinan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Trigger: Empty Button or Badges */}
      {selectedList.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-7 px-2.5 text-[11px] font-medium border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:text-zinc-400 dark:hover:text-emerald-300 rounded-lg flex items-center gap-1 transition-all"
        >
          <Plus className="h-3 w-3 text-emerald-600" />
          <span>+ Pilih Penerus</span>
        </Button>
      ) : (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer flex flex-wrap items-center gap-1 max-w-[200px] hover:opacity-85 transition-opacity"
          title="Klik untuk mengubah arahan pimpinan"
        >
          {selectedList.slice(0, 2).map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60 truncate max-w-[150px]"
            >
              {name.includes("Ruang") || name.includes("Urusan") || name.includes("Kantor") ? (
                <Building2 className="h-2.5 w-2.5 shrink-0 text-sky-600 dark:text-sky-400" />
              ) : (
                <User className="h-2.5 w-2.5 shrink-0 text-sky-600 dark:text-sky-400" />
              )}
              <span className="truncate">{name}</span>
            </span>
          ))}

          {selectedList.length > 2 && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300">
              +{selectedList.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Arahan Pimpinan (Sifat & Penerus Balai)
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Sifat Surat Selector: Single Select (Pilih 1 Saja) */}
          <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Tag className="h-3 w-3 text-emerald-600" />
                Sifat Surat (Pilih 1 Sifat):
              </label>
              <span className="text-[10px] text-zinc-400 font-normal">Pilih salah satu</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {SIFAT_OPTIONS.map((sifat) => {
                const isSelected = selectedSifat === sifat;
                return (
                  <button
                    key={sifat}
                    type="button"
                    onClick={() => selectSifat(sifat)}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold transition-all border ${
                      isSelected
                        ? getSifatBadgeStyle(sifat)
                        : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                    }`}
                  >
                    {isSelected && <Check className="inline h-2.5 w-2.5 mr-0.5 stroke-[3]" />}
                    {sifat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ruangan atau nama pegawai balai..."
              className="pl-8 h-8 text-xs border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Tabs Switcher: Ruangan vs Pegawai */}
          <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-900 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("ruang")}
              className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "ruang"
                  ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Ruangan Balai ({filteredLocations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pegawai")}
              className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "pegawai"
                  ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Pegawai Balai ({filteredEmployees.length})
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs">
            {isLoadingData ? (
              <div className="py-6 text-center text-zinc-400 flex flex-col items-center justify-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span className="text-[11px]">Memuat data balai...</span>
              </div>
            ) : activeTab === "ruang" ? (
              filteredLocations.length === 0 ? (
                <div className="py-4 text-center text-zinc-400 text-[11px]">
                  Tidak ada data ruangan balai yang cocok.
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isChecked = selectedList.includes(loc.name);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => toggleRecipient(loc.name)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                        isChecked
                          ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-medium"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-transparent text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className={`h-3.5 w-3.5 shrink-0 ${isChecked ? "text-emerald-600" : "text-zinc-400"}`} />
                        <span>{loc.name}</span>
                      </div>
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                          isChecked
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              filteredEmployees.length === 0 ? (
                <div className="py-4 text-center text-zinc-400 text-[11px]">
                  Tidak ada data pegawai balai yang cocok.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isChecked = selectedList.includes(emp.nama_lengkap);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleRecipient(emp.nama_lengkap)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                        isChecked
                          ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-medium"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-transparent text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <User className={`h-3.5 w-3.5 shrink-0 ${isChecked ? "text-emerald-600" : "text-zinc-400"}`} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{emp.nama_lengkap}</p>
                          {emp.jabatan && (
                            <p className="text-[10px] text-zinc-400 truncate">{emp.jabatan}</p>
                          )}
                        </div>
                      </div>
                      <div
                        className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-colors ${
                          isChecked
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-medium">
              {selectedList.length} penerus dipilih
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 px-2 text-xs text-zinc-600 dark:text-zinc-400"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-7 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
