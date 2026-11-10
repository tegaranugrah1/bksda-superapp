"use client";

import { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tag as TagIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Package,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AVAILABLE_TAG_COLORS,
  getTagColorClasses,
  type IBmnTag,
} from "../../_lib/tag-utils";
import { TablePaginationFooter } from "../_components/TablePaginationFooter";

interface TagManagementTabProps {
  tags: IBmnTag[];
  isLoading: boolean;
  canManage: boolean;
}

export function TagManagementTab({ tags, isLoading, canManage }: TagManagementTabProps) {
  const formTrigger = useRef<HTMLElement | null>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [tagSearch, setTagSearch] = useState("");
  const [isTagFormOpen, setIsTagFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<IBmnTag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("emerald");
  const [tagDescription, setTagDescription] = useState("");
  const [tagType, setTagType] = useState<"main" | "sub">("main");
  const [tagParentId, setTagParentId] = useState<string>("");
  const [collapsedMainTagIds, setCollapsedMainTagIds] = useState<Set<string>>(new Set());
  const [inheritParentColor, setInheritParentColor] = useState<boolean>(true);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const [tagPage, setTagPage] = useState(1);
  const [tagPageSize, setTagPageSize] = useState(10);

  // Available Main Tags to select as parent (cannot pick self)
  const availableParentTags = useMemo(() => {
    return tags.filter((t) => !t.parent_id && (!editingTag || t.id !== editingTag.id));
  }, [tags, editingTag]);

  // Hierarchically sorted tags: Main Tags followed by their Sub Tags
  const hierarchicalTags = useMemo(() => {
    if (tagSearch.trim()) {
      const term = tagSearch.toLowerCase().replace(/^#/, "");
      return tags.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.label.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term))
      );
    }

    const mainList = tags.filter((t) => !t.parent_id);
    const subTagsMap = new Map<string, IBmnTag[]>();
    tags.forEach((t) => {
      if (t.parent_id) {
        const list = subTagsMap.get(t.parent_id) || [];
        list.push(t);
        subTagsMap.set(t.parent_id, list);
      }
    });

    const ordered: IBmnTag[] = [];
    mainList.forEach((main) => {
      ordered.push(main);
      const subs = subTagsMap.get(main.id) || [];
      subs.forEach((sub) => ordered.push(sub));
    });

    // In case of any orphaned sub-tags
    tags.forEach((t) => {
      if (t.parent_id && !mainList.some((m) => m.id === t.parent_id)) {
        ordered.push(t);
      }
    });

    return ordered;
  }, [tags, tagSearch]);

  const toggleCollapseMainTag = (id: string) => {
    setCollapsedMainTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapseAllMainTags = () => {
    const allWithSubs = tags.filter((t) => !t.parent_id && (t.sub_tags_count || 0) > 0).map((t) => t.id);
    setCollapsedMainTagIds(new Set(allWithSubs));
  };

  const expandAllMainTags = () => {
    setCollapsedMainTagIds(new Set());
  };

  const hasAnyMainTagWithSubs = useMemo(() => {
    return tags.some((t) => !t.parent_id && (t.sub_tags_count || 0) > 0);
  }, [tags]);

  // Filter out sub-tags if their parent main tag is collapsed (unless user is searching)
  const filteredTags = useMemo(() => {
    if (tagSearch.trim()) return hierarchicalTags;
    return hierarchicalTags.filter((t) => {
      if (t.parent_id && collapsedMainTagIds.has(t.parent_id)) {
        return false;
      }
      return true;
    });
  }, [hierarchicalTags, tagSearch, collapsedMainTagIds]);

  const totalTagItems = filteredTags.length;
  const totalTagPages = tagPageSize === 0 ? 1 : Math.max(1, Math.ceil(totalTagItems / tagPageSize));
  const activeTagPage = Math.min(tagPage, totalTagPages);

  const paginatedTags = useMemo(() => {
    if (tagPageSize === 0) return filteredTags;
    const start = (activeTagPage - 1) * tagPageSize;
    return filteredTags.slice(start, start + tagPageSize);
  }, [filteredTags, activeTagPage, tagPageSize]);

  const mainTagsCount = useMemo(() => tags.filter((t) => !t.parent_id).length, [tags]);
  const subTagsCount = useMemo(() => tags.filter((t) => Boolean(t.parent_id)).length, [tags]);

  // Unique tagged assets: calculated across Main Tags (which aggregate distinct assets without double counting)
  const totalAssetsTagged = useMemo(() => {
    return tags.filter((t) => !t.parent_id).reduce((acc, t) => acc + (t.assets_count || 0), 0);
  }, [tags]);

  const handleOpenCreateTag = () => {
    formTrigger.current = document.activeElement as HTMLElement | null;
    setEditingTag(null);
    setTagName("");
    setTagColor("emerald");
    setTagDescription("");
    setTagType("main");
    setTagParentId("");
    setInheritParentColor(true);
    setIsTagFormOpen(true);
  };

  const handleOpenEditTag = (tag: IBmnTag) => {
    formTrigger.current = document.activeElement as HTMLElement | null;
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || "emerald");
    setTagDescription(tag.description || "");
    setTagType(tag.parent_id ? "sub" : "main");
    setTagParentId(tag.parent_id || "");
    setInheritParentColor(false);
    setIsTagFormOpen(true);
  };

  const handleSelectParentTag = (parentId: string) => {
    setTagParentId(parentId);
    if (inheritParentColor) {
      const parent = availableParentTags.find((p) => p.id === parentId);
      if (parent?.color) {
        setTagColor(parent.color);
      }
    }
  };

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!tagName.trim()) {
      toast.error("Nama tag tidak boleh kosong.");
      return;
    }

    if (tagType === "sub" && !tagParentId) {
      toast.error("Silakan pilih Main Tag induk untuk Sub Tag ini.");
      return;
    }

    setIsSubmittingTag(true);
    try {
      const payload = {
        name: tagName.trim(),
        color: tagColor,
        description: tagDescription.trim() || null,
        parent_id: tagType === "sub" ? tagParentId : null,
      };

      if (editingTag) {
        await api.put(`/bmn/tags/${editingTag.id}`, payload);
        toast.success(`Tag #${tagName.replace(/^#/, "")} berhasil diperbarui.`);
      } else {
        await api.post("/bmn/tags", payload);
        toast.success(`Tag #${tagName.replace(/^#/, "")} berhasil dibuat.`);
      }

      queryClient.invalidateQueries({ queryKey: ["bmn-tags"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
      setIsTagFormOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menyimpan tag.";
      toast.error(msg);
    } finally {
      setIsSubmittingTag(false);
    }
  };

  const handleDeleteTag = async (tag: IBmnTag) => {
    const hasChildren = tags.some((t) => t.parent_id === tag.id) || (tag.sub_tags_count || 0) > 0;
    if (hasChildren) {
      toast.error(
        `Tag ${tag.label} tidak dapat dihapus karena masih memiliki sub-tag di bawahnya. Hapus atau pindahkan sub-tag terlebih dahulu.`
      );
      return;
    }

    const affectedCount = tag.assets_count || 0;
    const ok = await confirm({
      title: `Hapus Tag ${tag.label}?`,
      description:
        affectedCount > 0
          ? `Tag ${tag.label} saat ini digunakan oleh ${affectedCount} aset. Jika dihapus, tag ini akan otomatis dilepas dari semua aset tersebut tanpa menghapus datanya.`
          : `Yakin ingin menghapus tag ${tag.label}?`,
      confirmText: `Ya, Hapus ${tag.label}`,
      variant: "danger",
      contentModule: "bmn",
      contentClassName: "bmn-assets-ui bmn-standard-ui bmn-popover",
    });

    if (!ok) return;

    try {
      await api.delete(`/bmn/tags/${tag.id}`);
      toast.success(`Tag ${tag.label} berhasil dihapus.`);
      queryClient.invalidateQueries({ queryKey: ["bmn-tags"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menghapus tag.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Total Tag
            </p>
            <p className="text-2xl font-bold text-[var(--ds-fg)] mt-1">
              {tags.length}
            </p>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              {mainTagsCount} Main Tag, {subTagsCount} Sub-tag
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
            <TagIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Asosiasi Aset Terpasang
            </p>
            <p className="text-2xl font-bold text-[var(--ds-fg)] mt-1">
              {totalAssetsTagged}
            </p>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Total aset unik ber-tag (tanpa duplikasi)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Hierarki Main &amp; Sub Tag
            </p>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1 leading-relaxed">
              Mendukung <b>Main Tag</b> (induk) &amp; <b>Sub Tag</b> (turunan <code>↳</code>). Aset sub-tag otomatis terhitung di bawah Main Tag.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)]" />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi tag..."
            aria-label="Cari tag"
                  value={tagSearch}
            onChange={(e) => {
              setTagSearch(e.target.value);
              setTagPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasAnyMainTagWithSubs && !tagSearch.trim() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={collapsedMainTagIds.size > 0 ? expandAllMainTags : collapseAllMainTags}
              className="rounded-xl gap-1.5 text-xs h-9"
              title={collapsedMainTagIds.size > 0 ? "Tampilkan seluruh sub-tag" : "Sembunyikan seluruh sub-tag"}
            >
              {collapsedMainTagIds.size > 0 ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Rentangkan Semua
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5" /> Ciutkan Semua
                </>
              )}
            </Button>
          )}
          {canManage && (
            <Button
              onClick={handleOpenCreateTag}
              size="sm"
              className="rounded-xl gap-2 text-xs bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] h-9"
            >
              <Plus className="w-4 h-4" /> Tambah Tag Baru
            </Button>
          )}
        </div>
      </div>

      {/* Tags Table */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className={`${totalTagItems > 0 ? "bmn-wide-table" : ""} w-full text-left`}>
            <thead className={totalTagItems > 0 ? "" : "hidden sm:table-header-group"}>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Badge &amp; Hierarki Tag
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Slug Sistem
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Warna
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Deskripsi
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider text-center">
                  Aset Terkait
                </th>
                {canManage && (
                  <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider text-center w-28">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--ds-accent-fg)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--ds-fg-muted)]">Memuat daftar tag...</p>
                  </td>
                </tr>
              ) : filteredTags.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="p-12 text-center">
                    <TagIcon className="w-10 h-10 mx-auto mb-2 text-[var(--ds-fg-muted)]" />
                    <p className="text-sm text-[var(--ds-fg-muted)] font-medium">
                      {tagSearch ? "Tidak ada tag yang cocok" : "Belum ada tag yang dibuat"}
                    </p>
                    {canManage && !tagSearch && (
                      <Button
                        onClick={handleOpenCreateTag}
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-xl gap-2 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Buat Tag Pertama
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTags.map((tag) => {
                  const colorTheme = getTagColorClasses(tag.color);
                  const isSub = Boolean(tag.parent_id);
                  const isCollapsed = collapsedMainTagIds.has(tag.id);
                  const hasSubs = (tag.sub_tags_count || 0) > 0;
                  return (
                    <tr
                      key={tag.id}
                      className={cn(
                        "bmn-table-row group",
                        isSub && "bg-[var(--ds-surface-muted)] "
                      )}
                    >
                      <td className="px-5 py-3.5">
                        {isSub ? (
                          <div className="flex items-center gap-2 pl-6 sm:pl-8">
                            <span className="font-mono text-[var(--ds-fg-muted)] text-sm font-bold select-none shrink-0">↳</span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                                colorTheme.bg,
                                colorTheme.text,
                                colorTheme.border
                              )}
                            >
                              {tag.label}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-xs font-semibold bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)] border border-[var(--ds-border-subtle)] shrink-0">
                              Sub-tag
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {hasSubs ? (
                              <button
                                type="button"
                                aria-expanded={!isCollapsed}
                                onClick={() => toggleCollapseMainTag(tag.id)}
                                className="p-1 -ml-1.5 rounded-md hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)] transition-colors shrink-0"
                                title={isCollapsed ? `Rentangkan ${tag.sub_tags_count} sub-tag` : `Ciutkan ${tag.sub_tags_count} sub-tag`}
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="w-3.5 shrink-0" />
                            )}
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                                colorTheme.bg,
                                colorTheme.text,
                                colorTheme.border
                              )}
                            >
                              <TagIcon className="w-3 h-3" />
                              {tag.label}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-xs font-semibold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] shrink-0">
                              Main Tag
                            </span>
                            {hasSubs && (
                              <button
                                type="button"
                                aria-expanded={!isCollapsed}
                                onClick={() => toggleCollapseMainTag(tag.id)}
                                className="text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] shrink-0 transition-colors"
                              >
                                ({tag.sub_tags_count} sub-tag{isCollapsed ? " • tersembunyi" : ""})
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {isSub && tag.parent && (
                            <span className="text-xs text-[var(--ds-fg-muted)] font-mono">
                              {tag.parent.name} /
                            </span>
                          )}
                          <code className="text-xs text-[var(--ds-fg-secondary)] font-mono bg-[var(--ds-surface-muted)] px-2 py-0.5 rounded">
                            {tag.name}
                          </code>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm",
                              AVAILABLE_TAG_COLORS.find((c) => c.key === tag.color)?.class || "bg-emerald-500"
                            )}
                          />
                          <span className="text-xs text-[var(--ds-fg-secondary)] capitalize">
                            {AVAILABLE_TAG_COLORS.find((c) => c.key === tag.color)?.label || tag.color}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-[var(--ds-fg-secondary)] max-w-sm truncate">
                          {tag.description || "-"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isSub ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)]">
                              {tag.direct_assets_count ?? tag.assets_count ?? 0}
                            </span>
                            <span className="text-xs text-[var(--ds-fg-muted)] mt-0.5">langsung</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                              {tag.assets_count || 0}
                            </span>
                            {(tag.sub_tags_count || 0) > 0 && (
                              <span className="text-xs text-[var(--ds-fg-muted)] mt-0.5" title="Total unik termasuk dari seluruh sub-tag tanpa duplikasi">
                                total grup
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditTag(tag)}
                              title="Edit Tag"
                              className="bmn-icon-action p-1.5 rounded-lg"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              disabled={tags.some((item) => item.parent_id === tag.id) || (tag.sub_tags_count || 0) > 0}
                              onClick={() => handleDeleteTag(tag)}
                              title={
                                (tag.sub_tags_count || 0) > 0
                                  ? "Hapus sub-tag terlebih dahulu sebelum menghapus Main Tag ini"
                                  : "Hapus Tag"
                              }
                              className="p-1.5 rounded-lg bmn-icon-danger transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePaginationFooter
          totalItems={totalTagItems}
          pageSize={tagPageSize}
          onPageSizeChange={setTagPageSize}
          currentPage={activeTagPage}
          totalPages={totalTagPages}
          onPageChange={setTagPage}
          itemLabel="tag"
        />
      </div>

      {/* DIALOG: CREATE / EDIT TAG */}
      <Dialog open={isTagFormOpen} onOpenChange={setIsTagFormOpen}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); formTrigger.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto">
          <form onSubmit={handleSubmitTag}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-[var(--ds-accent-fg)]" />
                {editingTag ? "Edit Tag Aset" : "Tambah Tag Aset Baru"}
              </DialogTitle>
              <DialogDescription>
                Tag digunakan untuk mengelompokkan dan menandai aset BMN secara bertingkat (Main Tag &amp; Sub Tag).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Jenis Tag: Main Tag vs Sub Tag */}
              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1.5">
                  Tingkat / Jenis Tag <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                {editingTag && tags.some((t) => t.parent_id === editingTag.id) ? (
                  <div className="p-2.5 bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] rounded-xl text-xs text-[var(--ds-status-warning-fg)]">
                    Tag ini memiliki <b>{tags.filter((t) => t.parent_id === editingTag.id).length} sub-tag</b> di bawahnya, sehingga harus tetap sebagai <b>Main Tag</b>.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={tagType === "main"}
                      onClick={() => {
                        setTagType("main");
                        setTagParentId("");
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-colors duration-150 ease-out flex flex-col gap-0.5",
                        tagType === "main"
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  shadow-xs"
                          : "border-[var(--ds-border-subtle)]  hover:bg-[var(--ds-surface-muted)]  text-[var(--ds-fg-secondary)] "
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Main Tag (Induk)</span>
                        {tagType === "main" && <Check className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />}
                      </div>
                      <span className="text-xs text-[var(--ds-fg-muted)]">Contoh: #alat-kebakaran</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={tagType === "sub"}
                      onClick={() => {
                        setTagType("sub");
                        if (!tagParentId && availableParentTags.length > 0) {
                          handleSelectParentTag(availableParentTags[0].id);
                        }
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-colors duration-150 ease-out flex flex-col gap-0.5",
                        tagType === "sub"
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  shadow-xs"
                          : "border-[var(--ds-border-subtle)]  hover:bg-[var(--ds-surface-muted)]  text-[var(--ds-fg-secondary)] "
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Sub Tag (Turunan)</span>
                        {tagType === "sub" && <Check className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />}
                      </div>
                      <span className="text-xs text-[var(--ds-fg-muted)]">Contoh: #kendaraan-kebakaran</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dropdown Induk Main Tag if Sub Tag */}
              {tagType === "sub" && (
                <div className="">
                  <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                    Pilih Main Tag Induk <span className="text-[var(--ds-status-danger-fg)]">*</span>
                  </label>
                  {availableParentTags.length === 0 ? (
                    <div className="p-3 bg-[var(--ds-status-danger-bg)] border border-[var(--ds-status-danger-border)] rounded-xl text-xs text-[var(--ds-status-danger-fg)]">
                      Belum ada Main Tag yang tersedia. Harap buat Main Tag terlebih dahulu.
                    </div>
                  ) : (
                    <>
                      <select
                        aria-label="Main Tag Induk"
                  value={tagParentId}
                        onChange={(e) => handleSelectParentTag(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm text-[var(--ds-fg)]"
                      >
                        <option value="" disabled>-- Pilih Main Tag Induk --</option>
                        {availableParentTags.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label} {p.description ? `— ${p.description}` : ""}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2 mt-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[var(--ds-fg-secondary)] select-none">
                          <input
                            type="checkbox"
                            checked={inheritParentColor}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setInheritParentColor(checked);
                              if (checked && tagParentId) {
                                const p = availableParentTags.find((x) => x.id === tagParentId);
                                if (p?.color) setTagColor(p.color);
                              }
                            }}
                            className="rounded border-[var(--ds-border-subtle)] text-[var(--ds-accent-fg)] h-3.5 w-3.5"
                          />
                          <span>Samakan tema warna dengan Main Tag induk</span>
                        </label>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                    Aset yang diberi Sub Tag ini akan otomatis terhubung ke Main Tag induknya tanpa double counting.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Nama Tag <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-fg-muted)] font-bold text-sm">
                    #
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="misal: alat-berat, aset-rusak..."
                    aria-label="Nama Tag"
                  value={tagName.replace(/^#/, "")}
                    onChange={(e) => setTagName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
                    className="w-full pl-8 pr-4 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
                  />
                </div>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                  Gunakan huruf kecil, angka, dan tanda hubung (-).
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Warna Tag
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AVAILABLE_TAG_COLORS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      aria-label={c.label}
                      aria-pressed={tagColor === c.key}
                      onClick={() => setTagColor(c.key)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-colors duration-150 ease-out flex items-center justify-center",
                        c.class,
                        tagColor === c.key
                          ? "border-[var(--ds-fg)] outline-2 outline-offset-2 outline-[var(--ds-fg)]"
                          : "border-transparent  "
                      )}
                      title={c.label}
                    >
                      {tagColor === c.key && (
                        <Check className="w-4 h-4 p-0.5 rounded-full bg-[#0f172a] text-[#ffffff]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Deskripsi <span className="text-[var(--ds-fg-muted)] font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan kegunaan tag..."
                  aria-label="Deskripsi Tag"
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTagFormOpen(false)}
                disabled={isSubmittingTag}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingTag || !tagName.trim() || (tagType === "sub" && !tagParentId)}
                className="rounded-xl gap-2"
              >
                {isSubmittingTag ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Tag"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
