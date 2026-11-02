"use client";

import React, { useRef } from "react";
import { Plus, Trash2, Italic } from "lucide-react";
import { indexToLetter, toggleItalicInTextarea } from "@/lib/letter-utils";
import { FormSection } from "./FormSection";
import type { DasarItem } from "../_lib/types";

export interface PlaceholderChip {
  token: string;
  label?: string;
  desc?: string;
}

interface EditableItemListSectionProps {
  title: string;
  description?: React.ReactNode;
  items: DasarItem[];
  onChange: (items: DasarItem[]) => void;
  onAddItem?: () => void;
  marker: "letter" | "number";
  startIndex?: number;
  getItemBadge?: (item: DasarItem, index: number) => React.ReactNode;
  placeholderChips?: PlaceholderChip[];
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
  placeholderChips,
  disabled = false,
}: EditableItemListSectionProps) {
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const focusedIndexRef = useRef<number>(0);

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

  const handleItalic = (idx: number, itemId: string) => {
    const el = textareaRefs.current[itemId];
    if (!el) return;
    toggleItalicInTextarea(el, items[idx]?.text ?? "", (val) => updateItem(idx, val));
  };

  const insertTokenIntoActiveItem = (token: string) => {
    if (disabled || items.length === 0) return;
    const targetIdx =
      focusedIndexRef.current >= 0 && focusedIndexRef.current < items.length
        ? focusedIndexRef.current
        : 0;
    const targetItem = items[targetIdx];
    if (!targetItem) return;

    const el = textareaRefs.current[targetItem.id];
    const currentText = targetItem.text ?? "";
    if (el && typeof el.selectionStart === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const before = currentText.slice(0, start);
      const after = currentText.slice(end);
      const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
      const inserted = `${needsSpaceBefore ? " " : ""}${token}`;
      const nextText = `${before}${inserted}${after}`;
      updateItem(targetIdx, nextText);
      requestAnimationFrame(() => {
        el.focus();
        const cursor = before.length + inserted.length;
        el.setSelectionRange(cursor, cursor);
      });
    } else {
      const needsSpace = currentText.length > 0 && !/\s$/.test(currentText);
      updateItem(targetIdx, `${currentText}${needsSpace ? " " : ""}${token}`);
    }
  };

  return (
    <FormSection
      title={title}
      nested
      action={
        !disabled ? (
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Tambah Poin
          </button>
        ) : undefined
      }
    >
      {description && <div className="mb-2.5">{description}</div>}

      {placeholderChips && placeholderChips.length > 0 && !disabled && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-700/70">
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mr-0.5">
            Klik untuk sisipkan ke poin aktif:
          </span>
          {placeholderChips.map((chip) => (
            <button
              key={chip.token}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertTokenIntoActiveItem(chip.token)}
              title={chip.desc || `Sisipkan ${chip.token}`}
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-colors cursor-pointer shadow-2xs"
            >
              + {chip.label || chip.token}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => {
          const effectiveIdx = startIndex + idx;
          const badge = getItemBadge ? getItemBadge(item, idx) : null;
          const markerLabel =
            marker === "letter" ? indexToLetter(effectiveIdx) : `${effectiveIdx + 1}.`;
          const charLen = (item.text || "").length;
          const computedRows = Math.max(3, Math.min(8, Math.ceil(charLen / 80)));

          return (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200/80 dark:border-zinc-700/80 bg-slate-50/60 dark:bg-zinc-800/40 p-2.5 space-y-2 transition-colors focus-within:border-blue-400/80 focus-within:bg-white dark:focus-within:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-lg bg-slate-200/80 dark:bg-zinc-700 text-xs font-black text-slate-700 dark:text-zinc-200">
                    {markerLabel}
                  </span>
                  {badge}
                </div>

                {!disabled && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleItalic(idx, item.id)}
                      title="Miringkan teks terpilih (*kata*) - Ctrl+I"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Italic className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span className="font-serif italic">Miringkan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      title="Hapus poin"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-rose-600 bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={(el) => {
                  textareaRefs.current[item.id] = el;
                }}
                rows={computedRows}
                value={item.text ?? ""}
                disabled={disabled}
                onFocus={() => {
                  focusedIndexRef.current = idx;
                }}
                onChange={(e) => updateItem(idx, e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                    e.preventDefault();
                    handleItalic(idx, item.id);
                  }
                }}
                placeholder="Ketik teks poin... (blok teks lalu tekan Ctrl+I untuk huruf miring)"
                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs leading-relaxed focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none min-h-[74px] text-slate-900 dark:text-white transition-all resize-y disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}
