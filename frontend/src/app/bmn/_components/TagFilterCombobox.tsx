"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search, Tag as TagIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AVAILABLE_TAG_COLORS,
  getTagColorClasses,
  type IBmnTag,
} from "../_lib/tag-utils";

interface TagFilterComboboxProps {
  tags: IBmnTag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function TagFilterCombobox({
  tags,
  selectedTagIds,
  onToggleTag,
  onClearAll,
  className,
}: TagFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const activeCount = selectedTagIds.length;

  const singleSelectedTag = useMemo(() => {
    if (activeCount === 1) {
      return tags.find((t) => t.id === selectedTagIds[0]) || null;
    }
    return null;
  }, [tags, selectedTagIds, activeCount]);

  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const cleanSearch = search.trim().toLowerCase().replace(/^#/, "");
    return tags.filter(
      (t) =>
        t.name.toLowerCase().includes(cleanSearch) ||
        t.label.toLowerCase().includes(cleanSearch) ||
        (t.description && t.description.toLowerCase().includes(cleanSearch))
    );
  }, [tags, search]);

  const singleColorTheme = singleSelectedTag
    ? getTagColorClasses(singleSelectedTag.color)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {activeCount === 1 && singleSelectedTag && singleColorTheme ? (
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-9 px-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shadow-xs shrink-0",
              singleColorTheme.bg,
              singleColorTheme.text,
              singleColorTheme.border,
              className
            )}
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span className="truncate max-w-[130px]">{singleSelectedTag.label}</span>
            <span
              role="button"
              tabIndex={0}
              title="Hapus filter tag"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onClearAll();
                }
              }}
              className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-0.5 cursor-pointer"
            >
              <X className="w-3 h-3 opacity-75 hover:opacity-100" />
            </span>
          </button>
        ) : activeCount > 1 ? (
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-9 px-2.5 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 transition-all flex items-center gap-1.5 shadow-xs shrink-0",
              className
            )}
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span>Filter Tag ({activeCount})</span>
            <ChevronsUpDown className="w-3 h-3 opacity-70" />
            <span
              role="button"
              tabIndex={0}
              title="Bersihkan semua tag"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onClearAll();
                }
              }}
              className="p-0.5 rounded-full hover:bg-emerald-200/50 dark:hover:bg-emerald-400/20 transition-colors ml-0.5 cursor-pointer"
            >
              <X className="w-3 h-3 opacity-75 hover:opacity-100" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-9 px-3 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between gap-2 shrink-0 min-w-[125px]",
              className
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <TagIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Semua Tag</span>
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-70" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-68 p-0 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        align="start"
      >
        {/* Search input */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Cari tag aset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent border-0 outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tag list */}
        <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
          {/* Bersihkan Filter Option */}
          <button
            type="button"
            onClick={() => {
              onClearAll();
            }}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left",
              activeCount === 0
                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>Semua Tag (Reset)</span>
            </span>
            {activeCount === 0 && <Check className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {/* Filtered Tags */}
          {filteredTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            const swatch = AVAILABLE_TAG_COLORS.find((c) => c.key === tag.color);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  onToggleTag(tag.id);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left group",
                  isSelected
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0 border border-black/10",
                      swatch?.class || "bg-emerald-500"
                    )}
                  />
                  <span className="truncate font-medium">{tag.label}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0 ml-2">
                  {tag.assets_count !== undefined && tag.assets_count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {tag.assets_count}
                    </span>
                  )}
                  <span
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                      isSelected
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 dark:border-slate-600 group-hover:border-slate-400"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </span>
                </span>
              </button>
            );
          })}

          {filteredTags.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-4">
              Tidak ada tag yang cocok
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
