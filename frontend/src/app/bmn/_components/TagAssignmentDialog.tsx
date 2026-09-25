"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Loader2, Tag as TagIcon, Check, Plus, Trash2, Info, Search, X } from "lucide-react";
import { TagBadge } from "./TagBadge";
import { type IBmnTag } from "../_lib/tag-utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ActiveTagSummary {
  tag: IBmnTag;
  count: number;
}

interface TagAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  initialTagIds?: string[];
  activeTags?: ActiveTagSummary[];
  totalSelectedAssets?: number;
  isBulk?: boolean;
  onSave: (tagIds: string[], action: "attach" | "detach" | "replace" | "clear_all") => Promise<void>;
}

const EMPTY_TAG_IDS: string[] = [];
const EMPTY_ACTIVE_TAGS: ActiveTagSummary[] = [];

export function TagAssignmentDialog({
  isOpen,
  onClose,
  title,
  description,
  initialTagIds = EMPTY_TAG_IDS,
  activeTags = EMPTY_ACTIVE_TAGS,
  totalSelectedAssets,
  isBulk = false,
  onSave,
}: TagAssignmentDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialTagIds));
  const [bulkMode, setBulkMode] = useState<"attach" | "detach" | "replace">("attach");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const confirm = useConfirm();

  const initialTagIdsKey = initialTagIds.join(",");

  // Sync state when dialog opens or target asset changes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      if (isBulk) {
        setBulkMode("attach");
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(initialTagIds));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTagIdsKey]);

  // Fetch available tags
  const { data: tags = [], isLoading } = useQuery<IBmnTag[]>({
    queryKey: ["bmn-tags"],
    queryFn: async () => {
      const res = await api.get("/bmn/tags");
      return res.data.data || [];
    },
    enabled: isOpen,
  });

  // Determine active tags: use passed activeTags, or derive from initialTagIds for single asset
  const effectiveActiveTags = useMemo(() => {
    if (activeTags && activeTags.length > 0) return activeTags;
    if (initialTagIds && initialTagIds.length > 0 && tags.length > 0) {
      const initialSet = new Set(initialTagIds);
      return tags
        .filter((t) => initialSet.has(t.id))
        .map((t) => ({ tag: t, count: 1 }));
    }
    return EMPTY_ACTIVE_TAGS;
  }, [activeTags, initialTagIds, tags]);

  // Map of active tag counts: tagId -> count
  const activeCountMap = useMemo(() => {
    const map = new Map<string, number>();
    effectiveActiveTags.forEach((item) => {
      map.set(item.tag.id, item.count);
    });
    return map;
  }, [effectiveActiveTags]);

  const assetCount = totalSelectedAssets || (isBulk ? (effectiveActiveTags.length > 0 ? Math.max(...effectiveActiveTags.map((a) => a.count), 1) : 1) : 1);

  // When switching modes, set appropriate initial selection
  const handleModeChange = (mode: "attach" | "detach" | "replace") => {
    setBulkMode(mode);
    setSearchQuery("");
    if (mode === "replace") {
      const activeIds = effectiveActiveTags.map((a) => a.tag.id);
      setSelectedIds(new Set(activeIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Filter tags list based on mode:
  // On 'detach' mode, prioritize or show ONLY tags that are actually attached to the selected asset(s)
  const displayTags = useMemo(() => {
    if (bulkMode === "detach" && effectiveActiveTags.length > 0) {
      const activeIds = new Set(effectiveActiveTags.map((a) => a.tag.id));
      return tags.filter((t) => activeIds.has(t.id));
    }
    return tags;
  }, [tags, bulkMode, effectiveActiveTags]);

  // Filter display tags further by user search query (matching name or description)
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return displayTags;
    const q = searchQuery.toLowerCase().trim();
    return displayTags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [displayTags, searchQuery]);

  const toggleTag = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(Array.from(selectedIds), bulkMode);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: "Kosongkan Seluruh Tag?",
      description: "Seluruh tag yang melekat pada aset terpilih akan dicabut. Tindakan ini tidak menghapus data aset.",
      confirmText: "Ya, Kosongkan Semua Tag",
      variant: "danger",
    });
    if (!ok) return;

    setIsSaving(true);
    try {
      await onSave([], "clear_all");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-emerald-600" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="py-2 space-y-3">
          {/* Banner Tag yang Saat Ini Terpasang */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              Tag yang Sedang Terpasang Saat Ini:
            </span>
            {effectiveActiveTags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {effectiveActiveTags.map(({ tag, count }) => (
                  <span key={tag.id} className="inline-flex items-center gap-1">
                    <TagBadge tag={tag} size="sm" />
                    {isBulk && count > 0 && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        ({count} aset)
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic pt-0.5">
                {isBulk ? "Belum ada tag yang terpasang pada aset terpilih." : "Belum ada tag yang terpasang pada aset ini."}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
              <p className="text-xs text-slate-400">Memuat daftar tag...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <TagIcon className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-3">Belum ada tag yang terdaftar.</p>
              <Link href="/bmn/settings" onClick={onClose}>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 rounded-xl">
                  <Plus className="w-3.5 h-3.5" /> Buka Pengaturan Tag
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {isBulk && (
                <div>
                  <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl mb-2">
                    <button
                      type="button"
                      onClick={() => handleModeChange("attach")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        bulkMode === "attach"
                          ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      )}
                    >
                      Tambah Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange("detach")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        bulkMode === "detach"
                          ? "bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      )}
                    >
                      Lepas Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange("replace")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        bulkMode === "replace"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      )}
                    >
                      Gantikan Tag
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 mb-2">
                    {bulkMode === "attach" && "Pilih tag yang ingin ditambahkan ke aset tanpa menghapus tag yang sudah ada."}
                    {bulkMode === "detach" && "Pilih tag yang ingin dicabut dari seluruh aset terpilih."}
                    {bulkMode === "replace" && "Seluruh tag lama pada aset akan digantikan hanya dengan tag yang dicentang."}
                  </p>
                </div>
              )}

              {isBulk && bulkMode === "detach" && (
                <div className="p-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-200">
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">Kosongkan Semua Tag?</p>
                    <p className="text-[10px] text-red-600/80 dark:text-red-400/80">Cabut semua tag yang melekat pada aset terpilih.</p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isSaving || effectiveActiveTags.length === 0}
                    onClick={handleClearAll}
                    className="h-7 text-xs rounded-lg gap-1 px-2.5"
                  >
                    <Trash2 className="w-3 h-3" /> Kosongkan
                  </Button>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari tag (nama atau deskripsi)..."
                  className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {bulkMode === "detach" && displayTags.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400 italic">
                    Tidak ada tag yang sedang melekat pada aset terpilih untuk dilepas.
                  </p>
                ) : filteredTags.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    <p>Tidak ada tag yang cocok dengan &quot;{searchQuery}&quot;.</p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-1.5 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      Reset Pencarian
                    </button>
                  </div>
                ) : (
                  filteredTags.map((tag) => {
                    const isChecked = selectedIds.has(tag.id);
                    const tagCount = activeCountMap.get(tag.id) || 0;
                    const isFullyAttached = isBulk && bulkMode === "attach" && tagCount >= assetCount && assetCount > 0;
                    const isPartiallyAttached = isBulk && bulkMode === "attach" && tagCount > 0 && tagCount < assetCount;

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        disabled={isFullyAttached}
                        onClick={() => !isFullyAttached && toggleTag(tag.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left",
                          isFullyAttached
                            ? "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-800/30 opacity-70 cursor-not-allowed"
                            : isChecked
                              ? bulkMode === "detach"
                                ? "border-red-400/50 bg-red-50/40 dark:bg-red-500/10"
                                : "border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-500/10"
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                          <TagBadge tag={tag} size="md" />
                          {tag.description && (
                            <span className="text-xs text-slate-400 truncate max-w-[170px]">
                              {tag.description}
                            </span>
                          )}
                          {isPartiallyAttached && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/50 shrink-0">
                              {tagCount}/{assetCount} aset sudah punya
                            </span>
                          )}
                        </div>
                        {isFullyAttached ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0 border border-emerald-200/70 dark:border-emerald-800/50">
                            <Check className="w-3 h-3" /> Sudah Terpasang
                          </span>
                        ) : (
                          <div
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                              isChecked
                                ? bulkMode === "detach"
                                  ? "bg-red-600 border-red-600 text-white"
                                  : "bg-emerald-600 border-emerald-600 text-white"
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            )}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <span>{selectedIds.size} tag dipilih</span>
                <Link href="/bmn/settings" onClick={onClose} className="text-emerald-600 hover:underline">
                  Kelola Tag di Pengaturan →
                </Link>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (isBulk && selectedIds.size === 0)}
            className={cn(
              "rounded-xl gap-2",
              bulkMode === "detach"
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : isBulk ? (
              bulkMode === "detach" ? (
                `Lepas ${selectedIds.size} Tag Terpilih`
              ) : bulkMode === "replace" ? (
                "Gantikan Tag Aset"
              ) : (
                "Terapkan Tag"
              )
            ) : (
              "Simpan Perubahan Tag"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
