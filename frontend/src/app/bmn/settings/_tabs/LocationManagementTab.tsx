"use client";

import { useState, useMemo, useRef } from "react";
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
  const formTrigger = useRef<HTMLElement | null>(null);
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
    formTrigger.current = document.activeElement as HTMLElement | null;
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
    formTrigger.current = document.activeElement as HTMLElement | null;
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
    if (!canManage) return;
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
      contentModule: "bmn",
      contentClassName: "bmn-assets-ui bmn-standard-ui bmn-popover",
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
        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Total Ruangan / Resor
            </p>
            <p className="text-2xl font-bold text-[var(--ds-fg)] mt-1">
              {locations.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Unit Kerja / Seksi Wilayah
            </p>
            <p className="text-2xl font-bold text-[var(--ds-fg)] mt-1">
              {availableUnits.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Aset Terdaftar di Lokasi
            </p>
            <p className="text-2xl font-bold text-[var(--ds-fg)] mt-1">
              {totalAssetsInLocations}
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
              placeholder="Cari nama ruangan atau unit kerja..."
              aria-label="Cari lokasi"
                  value={locationSearch}
              onChange={(e) => {
                setLocationSearch(e.target.value);
                setLocationPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
            />
          </div>
          <select
            aria-label="Filter Unit Kerja"
                  value={unitFilter}
            onChange={(e) => {
              setUnitFilter(e.target.value);
              setLocationPage(1);
            }}
            className="h-9 px-3 text-xs border border-[var(--ds-border-subtle)] rounded-xl bg-[var(--ds-surface)] text-[var(--ds-fg-secondary)]"
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
            className="rounded-xl gap-2 text-xs bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah Lokasi Baru
          </Button>
        )}
      </div>

      {/* Locations Table */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className={`${totalLocationItems > 0 ? "bmn-wide-table" : ""} w-full text-left`}>
            <thead className={totalLocationItems > 0 ? "" : "hidden sm:table-header-group"}>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Nama Ruangan / Resor
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Unit Kerja / Wilayah
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
                  <td colSpan={canManage ? 5 : 4} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--ds-accent-fg)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--ds-fg-muted)]">Memuat master lokasi...</p>
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="p-12 text-center">
                    <MapPin className="w-10 h-10 mx-auto mb-2 text-[var(--ds-fg-muted)]" />
                    <p className="text-sm text-[var(--ds-fg-muted)] font-medium">
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
                    className="bmn-table-row group"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-xs text-[var(--ds-fg)] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[var(--ds-accent-fg)] shrink-0" />
                        {loc.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)]">
                        <Building className="w-3 h-3 text-[var(--ds-fg-muted)]" />
                        {loc.unit_kerja}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-[var(--ds-fg-muted)] max-w-sm truncate">
                        {loc.description || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                          (loc.assets_count || 0) > 0
                            ? "bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  border border-[var(--ds-accent-soft-border)] "
                            : "bg-[var(--ds-surface-muted)]  text-[var(--ds-fg-muted)]"
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
                            className="bmn-icon-action p-1.5 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            disabled={(loc.assets_count || 0) > 0}
                            onClick={() => handleDeleteLocation(loc)}
                            title={
                              (loc.assets_count || 0) > 0
                                ? `Tidak dapat dihapus (${loc.assets_count} aset terkait)`
                                : "Hapus Lokasi"
                            }
                            className={cn(
                              "bmn-icon-danger p-1.5 rounded-lg",
                              (loc.assets_count || 0) > 0
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
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); formTrigger.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto">
          <form onSubmit={handleSubmitLocation}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[var(--ds-accent-fg)]" />
                {editingLocation ? "Edit Lokasi & Ruangan" : "Tambah Lokasi Baru"}
              </DialogTitle>
              <DialogDescription>
                Data master ruangan dan resor untuk standarisasi penempatan aset BMN.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Unit Kerja / Wilayah <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <select
                  aria-label="Unit Kerja atau Wilayah"
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
                  className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm text-[var(--ds-fg)]"
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
                  <div className="mt-2 space-y-1">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Ketik nama Unit Kerja baru..."
                      aria-label="Unit Kerja Baru"
                  value={customUnitInput}
                      onChange={(e) => setCustomUnitInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-accent-soft-border)] rounded-xl text-sm text-[var(--ds-fg)]"
                    />
                    <div className="flex items-center justify-between text-xs text-[var(--ds-fg-muted)]">
                      <span>Ketik nama unit kerja baru untuk ruangan ini.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomUnit(false);
                          setLocationUnitKerja(availableUnits[0] || STANDARD_UNIT_KERJA[0]);
                        }}
                        className="text-[var(--ds-accent-fg)] hover:underline font-medium"
                      >
                        Batal (Pilih Opsi Ada)
                      </button>
                    </div>
                  </div>
                )}
                {!isCustomUnit && (
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                    Pilih salah satu dari unit kerja Balai / Seksi Wilayah BKSDA.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Nama Ruangan / Resor <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: Urusan Umum, Resor 01. Berau, Gudang..."
                  aria-label="Nama Ruangan atau Resor"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg-secondary)] block mb-1">
                  Keterangan Tambahan <span className="text-[var(--ds-fg-muted)] font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Detail letak gedung, lantai, atau fungsi ruangan..."
                  aria-label="Keterangan Lokasi"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-sm"
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
                className="rounded-xl gap-2"
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
