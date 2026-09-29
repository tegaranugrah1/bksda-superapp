"use client";

import { Plus, Trash2 } from "lucide-react";
import { indexToLetter } from "@/lib/letter-utils";
import { FormSection } from "./FormSection";
import type { DasarItem } from "../_lib/types";

interface EditableItemListSectionProps {
  title: string;
  description?: React.ReactNode;
  items: DasarItem[];
  onChange: (items: DasarItem[]) => void;
  /** Penanda penomoran: huruf (a, b, c) untuk Menimbang, angka (1, 2, 3) untuk Dasar. */
  marker: "letter" | "number";
  /** Offset indeks penomoran awal, default: 0 (misal: 1 agar nomor mulai dari 2) */
  startIndex?: number;
  /** Badge kustom di atas textarea untuk setiap item (misal penanda sinkronisasi sumber dana) */
  getItemBadge?: (item: DasarItem, index: number) => React.ReactNode;
  disabled?: boolean;
}

/**
 * Section editor untuk list item dengan add/remove + textarea editable.
 * Dipakai bersama oleh ST Builder + Create untuk Menimbang dan Dasar.
 */
export function EditableItemListSection({
  title,
  description,
  items,
  onChange,
  marker,
  startIndex = 0,
  getItemBadge,
  disabled = false,
}: EditableItemListSectionProps) {
  const addItem = () =>
    onChange([...items, { id: Math.random().toString(), text: "" }]);

  const updateItem = (idx: number, text: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], text };
    onChange(next);
  };

  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id));

  return (
    <FormSection
      title={title}
      action={
        !disabled ? (
          <button
            type="button"
            onClick={addItem}
            className="text-[10px] text-blue-600 font-bold uppercase flex items-center gap-1 hover:text-blue-700"
          >
            <Plus className="w-3 h-3" /> Tambah
          </button>
        ) : undefined
      }
    >
      {description && <div className="mb-3">{description}</div>}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const effectiveIdx = startIndex + idx;
          const badge = getItemBadge ? getItemBadge(item, idx) : null;
          return (
            <div key={item.id} className="flex gap-2">
              <span className="text-xs font-bold text-zinc-400 mt-2 min-w-[20px]">
                {marker === "letter" ? indexToLetter(effectiveIdx) : `${effectiveIdx + 1}.`}
              </span>
              <div className="flex-1 space-y-1">
                {badge}
                <textarea
                  value={item.text ?? ""}
                  disabled={disabled}
                  onChange={(e) => updateItem(idx, e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 mt-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}
