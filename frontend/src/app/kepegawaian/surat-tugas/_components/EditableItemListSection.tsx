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
  onAddItem?: () => void;
  marker: "letter" | "number";
  startIndex?: number;
  getItemBadge?: (item: DasarItem, index: number) => React.ReactNode;
  disabled?: boolean;
}

export function EditableItemListSection({
  title,
  description,
  items,
  onChange,
  onAddItem,
  marker,
  startIndex = 0,
  getItemBadge,
  disabled = false,
}: EditableItemListSectionProps) {
  const addItem = () => {
    if (onAddItem) {
      onAddItem();
    } else {
      onChange([...items, { id: crypto.randomUUID(), text: "" }]);
    }
  };

  const updateItem = (idx: number, text: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], text };
    onChange(next);
  };

  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id));

  return (
    <FormSection
      title={title}
      nested
      action={
        !disabled ? (
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Tambah
          </button>
        ) : undefined
      }
    >
      {description && <div className="mb-2">{description}</div>}
      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const effectiveIdx = startIndex + idx;
          const badge = getItemBadge ? getItemBadge(item, idx) : null;
          return (
            <div key={item.id} className="flex gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-2 min-w-[20px]">
                {marker === "letter" ? indexToLetter(effectiveIdx) : `${effectiveIdx + 1}.`}
              </span>
              <div className="flex-1 space-y-1">
                {badge}
                <textarea
                  value={item.text ?? ""}
                  disabled={disabled}
                  onChange={(e) => updateItem(idx, e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-500 outline-none min-h-[62px] text-slate-900 dark:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  title="Hapus poin"
                  className="p-1.5 h-fit text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg mt-1.5 transition-colors cursor-pointer"
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
