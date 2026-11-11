"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Building2, User, Search, Check, Plus, Loader2, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useKepegawaianTabs } from "@/app/kepegawaian/_lib/useKepegawaianTabs";
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

function sanitizeRecipients(list?: string[] | null): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((r) => !/^\d+\.\s+/.test(r.trim()));
}

const DEFAULT_BALAI_ROOMS = [
  { id: "def-1", name: "Ka Sub Bag TU", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-2", name: "Urusan Umum dan Perlengkapan", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-3", name: "Urusan Kepegawaian", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-4", name: "Urusan Program dan Perencanaan", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-5", name: "Urusan Keuangan", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-6", name: "Urusan Evlab dan Humas", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-7", name: "Urusan Teknis", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-8", name: "Urusan Perlindungan", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-9", name: "Urusan IKN", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
  { id: "def-10", name: "PPK FOLU NC 2030", unit_kerja: "Kantor Balai KSDA Kalimantan Timur" },
];

export function DiteruskanCellPopover({ item, onUpdated }: DiteruskanCellPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ruang" | "pegawai">("ruang");
  const tabs = useKepegawaianTabs(activeTab, "Kategori penerus disposisi");
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  const [selectedList, setSelectedList] = useState<string[]>(() => {
    return sanitizeRecipients(item.disposisi?.diteruskan_json);
  });

  const [selectedSifat, setSelectedSifat] = useState<string>(() => {
    return Array.isArray(item.sifat_json) && item.sifat_json.length > 0 ? item.sifat_json[0] : "Penting";
  });

  useEffect(() => {
    setSelectedList(sanitizeRecipients(item.disposisi?.diteruskan_json));
  }, [item.disposisi?.diteruskan_json]);

  useEffect(() => {
    if (Array.isArray(item.sifat_json) && item.sifat_json.length > 0) {
      setSelectedSifat(item.sifat_json[0]);
    }
  }, [item.sifat_json]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadMasterData() {
      setIsLoadingData(true);
      try {
        const [locRes, empRes] = await Promise.all([
          api
            .get("/surat-masuk/locations")
            .catch(() => api.get("/bmn/locations"))
            .catch(() => ({ data: { data: DEFAULT_BALAI_ROOMS } })),
          api.get("/kepegawaian/employees/select?limit=200").catch(() => ({ data: { data: [] } })),
        ]);

        if (!isMounted) return;

        let locData = locRes.data?.data || locRes.data || [];
        if (!Array.isArray(locData) || locData.length === 0) {
          locData = DEFAULT_BALAI_ROOMS;
        }

        const empData = empRes.data?.data || empRes.data || [];

        const balaiLocs = Array.isArray(locData)
          ? locData.filter((l: any) =>
              (l.unit_kerja || "").toLowerCase().includes("balai")
            )
          : [];

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
    setSelectedSifat(sifatName);
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
        tanggal_surat: item.tanggal_surat,
        tanggal_penyelesaian: item.tanggal_penyelesaian,
        indeks: item.indeks,
        kode: item.kode,
        referensi: item.referensi,
        asal_surat: item.asal_surat,
        isi_ringkas: item.isi_ringkas,
        lampiran: item.lampiran,
        catatan: item.catatan,
        sifat_json: [selectedSifat],
        disposisi: {
          ...(item.disposisi || {}),
          diteruskan_json: selectedList,
          catatan: item.disposisi?.catatan || "",
        },
      };

      let resData = item;
      if (item.id) {
        const res = await api.put(`/surat-masuk/${item.id}`, payload);
        if (res.data?.data) {
          resData = res.data.data;
        }
      }

      if (typeof window !== "undefined") {
        try {
          const rawLocal = localStorage.getItem("bksda_saved_surat_masuk");
          if (rawLocal) {
            const list = JSON.parse(rawLocal);
            const updated = list.map((s: SuratMasuk) => {
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
        } catch {}
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {selectedList.length === 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="kpg-secondary h-8 px-2.5 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3 text-[var(--ds-accent-fg)]" />
            <span>Pilih Penerus</span>
          </Button>
        ) : (
          <button
            type="button"
            className="cursor-pointer flex flex-wrap items-center gap-1 max-w-[190px] hover:opacity-85 transition-opacity text-left bg-transparent border-none p-1 rounded-lg"
            title="Klik untuk mengubah arahan pimpinan"
          >
            {selectedList.slice(0, 2).map((name) => (
              <span
                key={name}
                data-status="info"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold truncate max-w-[140px]"
              >
                {name.includes("Ruang") || name.includes("Urusan") || name.includes("Kantor") ? (
                  <Building2 className="h-3 w-3 shrink-0" />
                ) : (
                  <User className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{name}</span>
              </span>
            ))}

            {selectedList.length > 2 && (
              <span data-status="neutral" className="px-1.5 py-0.5 rounded-md text-xs font-bold">
                +{selectedList.length - 2}
              </span>
            )}
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        data-module="persuratan"
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="psr-ui w-80 sm:w-96 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-2xl z-50 p-3.5 space-y-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--ds-border-subtle)]">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[var(--ds-accent-fg)]" />
            <h4 className="text-xs font-bold text-[var(--ds-fg)]">
              Arahan Pimpinan (Sifat &amp; Penerus Balai)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup arahan pimpinan"
            className="p-1.5 rounded-md text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sifat Surat Selector: Single Select */}
        <div className="space-y-1.5 bg-[var(--ds-surface-muted)] p-2.5 rounded-xl border border-[var(--ds-border-subtle)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--ds-fg-secondary)] flex items-center gap-1">
              <Tag className="h-3 w-3 text-[var(--ds-accent-fg)]" />
              Sifat Surat (Pilih 1 Sifat):
            </label>
            <span className="text-xs text-[var(--ds-fg-muted)] font-normal">Pilih salah satu</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {SIFAT_OPTIONS.map((sifat) => {
              const isSelected = selectedSifat === sifat;
              return (
                <button
                  key={sifat}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => selectSifat(sifat)}
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    isSelected
                      ? getSifatBadgeStyle(sifat)
                      : "bg-[var(--ds-surface)] text-[var(--ds-fg-secondary)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-accent-soft)]"
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
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--ds-fg-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ruangan atau nama pegawai balai..."
            aria-label="Cari ruangan atau nama pegawai balai"
            className="pl-8 h-9 text-xs"
          />
        </div>

        {/* Tabs Switcher: Ruangan vs Pegawai */}
        <div {...tabs.tabListProps} className="flex rounded-lg bg-[var(--ds-surface-muted)] p-1 text-xs font-semibold">
          <button
            type="button"
            {...tabs.tabProps("ruang")}
            onClick={() => setActiveTab("ruang")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "ruang"
                ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] font-bold"
                : "text-[var(--ds-fg-secondary)] hover:text-[var(--ds-fg)]"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Ruangan Balai ({filteredLocations.length})</span>
          </button>
          <button
            type="button"
            {...tabs.tabProps("pegawai")}
            onClick={() => setActiveTab("pegawai")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "pegawai"
                ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] font-bold"
                : "text-[var(--ds-fg-secondary)] hover:text-[var(--ds-fg)]"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Pegawai Balai ({filteredEmployees.length})</span>
          </button>
        </div>

        {/* Options List */}
        <div {...tabs.panelProps} className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs">
          {isLoadingData ? (
            <div className="py-6 text-center text-[var(--ds-fg-muted)] flex flex-col items-center justify-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--ds-accent-fg)]" />
              <span className="text-xs">Memuat data balai...</span>
            </div>
          ) : activeTab === "ruang" ? (
            filteredLocations.length === 0 ? (
              <div className="py-4 text-center text-[var(--ds-fg-muted)] text-xs">
                Tidak ada data ruangan balai yang cocok.
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isChecked = selectedList.includes(loc.name);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => toggleRecipient(loc.name)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border text-left ${
                      isChecked
                        ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] font-semibold"
                        : "hover:bg-[var(--ds-surface-muted)] border-transparent text-[var(--ds-fg-secondary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className={`h-3.5 w-3.5 shrink-0 ${isChecked ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)]"}`} />
                      <span>{loc.name}</span>
                    </div>
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked
                          ? "bg-[var(--ds-accent-solid)] border-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                          : "border-[var(--ds-border-control)] bg-[var(--ds-surface)]"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )
          ) : filteredEmployees.length === 0 ? (
            <div className="py-4 text-center text-[var(--ds-fg-muted)] text-xs">
              Tidak ada data pegawai balai yang cocok.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isChecked = selectedList.includes(emp.nama_lengkap);
              return (
                <button
                  key={emp.id}
                  type="button"
                  aria-pressed={isChecked}
                  onClick={() => toggleRecipient(emp.nama_lengkap)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border text-left ${
                    isChecked
                      ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] font-semibold"
                      : "hover:bg-[var(--ds-surface-muted)] border-transparent text-[var(--ds-fg-secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <User className={`h-3.5 w-3.5 shrink-0 ${isChecked ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)]"}`} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{emp.nama_lengkap}</p>
                      {emp.jabatan && (
                        <p className="text-xs text-[var(--ds-fg-muted)] truncate">{emp.jabatan}</p>
                      )}
                    </div>
                  </div>
                  <div
                    className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-colors ${
                      isChecked
                        ? "bg-[var(--ds-accent-solid)] border-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                        : "border-[var(--ds-border-control)] bg-[var(--ds-surface)]"
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-[var(--ds-border-subtle)] flex items-center justify-between">
          <span className="text-xs text-[var(--ds-fg-muted)] font-medium tabular-nums">
            {selectedList.length} penerus dipilih
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 px-2.5 text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 px-3 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
