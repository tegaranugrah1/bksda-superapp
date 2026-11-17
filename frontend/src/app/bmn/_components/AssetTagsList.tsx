"use client";

import { useState } from "react";
import { Tag as TagIcon, Settings2 } from "lucide-react";
import { TagBadge } from "./TagBadge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { IBmnTag } from "../_lib/tag-utils";

interface AssetTagsListProps {
  tags?: IBmnTag[];
  maxVisible?: number;
  className?: string;
  onManageTags?: () => void;
}

export function AssetTagsList({
  tags = [],
  maxVisible = 2,
  className,
  onManageTags,
}: AssetTagsListProps) {
  const [open, setOpen] = useState(false);

  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-2 ${className || ""}`}>
      {visibleTags.map((tag) => onManageTags ? (
        <button
          key={tag.id}
          type="button"
          onClick={(event) => { event.stopPropagation(); onManageTags(); }}
          aria-label={`Kelola tag ${tag.label}`}
          className="rounded-full cursor-pointer hover:brightness-95"
        >
          <TagBadge tag={tag} size="sm" className="text-xs" />
        </button>
      ) : <TagBadge key={tag.id} tag={tag} size="sm" className="text-xs" />)}

      {remainingCount > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title={`Lihat semua ${tags.length} tag`}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-accent-soft)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] border border-slate-200/80 dark:border-zinc-800 transition-colors cursor-pointer"
            >
              +{remainingCount}
            </button>
          </PopoverTrigger>
          <PopoverContent
            data-module="bmn"
            className="bmn-assets-ui bmn-popover w-64 p-4 rounded-3xl shadow-lg border border-slate-200/80 dark:border-zinc-800"
            align="start"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-[var(--ds-fg)] pb-2 border-b border-slate-200/70 dark:border-zinc-800 mb-3">
              <span className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                <span>Semua Tag Aset ({tags.length})</span>
              </span>
              {onManageTags && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onManageTags();
                  }}
                  className="text-xs text-[var(--ds-accent-fg)] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Settings2 className="w-3 h-3" /> Kelola
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {tags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
