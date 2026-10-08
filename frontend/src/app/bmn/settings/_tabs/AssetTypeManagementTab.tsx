"use client";

import { useState, useMemo } from "react";
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
    setEditingType(null);
    setTypeName("");
    setTypeCategoryMode("peralatan");
    setTypeDescription("");
    setIsTypeFormOpen(true);
  };

  const handleOpenEditType = (t: IBmnAssetType) => {
    setEditingType(t);
    setTypeName(t.name);
    setTypeCategoryMode(t.category_mode);
    setTypeDescription(t.description || "");
    setIsTypeFormOpen(true);
  };

  const handleSubmitType = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Jenis BMN
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {assetTypes.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Box className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kategori Form Aset
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              4 Mode
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Aset Terklasifikasi
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {totalAssetsInTypes}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-lg flex-wrap">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama jenis BMN atau deskripsi..."
              value={typeSearch}
              onChange={(e) => {
                setTypeSearch(e.target.value);
                setTypePage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={categoryModeFilter}
            onChange={(e) => {
              setCategoryModeFilter(e.target.value);
              setTypePage(1);
            }}
            className="h-9 px-3 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="Semua">Semua Kategori Form</option>
            <option value="kendaraan">🚗 Kendaraan</option>
            <option value="tanah">🗺️ Tanah</option>
            <option value="bangunan">🏢 Bangunan</option>
            <option value="peralatan">⚙️ Peralatan</option>
          </select>
        </div>
        {canManage && (
          <Button
            onClick={handleOpenCreateType}
            size="sm"
            className="rounded-xl gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah Jenis BMN
          </Button>
        )}
      </div>

      {/* Asset Types Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50">
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Jenis BMN
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Kategori Form Spesifik
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Deskripsi Cakupan
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                  Aset Terkait
                </th>
                {canManage && (
                  <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-28">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Memuat klasifikasi jenis BMN...</p>
                  </td>
                </tr>
              ) : filteredAssetTypes.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="p-12 text-center">
                    <Box className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
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
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        {t.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          t.category_mode === "kendaraan"
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                            : t.category_mode === "tanah"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            : t.category_mode === "bangunan"
                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                        )}
                      >
                        {t.category_mode === "kendaraan" && <Car className="w-3 h-3" />}
                        {t.category_mode === "tanah" && <Landmark className="w-3 h-3" />}
                        {t.category_mode === "bangunan" && <Building className="w-3 h-3" />}
                        {t.category_mode === "peralatan" && <Wrench className="w-3 h-3" />}
                        <span className="capitalize">{t.category_mode}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm truncate">
                        {t.description || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                          (t.assets_count || 0) > 0
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
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
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteType(t)}
                            title={
                              (t.assets_count || 0) > 0
                                ? `Tidak dapat dihapus (${t.assets_count} aset terkait)`
                                : "Hapus Jenis BMN"
                            }
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              (t.assets_count || 0) > 0
                                ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                : "text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
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
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleSubmitType}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-600" />
                {editingType ? "Edit Jenis BMN" : "Tambah Jenis BMN Baru"}
              </DialogTitle>
              <DialogDescription>
                Klasifikasi jenis aset BMN dan penentuan mode formulir spesifikasi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Jenis BMN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: ALAT ANGKUTAN BERMOTOR, TANAH, PC/LAPTOP..."
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Standar penamaan menggunakan huruf kapital (UPPERCASE).
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mode Formulir Spesifik <span className="text-red-500">*</span>
                </label>
                <select
                  value={typeCategoryMode}
                  onChange={(e) => setTypeCategoryMode(e.target.value as "kendaraan" | "tanah" | "bangunan" | "peralatan")}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="peralatan">⚙️ Peralatan / Mesin (Non Kendaraan)</option>
                  <option value="kendaraan">🚗 Kendaraan (Memerlukan No Polisi, STNK, BPKB)</option>
                  <option value="bangunan">🏢 Bangunan & Gedung (Memerlukan IMB, Luas Lantai)</option>
                  <option value="tanah">🗺️ Tanah (Memerlukan Sertifikat, Luas Tanah)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Menentukan kolom formulir spesifik yang akan aktif saat input aset.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi Cakupan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh barang atau peruntukan klasifikasi ini..."
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white gap-2"
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
