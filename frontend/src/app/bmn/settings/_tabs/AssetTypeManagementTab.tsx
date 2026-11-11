"use client";

import { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Box,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Layers,
  Package,
  Car,
  Landmark,
  Building,
  Wrench,
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
import { TablePaginationFooter } from "../_components/TablePaginationFooter";
import { type IBmnAssetType } from "../_lib/types";

interface AssetTypeManagementTabProps {
  assetTypes: IBmnAssetType[];
  isLoading: boolean;
  canManage: boolean;
}

export function AssetTypeManagementTab({
  assetTypes,
  isLoading,
  canManage,
}: AssetTypeManagementTabProps) {
  const formTrigger = useRef<HTMLElement | null>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [typeSearch, setTypeSearch] = useState("");
  const [categoryModeFilter, setCategoryModeFilter] = useState("Semua");
  const [isTypeFormOpen, setIsTypeFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<IBmnAssetType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeCategoryMode, setTypeCategoryMode] = useState<"kendaraan" | "tanah" | "bangunan" | "peralatan">("peralatan");
  const [typeDescription, setTypeDescription] = useState("");
  const [isSubmittingType, setIsSubmittingType] = useState(false);
  const [typePage, setTypePage] = useState(1);
  const [typePageSize, setTypePageSize] = useState(10);

  const filteredAssetTypes = useMemo(() => {
    return assetTypes.filter((t) => {
      const matchesCategory = categoryModeFilter === "Semua" || t.category_mode === categoryModeFilter;
      if (!matchesCategory) return false;
      if (!typeSearch.trim()) return true;
      const q = typeSearch.toLowerCase().trim();
      return (
        t.name.toLowerCase().includes(q) ||
        t.category_mode.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    });
  }, [assetTypes, categoryModeFilter, typeSearch]);

  const totalTypeItems = filteredAssetTypes.length;
  const totalTypePages = typePageSize === 0 ? 1 : Math.max(1, Math.ceil(totalTypeItems / typePageSize));
  const activeTypePage = Math.min(typePage, totalTypePages);

  const paginatedAssetTypes = useMemo(() => {
    if (typePageSize === 0) return filteredAssetTypes;
    const start = (activeTypePage - 1) * typePageSize;
    return filteredAssetTypes.slice(start, start + typePageSize);
  }, [filteredAssetTypes, activeTypePage, typePageSize]);

  const totalAssetsInTypes = useMemo(() => {
    return assetTypes.reduce((acc, t) => acc + (t.assets_count || 0), 0);
  }, [assetTypes]);

  const handleOpenCreateType = () => {
    formTrigger.current = document.activeElement as HTMLElement | null;
    setEditingType(null);
    setTypeName("");
    setTypeCategoryMode("peralatan");
    setTypeDescription("");
    setIsTypeFormOpen(true);
  };

  const handleOpenEditType = (t: IBmnAssetType) => {
    formTrigger.current = document.activeElement as HTMLElement | null;
    setEditingType(t);
    setTypeName(t.name);
    setTypeCategoryMode(t.category_mode);
    setTypeDescription(t.description || "");
    setIsTypeFormOpen(true);
  };

  const handleSubmitType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!typeName.trim()) {
      toast.error("Nama jenis BMN wajib diisi.");
      return;
    }

    setIsSubmittingType(true);
    try {
      const payload = {
        name: typeName.trim().toUpperCase(),
        category_mode: typeCategoryMode,
        description: typeDescription.trim() || null,
      };

      if (editingType) {
        await api.put(`/bmn/asset-types/${editingType.id}`, payload);
        toast.success(`Jenis BMN '${payload.name}' berhasil diperbarui.`);
      } else {
        await api.post("/bmn/asset-types", payload);
        toast.success(`Jenis BMN '${payload.name}' berhasil ditambahkan.`);
      }

      queryClient.invalidateQueries({ queryKey: ["bmn-asset-types"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
      setIsTypeFormOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menyimpan jenis BMN.";
      toast.error(msg);
    } finally {
      setIsSubmittingType(false);
    }
  };

  const handleDeleteType = async (t: IBmnAssetType) => {
    if ((t.assets_count || 0) > 0) {
      toast.error(
        `Jenis BMN '${t.name}' tidak dapat dihapus karena masih digunakan oleh ${t.assets_count} aset BMN. Ubah jenis aset terkait terlebih dahulu.`
      );
      return;
    }

    const ok = await confirm({
      title: `Hapus Jenis BMN ${t.name}?`,
      description: `Yakin ingin menghapus klasifikasi jenis BMN ini dari master data?`,
      confirmText: `Ya, Hapus Jenis BMN`,
      variant: "danger",
      contentModule: "bmn",
      contentClassName: "bmn-assets-ui bmn-standard-ui bmn-popover",
    });

    if (!ok) return;

    try {
      await api.delete(`/bmn/asset-types/${t.id}`);
      toast.success(`Jenis BMN '${t.name}' berhasil dihapus.`);
      queryClient.invalidateQueries({ queryKey: ["bmn-asset-types"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menghapus jenis BMN.";
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
              Total Jenis BMN
            </p>
            <p className="text-2xl font-bold text-[var(--ds-fg)] mt-1">
              {assetTypes.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
            <Box className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Kategori Form Aset
            </p>
            <p className="text-2xl font-bold text-[var(--ds-fg)] mt-1">
              4 Mode
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Aset Terklasifikasi
            </p>
            <p className="text-2xl font-bold text-[var(--ds-fg)] mt-1">
              {totalAssetsInTypes}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-lg flex-wrap">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)]" />
            <input
              type="text"
              placeholder="Cari nama jenis BMN atau deskripsi..."
              aria-label="Cari jenis BMN"
                  value={typeSearch}
              onChange={(e) => {
                setTypeSearch(e.target.value);
                setTypePage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
            />
          </div>
          <select
            aria-label="Filter Kategori Form"
                  value={categoryModeFilter}
            onChange={(e) => {
              setCategoryModeFilter(e.target.value);
              setTypePage(1);
            }}
            className="h-9 px-3 text-xs border border-[var(--ds-border-subtle)] rounded-xl bg-[var(--ds-surface)] text-[var(--ds-fg-secondary)]"
          >
            <option value="Semua">Semua Kategori Form</option>
            <option value="kendaraan">Kendaraan</option>
            <option value="tanah">Tanah</option>
            <option value="bangunan">Bangunan</option>
            <option value="peralatan">Peralatan</option>
          </select>
        </div>
        {canManage && (
          <Button
            onClick={handleOpenCreateType}
            size="sm"
            className="rounded-xl gap-2 text-xs bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah Jenis BMN
          </Button>
        )}
      </div>

      {/* Asset Types Table */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className={`${totalTypeItems > 0 ? "bmn-wide-table" : ""} w-full text-left`}>
            <thead className={totalTypeItems > 0 ? "" : "hidden sm:table-header-group"}>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Jenis BMN
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Kategori Form Spesifik
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Deskripsi Cakupan
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
                  <td colSpan={canManage ? 5 : 4} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--ds-accent-fg)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--ds-fg-muted)]">Memuat klasifikasi jenis BMN...</p>
                  </td>
                </tr>
              ) : filteredAssetTypes.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="p-12 text-center">
                    <Box className="w-10 h-10 mx-auto mb-2 text-[var(--ds-fg-muted)]" />
                    <p className="text-sm text-[var(--ds-fg-muted)] font-medium">
                      {typeSearch || categoryModeFilter !== "Semua"
                        ? "Tidak ada jenis BMN yang cocok dengan filter"
                        : "Belum ada jenis BMN yang ditambahkan"}
                    </p>
                    {canManage && !typeSearch && (
                      <Button
                        onClick={handleOpenCreateType}
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-xl gap-2 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Buat Jenis BMN Pertama
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedAssetTypes.map((t) => (
                  <tr
                    key={t.id}
                    className="bmn-table-row group"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-xs text-[var(--ds-fg)] flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-[var(--ds-accent-fg)] shrink-0" />
                        {t.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        data-status="neutral"
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      >
                        {t.category_mode === "kendaraan" && <Car className="w-3 h-3" />}
                        {t.category_mode === "tanah" && <Landmark className="w-3 h-3" />}
                        {t.category_mode === "bangunan" && <Building className="w-3 h-3" />}
                        {t.category_mode === "peralatan" && <Wrench className="w-3 h-3" />}
                        <span className="capitalize">{t.category_mode}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-[var(--ds-fg-muted)] max-w-sm truncate">
                        {t.description || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                          (t.assets_count || 0) > 0
                            ? "bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  border border-[var(--ds-accent-soft-border)] "
                            : "bg-[var(--ds-surface-muted)]  text-[var(--ds-fg-muted)]"
                        )}
                      >
                        {t.assets_count || 0}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditType(t)}
                            title="Edit Jenis BMN"
                            className="bmn-icon-action p-1.5 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            disabled={(t.assets_count || 0) > 0}
                            onClick={() => handleDeleteType(t)}
                            title={
                              (t.assets_count || 0) > 0
                                ? `Tidak dapat dihapus (${t.assets_count} aset terkait)`
                                : "Hapus Jenis BMN"
                            }
                            className={cn(
                              "bmn-icon-danger p-1.5 rounded-lg",
                              (t.assets_count || 0) > 0
                                ? "text-[var(--ds-fg-muted)]  cursor-not-allowed"
                                : "bmn-icon-danger "
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePaginationFooter
          totalItems={totalTypeItems}
          pageSize={typePageSize}
          onPageSizeChange={setTypePageSize}
          currentPage={activeTypePage}
          totalPages={totalTypePages}
          onPageChange={setTypePage}
          itemLabel="jenis BMN"
        />
      </div>

      {/* DIALOG: CREATE / EDIT JENIS BMN */}
      <Dialog open={isTypeFormOpen} onOpenChange={setIsTypeFormOpen}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); formTrigger.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto">
          <form onSubmit={handleSubmitType}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="w-5 h-5 text-[var(--ds-accent-fg)]" />
                {editingType ? "Edit Jenis BMN" : "Tambah Jenis BMN Baru"}
              </DialogTitle>
              <DialogDescription>
                Klasifikasi jenis aset BMN dan penentuan mode formulir spesifikasi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Nama Jenis BMN <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: ALAT ANGKUTAN BERMOTOR, TANAH, PC/LAPTOP..."
                  aria-label="Nama Jenis BMN"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm uppercase"
                />
                <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                  Standar penamaan menggunakan huruf kapital (UPPERCASE).
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Mode Formulir Spesifik <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <select
                  aria-label="Mode Formulir Spesifik"
                  value={typeCategoryMode}
                  onChange={(e) => setTypeCategoryMode(e.target.value as "kendaraan" | "tanah" | "bangunan" | "peralatan")}
                  className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
                >
                  <option value="peralatan">Peralatan / Mesin (Non Kendaraan)</option>
                  <option value="kendaraan">Kendaraan (Memerlukan No Polisi, STNK, BPKB)</option>
                  <option value="bangunan">Bangunan & Gedung (Memerlukan IMB, Luas Lantai)</option>
                  <option value="tanah">Tanah (Memerlukan Sertifikat, Luas Tanah)</option>
                </select>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                  Menentukan kolom formulir spesifik yang akan aktif saat input aset.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Deskripsi Cakupan <span className="text-[var(--ds-fg-muted)] font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh barang atau peruntukan klasifikasi ini..."
                  aria-label="Deskripsi Cakupan"
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTypeFormOpen(false)}
                disabled={isSubmittingType}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingType || !typeName.trim()}
                className="rounded-xl gap-2"
              >
                {isSubmittingType ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Jenis BMN"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
