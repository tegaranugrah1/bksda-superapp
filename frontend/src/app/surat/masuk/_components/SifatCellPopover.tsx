"use client";

import { useState, useRef, useEffect } from "react";
import { Tag, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { SuratMasuk } from "../../_lib/surat-types";
import { SIFAT_OPTIONS } from "../../_lib/surat-types";

interface SifatCellPopoverProps {
  item: SuratMasuk;
  onUpdated?: (updatedItem: SuratMasuk) => void;
}

export function getSifatBadgeStyle(sifat: string) {
  switch (sifat) {
    case "Penting":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
    case "Sangat Penting":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300";
    case "Segera":
      return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
    case "Kilat":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 font-extrabold";
    case "Rahasia":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 font-bold";
    case "Biasa":
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

export function SifatCellPopover({ item, onUpdated }: SifatCellPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSifat, setSelectedSifat] = useState<string>(() => {
    return Array.isArray(item.sifat_json) && item.sifat_json.length > 0 ? item.sifat_json[0] : "Penting";
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Array.isArray(item.sifat_json) && item.sifat_json.length > 0) {
      setSelectedSifat(item.sifat_json[0]);
    }
  }, [item.sifat_json]);

  // Outside click handler
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

  const selectSifatOption = async (sifat: string) => {
    setSelectedSifat(sifat);
    setIsSaving(true);

    try {
      const payload = {
        no_agenda: item.no_agenda,
        no_surat: item.no_surat,
        tanggal_agenda: item.tanggal_agenda,
        sifat_json: [sifat],
        disposisi: item.disposisi ? {
          diteruskan_json: item.disposisi.diteruskan_json || [],
          catatan: item.disposisi.catatan || "",
        } : undefined,
      };

      let resData = { ...item, sifat_json: [sifat] };
      if (item.id) {
        const res = await api.put(`/api/surat-masuk/${item.id}`, payload);
        if (res.data?.data) {
          resData = res.data.data;
        }
      }

      // Update local storage
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("bksda_saved_surat_masuk");
          if (saved) {
            const list: SuratMasuk[] = JSON.parse(saved);
            const updated = list.map((s) => {
              if (s.id === item.id || (s.no_agenda && s.no_agenda === item.no_agenda)) {
                return { ...s, sifat_json: [sifat] };
              }
              return s;
            });
            localStorage.setItem("bksda_saved_surat_masuk", JSON.stringify(updated));
          }
        } catch (e) {}
      }

      toast.success(`Sifat surat diperbarui: ${sifat}`);
      setIsOpen(false);
      if (onUpdated) {
        onUpdated(resData);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memperbarui sifat surat.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger: Clickable Badge (Single select) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex flex-wrap gap-1 hover:opacity-80 transition-opacity"
        title="Klik untuk mengubah sifat surat arahan pimpinan (Pilih 1)"
      >
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border transition-colors ${getSifatBadgeStyle(
            selectedSifat
          )}`}
        >
          {selectedSifat}
        </span>
      </div>

      {/* Popover Dropdown (Radio-like selection) */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
              <Tag className="h-3 w-3 text-emerald-600" />
              Pilih 1 Sifat Surat
            </span>
            {isSaving && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
          </div>

          <div className="space-y-1">
            {SIFAT_OPTIONS.map((opt) => {
              const isChecked = selectedSifat === opt;
              return (
                <div
                  key={opt}
                  onClick={() => selectSifatOption(opt)}
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                    isChecked
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className={`px-2 py-0.5 rounded-md text-[10.5px] border ${getSifatBadgeStyle(opt)}`}>
                    {opt}
                  </span>
                  {isChecked && <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
