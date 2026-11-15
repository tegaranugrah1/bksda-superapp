"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Building2,
  Shield,
  Users,
  Loader2,
  Lock,
  Globe,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TablePaginationFooter } from "../_components/TablePaginationFooter";
import { type IBmnLocation } from "../_lib/types";

interface LocationManagementTabProps {
  locations?: IBmnLocation[];
  isLoading?: boolean;
  canManage: boolean;
  isSuperAdmin: boolean;
}

type LocType = "balai" | "seksi" | "room" | "resor";

export function LocationManagementTab({
  locations: locationsProp,
  isLoading: isLoadingProp,
  canManage,
  isSuperAdmin,
}: LocationManagementTabProps) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);

  const { data: fetchedLocations = [], isLoading: isQueryLoading } = useQuery<IBmnLocation[]>({
    queryKey: ["master-locations", "all"],
    queryFn: async () => {
      const res = await api.get("/locations");
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    enabled: locationsProp === undefined,
  });

  const locations = locationsProp ?? fetchedLocations;
  const isLoading = isLoadingProp ?? (locationsProp === undefined ? isQueryLoading : false);

  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<IBmnLocation | null>(null);
  const [locType, setLocType] = useState<LocType>("room");
  const [parentId, setParentId] = useState("");
  const [unitKerja, setUnitKerja] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const parentUnits = useMemo(() => {
    return locations
      .filter((l) => l.location_type === "balai" || l.location_type === "seksi")
      .sort((a, b) => {
        if (a.location_type === "balai" && b.location_type !== "balai") return -1;
        if (a.location_type !== "balai" && b.location_type === "balai") return 1;
        return a.name.localeCompare(b.name, "id");
      });
  }, [locations]);

  const seksiParents = useMemo(
    () => parentUnits.filter((l) => l.location_type === "seksi"),
    [parentUnits]
  );

  // Build hierarchical display list: each parent followed cleanly by its filtered children + orphan rows
  const displayRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesQuery = (loc: IBmnLocation) => {
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.unit_kerja.toLowerCase().includes(q) ||
        (loc.code || "").toLowerCase().includes(q) ||
        (loc.description || "").toLowerCase().includes(q)
      );
    };

    const rows: Array<{ item: IBmnLocation; depth: 0 | 1 }> = [];
    const seen = new Set<string>();

    for (const p of parentUnits) {
      if (unitFilter !== "all" && p.id !== unitFilter) continue;
      const children = locations
        .filter((c) => c.parent_id === p.id)
        .sort((a, b) => a.name.localeCompare(b.name, "id"));
      const matchedChildren = children.filter(matchesQuery);
      if (matchesQuery(p) || matchedChildren.length > 0) {
        rows.push({ item: p, depth: 0 });
        seen.add(p.id);
        for (const c of matchedChildren) {
          rows.push({ item: c, depth: 1 });
          seen.add(c.id);
        }
      }
    }

    // Legacy / orphan rows without matching hierarchical parent
    for (const loc of locations) {
      if (seen.has(loc.id)) continue;
      if (unitFilter !== "all" && loc.parent_id !== unitFilter && loc.unit_kerja !== unitFilter) continue;
      if (matchesQuery(loc)) {
        rows.push({ item: loc, depth: loc.parent_id ? 1 : 0 });
      }
    }

    return rows;
  }, [locations, parentUnits, search, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = displayRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const invalidateLocationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bmn-locations"] }),
      queryClient.invalidateQueries({ queryKey: ["master-locations"] }),
      queryClient.invalidateQueries({ queryKey: ["employees"] }),
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] }),
      queryClient.invalidateQueries({ queryKey: ["drive"] }),
    ]);
  };

  const openCreateModal = (presetType: LocType = "room", presetParentId = "") => {
    setEditingLoc(null);
    setLocType(presetType);
    const defaultParent =
      presetParentId ||
      (presetType === "resor" ? seksiParents[0]?.id || "" : parentUnits[0]?.id || "");
    setParentId(presetType === "seksi" || presetType === "balai" ? "" : defaultParent);
    const matchedParent = parentUnits.find((p) => p.id === defaultParent);
    setUnitKerja(matchedParent?.unit_kerja || "");
    setName("");
    setCode("");
    setDescription("");
    setIsRestricted(presetType === "resor");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (loc: IBmnLocation) => {
    setEditingLoc(loc);
    setLocType(loc.location_type || (loc.parent_id ? "room" : "room"));
    setParentId(loc.parent_id || "");
    setUnitKerja(loc.unit_kerja || "");
    setName(loc.name);
    setCode(loc.code || "");
    setDescription(loc.description || "");
    setIsRestricted(Boolean(loc.is_restricted));
    setIsActive(loc.is_active !== false);
    setModalOpen(true);
  };

  const availableParents = locType === "resor" ? seksiParents : parentUnits;
  const needsParent = (locType === "room" || locType === "resor") && availableParents.length > 0;
  const canSubmit =
    !isSaving &&
    name.trim().length > 0 &&
    (locType === "seksi" || locType === "balai"
      ? true
      : needsParent
        ? Boolean(parentId)
        : unitKerja.trim().length > 0);

  const handleSave = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const selectedParent = parentUnits.find((p) => p.id === parentId);
      const payload: Record<string, unknown> = {
        location_type: locType,
        name: name.trim(),
        description: description.trim() || null,
        is_restricted: isRestricted,
        is_active: isActive,
      };
      if (code.trim()) {
        payload.code = code.trim();
      }
      if (locType === "seksi" || locType === "balai") {
        payload.parent_id = null;
        payload.unit_kerja = editingLoc ? (unitKerja.trim() || name.trim()) : name.trim();
      } else if (parentId) {
        payload.parent_id = parentId;
        payload.unit_kerja = selectedParent?.unit_kerja || selectedParent?.name || unitKerja.trim();
      } else {
        payload.unit_kerja = unitKerja.trim();
      }

      if (editingLoc) {
        const res = await api.put(`/locations/${editingLoc.id}`, payload);
        toast.success(res.data?.message || "Lokasi berhasil diperbarui.");
      } else {
        const res = await api.post("/locations", payload);
        toast.success(res.data?.message || "Lokasi berhasil ditambahkan.");
      }
      await invalidateLocationQueries();
      setModalOpen(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menyimpan lokasi.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (loc: IBmnLocation) => {
    const confirmed = await confirm({
      title: `Hapus Lokasi "${loc.name}"?`,
      description:
        "Lokasi hanya dapat dihapus jika tidak memiliki ruangan/resor turunan, aset BMN, pegawai aktif, atau arsip BKSDA Drive.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await api.delete(`/locations/${loc.id}`);
      toast.success(res.data?.message || "Lokasi berhasil dihapus.");
      await invalidateLocationQueries();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Lokasi gagal dihapus.";
      toast.error(message);
    }
  };

  const getDeleteBlockedReason = (loc: IBmnLocation): string | undefined => {
    const reasons: string[] = [];
    if ((loc.children_count || 0) > 0) {
      reasons.push(`${loc.children_count} sub-lokasi`);
    }
    if ((loc.assets_count || 0) > 0) {
      reasons.push(`${loc.assets_count} aset BMN`);
    }
    if ((loc.active_employees_count || 0) > 0) {
      reasons.push(`${loc.active_employees_count} pegawai aktif`);
    }
    if (reasons.length === 0) return undefined;
    return `Tidak dapat dihapus karena masih memiliki ${reasons.join(", ")}.`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--ds-fg-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari seksi, ruangan, resor, atau kode..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-solid)]/30"
            />
          </div>

          {parentUnits.length > 0 && (
            <select
              aria-label="Filter Unit Induk"
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-solid)]/30"
            >
              <option value="all">Semua Unit Induk</option>
              {parentUnits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openCreateModal("seksi")}
                className="rounded-xl text-xs font-semibold gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                Tambah Seksi / Unit Baru
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              ref={returnFocusRef}
              onClick={() => openCreateModal("room")}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Lokasi Baru
            </Button>
          </div>
        )}
      </div>

      {/* Hierarchical Table */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[var(--ds-fg-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat Master Lokasi...
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="p-10 text-center text-xs text-[var(--ds-fg-muted)]">
            Tidak ada lokasi yang sesuai dengan pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]/60 text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  <th className="py-3 px-4">Lokasi / Penempatan</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">Akses BKSDA Drive</th>
                  <th className="py-3 px-3 text-center">Pegawai Aktif</th>
                  <th className="py-3 px-3 text-center">Aset BMN</th>
                  {canManage && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)] text-xs">
                {paginatedRows.map(({ item: loc, depth }) => {
                  const isParentUnit = loc.location_type === "balai" || loc.location_type === "seksi";
                  const blockedReason = getDeleteBlockedReason(loc);
                  const canEditRow = canManage && (!isParentUnit || isSuperAdmin);
                  const canDeleteRow = canManage && (!isParentUnit || isSuperAdmin);

                  return (
                    <tr
                      key={loc.id}
                      className={cn(
                        "transition-colors hover:bg-[var(--ds-surface-muted)]/40",
                        isParentUnit && "bg-[var(--ds-surface-muted)]/25"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className={cn("flex items-start gap-2.5", depth === 1 && "pl-6")}>
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                              isParentUnit
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : loc.location_type === "resor"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                            )}
                          >
                            {isParentUnit ? (
                              <Building2 className="w-3.5 h-3.5" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "text-[var(--ds-fg)]",
                                  isParentUnit ? "font-bold" : "font-semibold"
                                )}
                              >
                                {loc.name}
                              </span>
                              {loc.code && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] font-mono text-[10px] text-[var(--ds-fg-muted)]">
                                  {loc.code}
                                </span>
                              )}
                              {loc.is_active === false && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 text-[10px] font-semibold">
                                  Nonaktif
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--ds-fg-muted)] mt-0.5">
                              {loc.unit_kerja}
                              {loc.description ? ` • ${loc.description}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {loc.location_type === "balai" ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Induk Balai
                          </span>
                        ) : loc.location_type === "seksi" ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Induk Seksi
                          </span>
                        ) : loc.location_type === "resor" ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            Resor KSDA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border border-[var(--ds-border-subtle)]">
                            Ruangan / Urusan
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isParentUnit ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ds-fg-muted)]">
                            <HardDrive className="w-3 h-3" />
                            {loc.drive_unit?.slug || "Terhubung Unit"}
                          </span>
                        ) : loc.is_restricted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            <Lock className="w-3 h-3" />
                            Terisolasi (Khusus Staf)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                            <Globe className="w-3 h-3" />
                            Terbuka se-Unit
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ds-surface-muted)] text-[11px] font-medium text-[var(--ds-fg)]">
                          <Users className="w-3 h-3 text-[var(--ds-fg-muted)]" />
                          {loc.active_employees_count ?? 0}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--ds-surface-muted)] text-[11px] font-medium text-[var(--ds-fg)]">
                          {loc.assets_count ?? 0}
                        </span>
                      </td>

                      {canManage && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            {isParentUnit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Tambah ruangan/resor di bawah unit ini"
                                onClick={() =>
                                  openCreateModal(loc.location_type === "seksi" ? "resor" : "room", loc.id)
                                }
                                className="h-7 px-2 rounded-lg text-[11px] text-emerald-600 hover:text-emerald-700"
                              >
                                <Plus className="w-3.5 h-3.5 mr-0.5" />
                                Sub
                              </Button>
                            )}
                            {canEditRow && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Edit lokasi"
                                onClick={() => openEditModal(loc)}
                                className="h-7 w-7 p-0 rounded-lg"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {canDeleteRow && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={Boolean(blockedReason)}
                                title={blockedReason || "Hapus lokasi"}
                                onClick={() => handleDelete(loc)}
                                className="h-7 w-7 p-0 rounded-lg text-rose-500 hover:text-rose-600 disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <TablePaginationFooter
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={displayRows.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
          itemLabel="lokasi"
        />
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="sm:max-w-lg rounded-2xl"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--ds-accent-fg)]" />
              {editingLoc ? `Edit Lokasi: ${editingLoc.name}` : "Tambah Lokasi Terintegrasi"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perubahan di Master Lokasi otomatis menyinkronkan Penempatan Pegawai, BMN, dan Folder BKSDA Drive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Location Type Selector */}
            {!editingLoc && (
              <div>
                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1.5">
                  Jenis Lokasi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLocType("room");
                      setIsRestricted(false);
                      if (!parentId && parentUnits[0]) setParentId(parentUnits[0].id);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all",
                      locType === "room"
                        ? "border-[var(--ds-accent-solid)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                        : "border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)]"
                    )}
                  >
                    Ruangan / Urusan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocType("resor");
                      setIsRestricted(true);
                      if (seksiParents[0]) setParentId(seksiParents[0].id);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all",
                      locType === "resor"
                        ? "border-[var(--ds-accent-solid)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                        : "border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)]"
                    )}
                  >
                    Resor KSDA
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocType("seksi");
                        setParentId("");
                        setIsRestricted(false);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all",
                        locType === "seksi"
                          ? "border-[var(--ds-accent-solid)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                          : "border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)]"
                      )}
                    >
                      Seksi Baru (Lv 1)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Parent Selector for room/resor */}
            {(locType === "room" || locType === "resor") && availableParents.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                  {locType === "resor" ? "Seksi Wilayah Induk (Wajib SKW)" : "Unit Induk (Balai / Seksi)"}
                </label>
                <select
                  aria-label="Unit Induk"
                  value={parentId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setParentId(nextId);
                    const p = availableParents.find((item) => item.id === nextId);
                    if (p) setUnitKerja(p.unit_kerja || p.name);
                  }}
                  className="w-full h-9 px-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg)]"
                >
                  <option value="">-- Pilih Unit Induk --</option>
                  {availableParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fallback unit_kerja if editing or no structured parents */}
            {(locType === "seksi" || locType === "balai" || availableParents.length === 0) && (
              <div>
                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                  Nama Unit Kerja
                </label>
                <input
                  type="text"
                  value={unitKerja}
                  onChange={(e) => setUnitKerja(e.target.value)}
                  placeholder={locType === "seksi" ? "Contoh: SKW IV Tarakan" : "Unit Kerja"}
                  className="w-full h-9 px-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg)]"
                />
              </div>
            )}

            {/* Location Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                {locType === "seksi"
                  ? "Nama Resmi Seksi Wilayah *"
                  : locType === "resor"
                    ? "Nama Resor KSDA *"
                    : "Nama Ruangan / Lokasi *"}
              </label>
              <input
                type="text"
                aria-label="Nama Lokasi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  locType === "seksi"
                    ? "Seksi KSDA Wilayah IV Tarakan"
                    : locType === "resor"
                      ? "Resor 15. Nunukan"
                      : "Urusan Kepegawaian & Umum"
                }
                className="w-full h-9 px-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg)]"
              />
            </div>

            {/* Code + Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                  Kode (Opsional)
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Otomatis jika kosong"
                  className="w-full h-9 px-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs font-mono text-[var(--ds-fg)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan singkat lokasi"
                  className="w-full h-9 px-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg)]"
                />
              </div>
            </div>

            {/* Drive Restriction & Active Toggles */}
            {(locType === "room" || locType === "resor") && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRestricted}
                  onChange={(e) => setIsRestricted(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <div>
                  <span className="block text-xs font-semibold text-[var(--ds-fg)]">
                    Isolasi Folder di BKSDA Drive (`is_restricted`)
                  </span>
                  <span className="block text-[11px] text-[var(--ds-fg-muted)]">
                    Jika aktif, hanya pegawai yang ditempatkan di lokasi ini (atau pemilik Share/Manager eksplisit) yang dapat membuka foldernya.
                  </span>
                </div>
              </label>
            )}

            {editingLoc && (
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--ds-fg)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                Lokasi aktif (tampil di pilihan penempatan pegawai &amp; modul lain)
              </label>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={handleSave}
              className="rounded-xl text-xs font-semibold"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Simpan Lokasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
