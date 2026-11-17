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
    if (search.trim()) {
      const cleanSearch = search.trim().toLowerCase().replace(/^#/, "");
      return tags.filter(
        (t) =>
          t.name.toLowerCase().includes(cleanSearch) ||
          t.label.toLowerCase().includes(cleanSearch) ||
          (t.description && t.description.toLowerCase().includes(cleanSearch))
      );
    }

    const mainList = tags.filter((t) => !t.parent_id);
    const subMap = new Map<string, IBmnTag[]>();
    tags.forEach((t) => {
      if (t.parent_id) {
        const list = subMap.get(t.parent_id) || [];
        list.push(t);
        subMap.set(t.parent_id, list);
      }
    });

    const ordered: IBmnTag[] = [];
    mainList.forEach((main) => {
      ordered.push(main);
      const subs = subMap.get(main.id) || [];
      subs.forEach((s) => ordered.push(s));
    });

    tags.forEach((t) => {
      if (t.parent_id && !mainList.some((m) => m.id === t.parent_id)) {
        ordered.push(t);
      }
    });

    return ordered;
  }, [tags, search]);

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter tag aset"
          aria-expanded={open}
          className={cn("bmn-button bmn-secondary h-9 px-3 text-xs rounded-lg flex items-center gap-2 shrink-0", className)}
        >
          <TagIcon className="w-4 h-4" />
          <span className="truncate max-w-[160px]">{singleSelectedTag?.label || (activeCount > 0 ? `Filter Tag (${activeCount})` : "Semua Tag")}</span>
          <ChevronsUpDown className="w-4 h-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        data-module="bmn"
        aria-label="Filter tag aset"
        className="bmn-assets-ui bmn-popover w-72 p-0 rounded-lg shadow-lg border border-slate-200/80 dark:border-zinc-800"
        align="start"
      >
        {/* Search input */}
        <div className="flex items-center border-b border-slate-200/70 dark:border-zinc-800 px-3 py-2">
          <Search className="w-4 h-4 text-[var(--ds-fg-muted)] mr-2 shrink-0" />
          <input
            type="text"
            aria-label="Cari tag aset"
            placeholder="Cari tag aset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent border-0 outline-none text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)]"
            autoFocus
          />
          {search && (
            <button
              type="button"
              aria-label="Bersihkan pencarian tag"
              onClick={() => setSearch("")}
              className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] p-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tag list */}
        <div className="max-h-56 overflow-y-auto p-2 space-y-1">
          {/* Bersihkan Filter Option */}
          <button
            type="button"
            aria-pressed={activeCount === 0}
            onClick={() => {
              onClearAll();
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left",
              activeCount === 0
                ? "bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] font-semibold"
                : "text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-zinc-600" />
              <span>Semua Tag (Reset)</span>
            </span>
            {activeCount === 0 && <Check className="w-4 h-4 text-[var(--ds-fg-muted)]" />}
          </button>

          {/* Filtered Tags */}
          {filteredTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            const isSub = Boolean(tag.parent_id);
            const swatch = AVAILABLE_TAG_COLORS.find((c) => c.key === tag.color);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  onToggleTag(tag.id);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left group",
                  isSub && "pl-5 bg-[var(--ds-surface-muted)]",
                  isSelected
                    ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-semibold"
                    : "text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  {isSub ? (
                    <span className="font-mono text-[var(--ds-fg-muted)] text-xs font-bold shrink-0 select-none">↳</span>
                  ) : (
                    <span
                      className={cn(
                        "w-3 h-3 rounded-full shrink-0 border border-black/10",
                        swatch?.class || "bg-emerald-500"
                      )}
                    />
                  )}
                  <span className="truncate font-medium">{tag.label}</span>
                  {isSub && (
                    <span className="text-xs px-1 py-1 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                      sub
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 shrink-0 ml-2">
                  {tag.assets_count !== undefined && tag.assets_count > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] tabular-nums">
                      {tag.assets_count}
                    </span>
                  )}
                  <span
                    className={cn(
                      "w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0",
                      isSelected
                        ? "bg-[var(--ds-accent-solid)] border-[var(--ds-accent-solid)] text-[color:var(--ds-accent-on-solid)]"
                        : "border-slate-300 dark:border-zinc-600 group-hover:border-slate-400"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                </span>
              </button>
            );
          })}

          {filteredTags.length === 0 && (
            <p className="text-center text-xs text-[var(--ds-fg-muted)] py-4">
              Tidak ada tag yang cocok
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
    {activeCount > 0 && (
      <button type="button" aria-label="Bersihkan filter tag" onClick={onClearAll} className="bmn-button bmn-secondary px-2 rounded-lg">
        <X className="w-4 h-4" />
      </button>
    )}
    </>
  );
}
