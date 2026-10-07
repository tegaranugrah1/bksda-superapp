"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Building,
  Package,
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
import { type IBmnLocation, STANDARD_UNIT_KERJA } from "../_lib/types";

interface LocationManagementTabProps {
  locations: IBmnLocation[];
  isLoading: boolean;
  canManage: boolean;
  isSuperAdmin: boolean;
}

export function LocationManagementTab({
  locations,
  isLoading,
  canManage,
  isSuperAdmin,
}: LocationManagementTabProps) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [locationSearch, setLocationSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("Semua");
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<IBmnLocation | null>(null);
  const [locationUnitKerja, setLocationUnitKerja] = useState("");
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnitInput, setCustomUnitInput] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
  const [locationPage, setLocationPage] = useState(1);
  const [locationPageSize, setLocationPageSize] = useState(10);

  const availableUnits = useMemo(() => {
    const set = new Set([...STANDARD_UNIT_KERJA, ...locations.map((l) => l.unit_kerja)]);
    return Array.from(set).filter(Boolean);
  }, [locations]);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesUnit = unitFilter === "Semua" || loc.unit_kerja === unitFilter;
      if (!matchesUnit) return false;
      if (!locationSearch.trim()) return true;
      const q = locationSearch.toLowerCase().trim();
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.unit_kerja.toLowerCase().includes(q) ||
        (loc.description && loc.description.toLowerCase().includes(q))
      );
    });
  }, [locations, unitFilter, locationSearch]);

  const totalLocationItems = filteredLocations.length;
  const totalLocationPages = locationPageSize === 0 ? 1 : Math.max(1, Math.ceil(totalLocationItems / locationPageSize));
  const activeLocationPage = Math.min(locationPage, totalLocationPages);

  const paginatedLocations = useMemo(() => {
    if (locationPageSize === 0) return filteredLocations;
    const start = (activeLocationPage - 1) * locationPageSize;
    return filteredLocations.slice(start, start + locationPageSize);
  }, [filteredLocations, activeLocationPage, locationPageSize]);

  const totalAssetsInLocations = useMemo(() => {
    return locations.reduce((acc, l) => acc + (l.assets_count || 0), 0);
  }, [locations]);

  const handleOpenCreateLocation = () => {
    setEditingLocation(null);
    setIsCustomUnit(false);
    setCustomUnitInput("");
    const defaultUnit = unitFilter !== "Semua" ? unitFilter : (availableUnits[0] || STANDARD_UNIT_KERJA[0]);
    setLocationUnitKerja(defaultUnit);
    setLocationName("");
    setLocationDescription("");
    setIsLocationFormOpen(true);
  };

  const handleOpenEditLocation = (loc: IBmnLocation) => {
    setEditingLocation(loc);
    const isKnown = availableUnits.includes(loc.unit_kerja);
    if (isKnown || !isSuperAdmin) {
      setIsCustomUnit(false);
      setCustomUnitInput("");
      setLocationUnitKerja(loc.unit_kerja);
    } else {
      setIsCustomUnit(true);
      setCustomUnitInput(loc.unit_kerja);
      setLocationUnitKerja("__custom__");
    }
    setLocationName(loc.name);
    setLocationDescription(loc.description || "");
    setIsLocationFormOpen(true);
  };

  const handleSubmitLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUnit = (isSuperAdmin && isCustomUnit) ? customUnitInput.trim() : locationUnitKerja.trim();
    if (!locationName.trim() || !finalUnit) {
      toast.error("Unit kerja dan nama ruangan wajib diisi.");
      return;
    }

    setIsSubmittingLocation(true);
    try {
      const payload = {
        unit_kerja: finalUnit,
        name: locationName.trim(),
        description: locationDescription.trim() || null,
      };

      if (editingLocation) {
        await api.put(`/bmn/locations/${editingLocation.id}`, payload);
        toast.success(`Lokasi '${locationName}' berhasil diperbarui.`);
      } else {
        await api.post("/bmn/locations", payload);
        toast.success(`Lokasi '${locationName}' berhasil ditambahkan.`);
      }

      queryClient.invalidateQueries({ queryKey: ["bmn-locations"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
      setIsLocationFormOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menyimpan lokasi.";
      toast.error(msg);
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  const handleDeleteLocation = async (loc: IBmnLocation) => {
    if ((loc.assets_count || 0) > 0) {
      toast.error(
        `Lokasi '${loc.name}' tidak dapat dihapus karena masih digunakan oleh ${loc.assets_count} aset BMN. Pindahkan lokasi aset terkait terlebih dahulu.`
      );
      return;
    }

    const ok = await confirm({
      title: `Hapus Lokasi ${loc.name}?`,
      description: `Yakin ingin menghapus ruangan/lokasi ini dari master data?`,
      confirmText: `Ya, Hapus Lokasi`,
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/bmn/locations/${loc.id}`);
      toast.success(`Lokasi '${loc.name}' berhasil dihapus.`);
      queryClient.invalidateQueries({ queryKey: ["bmn-locations"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menghapus lokasi.";
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
              Total Ruangan / Resor
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {locations.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Unit Kerja / Seksi Wilayah
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {availableUnits.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Aset Terdaftar di Lokasi
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {totalAssetsInLocations}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-lg flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama ruangan atau unit kerja..."
              value={locationSearch}
              onChange={(e) => {
                setLocationSearch(e.target.value);
                setLocationPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={unitFilter}
            onChange={(e) => {
              setUnitFilter(e.target.value);
              setLocationPage(1);
            }}
            className="h-9 px-3 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="Semua">Semua Unit Kerja ({locations.length})</option>
            {availableUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <Button
            onClick={handleOpenCreateLocation}
            size="sm"
            className="rounded-xl gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah Lokasi Baru
          </Button>
        )}
      </div>

      {/* Locations Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50">
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nama Ruangan / Resor
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unit Kerja / Wilayah
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Deskripsi
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
                    <p className="text-sm text-slate-400">Memuat master lokasi...</p>
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="p-12 text-center">
                    <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {locationSearch || unitFilter !== "Semua"
                        ? "Tidak ada lokasi yang cocok dengan filter"
                        : "Belum ada lokasi yang ditambahkan"}
                    </p>
                    {canManage && !locationSearch && (
                      <Button
                        onClick={handleOpenCreateLocation}
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-xl gap-2 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Buat Lokasi Pertama
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedLocations.map((loc) => (
                  <tr
                    key={loc.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {loc.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Building className="w-3 h-3 text-slate-400" />
                        {loc.unit_kerja}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm truncate">
                        {loc.description || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                          (loc.assets_count || 0) > 0
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}
                      >
                        {loc.assets_count || 0}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditLocation(loc)}
                            title="Edit Lokasi"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc)}
                            title={
                              (loc.assets_count || 0) > 0
                                ? `Tidak dapat dihapus (${loc.assets_count} aset terkait)`
                                : "Hapus Lokasi"
                            }
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              (loc.assets_count || 0) > 0
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
          totalItems={totalLocationItems}
          pageSize={locationPageSize}
          onPageSizeChange={setLocationPageSize}
          currentPage={activeLocationPage}
          totalPages={totalLocationPages}
          onPageChange={setLocationPage}
          itemLabel="lokasi"
        />
      </div>

      {/* DIALOG: CREATE / EDIT LOKASI */}
      <Dialog open={isLocationFormOpen} onOpenChange={setIsLocationFormOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleSubmitLocation}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                {editingLocation ? "Edit Lokasi & Ruangan" : "Tambah Lokasi Baru"}
              </DialogTitle>
              <DialogDescription>
                Data master ruangan dan resor untuk standarisasi penempatan aset BMN.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Unit Kerja / Wilayah <span className="text-red-500">*</span>
                </label>
                <select
                  value={isCustomUnit ? "__custom__" : locationUnitKerja}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      if (!isSuperAdmin) return;
                      setIsCustomUnit(true);
                      setCustomUnitInput("");
                    } else {
                      setIsCustomUnit(false);
                      setLocationUnitKerja(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200"
                >
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  {isSuperAdmin && (
                    <option value="__custom__">+ Tambah Unit Kerja Baru (Ketik Manual)...</option>
                  )}
                </select>

                {isSuperAdmin && isCustomUnit && (
                  <div className="mt-2 space-y-1 animate-in fade-in zoom-in-95">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Ketik nama Unit Kerja baru..."
                      value={customUnitInput}
                      onChange={(e) => setCustomUnitInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Ketik nama unit kerja baru untuk ruangan ini.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomUnit(false);
                          setLocationUnitKerja(availableUnits[0] || STANDARD_UNIT_KERJA[0]);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Batal (Pilih Opsi Ada)
                      </button>
                    </div>
                  </div>
                )}
                {!isCustomUnit && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pilih salah satu dari unit kerja Balai / Seksi Wilayah BKSDA.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Ruangan / Resor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: Urusan Umum, Resor 01. Berau, Gudang..."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Keterangan Tambahan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Detail letak gedung, lantai, atau fungsi ruangan..."
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLocationFormOpen(false)}
                disabled={isSubmittingLocation}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmittingLocation ||
                  !locationName.trim() ||
                  (isCustomUnit ? !customUnitInput.trim() : !locationUnitKerja.trim())
                }
                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white gap-2"
              >
                {isSubmittingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Lokasi"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
