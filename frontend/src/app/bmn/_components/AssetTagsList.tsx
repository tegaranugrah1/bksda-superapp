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
    <div className={`flex flex-wrap items-center gap-1 mt-1.5 ${className || ""}`}>
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          onClick={(e) => {
            if (onManageTags) {
              e.stopPropagation();
              onManageTags();
            }
          }}
          className={onManageTags ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
          title={onManageTags ? `Klik untuk kelola tag aset ini` : undefined}
        >
          <TagBadge tag={tag} size="sm" />
        </span>
      ))}

      {remainingCount > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title={`Lihat semua ${tags.length} tag`}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              +{remainingCount}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            align="start"
          >
            <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2.5">
              <span className="flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Semua Tag Aset ({tags.length})</span>
              </span>
              {onManageTags && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onManageTags();
                  }}
                  className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Settings2 className="w-3 h-3" /> Kelola
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
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
