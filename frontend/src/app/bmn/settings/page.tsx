"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
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
  Layers,
  Check,
  MapPin,
  Building,
  Box,
  Car,
  Landmark,
  Wrench,
  HelpCircle,
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
} from "../_lib/tag-utils";

export interface IBmnLocation {
  id: string;
  unit_kerja: string;
  name: string;
  description?: string | null;
  assets_count?: number;
}

export interface IBmnAssetType {
  id: string;
  name: string;
  category_mode: "kendaraan" | "tanah" | "bangunan" | "peralatan";
  description?: string | null;
  assets_count?: number;
}

const STANDARD_UNIT_KERJA = [
  "Kantor Balai KSDA Kalimantan Timur",
  "Seksi KSDA Wilayah I (Berau)",
  "Seksi KSDA Wilayah II (Tenggarong)",
  "Seksi KSDA Wilayah III (Balikpapan)",
];

export default function BmnSettingsPage() {
  const [activeTab, setActiveTab] = useState<"tags" | "locations" | "asset-types">("tags");

  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { hasPermission } = useRole();
  const canManage = hasPermission("bmn.asset.update");

  // ==========================================
  // 1. DATA QUERIES
  // ==========================================
  const { data: tags = [], isLoading: isLoadingTags } = useQuery<IBmnTag[]>({
    queryKey: ["bmn-tags"],
    queryFn: async () => {
      const res = await api.get("/bmn/tags");
      return res.data.data || [];
    },
  });

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<IBmnLocation[]>({
    queryKey: ["bmn-locations"],
    queryFn: async () => {
      const res = await api.get("/bmn/locations");
      return res.data.data || [];
    },
  });

  const { data: assetTypes = [], isLoading: isLoadingAssetTypes } = useQuery<IBmnAssetType[]>({
    queryKey: ["bmn-asset-types"],
    queryFn: async () => {
      const res = await api.get("/bmn/asset-types");
      return res.data.data || [];
    },
  });

  // ==========================================
  // 2. TAGS TAB STATE & HANDLERS
  // ==========================================
  const [tagSearch, setTagSearch] = useState("");
  const [isTagFormOpen, setIsTagFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<IBmnTag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("emerald");
  const [tagDescription, setTagDescription] = useState("");
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const [tagPage, setTagPage] = useState(1);
  const [tagPageSize, setTagPageSize] = useState(10);

  const filteredTags = useMemo(() => {
    if (!tagSearch) return tags;
    const term = tagSearch.toLowerCase().replace(/^#/, "");
    return tags.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.label.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term))
    );
  }, [tags, tagSearch]);

  const totalTagItems = filteredTags.length;
  const totalTagPages = tagPageSize === 0 ? 1 : Math.max(1, Math.ceil(totalTagItems / tagPageSize));
  const activeTagPage = Math.min(tagPage, totalTagPages);

  const paginatedTags = useMemo(() => {
    if (tagPageSize === 0) return filteredTags;
    const start = (activeTagPage - 1) * tagPageSize;
    return filteredTags.slice(start, start + tagPageSize);
  }, [filteredTags, activeTagPage, tagPageSize]);

  const totalAssetsTagged = useMemo(() => {
    return tags.reduce((acc, t) => acc + (t.assets_count || 0), 0);
  }, [tags]);

  const handleOpenCreateTag = () => {
    setEditingTag(null);
    setTagName("");
    setTagColor("emerald");
    setTagDescription("");
    setIsTagFormOpen(true);
  };

  const handleOpenEditTag = (tag: IBmnTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || "emerald");
    setTagDescription(tag.description || "");
    setIsTagFormOpen(true);
  };

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      toast.error("Nama tag tidak boleh kosong.");
      return;
    }

    setIsSubmittingTag(true);
    try {
      const payload = {
        name: tagName.trim(),
        color: tagColor,
        description: tagDescription.trim() || null,
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
    const affectedCount = tag.assets_count || 0;
    const ok = await confirm({
      title: `Hapus Tag ${tag.label}?`,
      description:
        affectedCount > 0
          ? `Tag ${tag.label} saat ini digunakan oleh ${affectedCount} aset. Jika dihapus, tag ini akan otomatis dilepas dari semua aset tersebut tanpa menghapus datanya.`
          : `Yakin ingin menghapus tag ${tag.label}?`,
      confirmText: `Ya, Hapus ${tag.label}`,
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/bmn/tags/${tag.id}`);
      toast.success(`Tag ${tag.label} berhasil dihapus.`);
      queryClient.invalidateQueries({ queryKey: ["bmn-tags"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch {
      toast.error("Gagal menghapus tag.");
    }
  };

  // ==========================================
  // 3. LOCATIONS TAB STATE & HANDLERS
  // ==========================================
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
    if (isKnown) {
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
    const finalUnit = isCustomUnit ? customUnitInput.trim() : locationUnitKerja.trim();
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

  // ==========================================
  // 4. ASSET TYPES TAB STATE & HANDLERS
  // ==========================================
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
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
              <Layers className="w-5 h-5" />
            </span>
            Pengaturan & Master Data BMN
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Konfigurasi tagifikasi aset, master lokasi & ruangan, serta klasifikasi jenis Barang Milik Negara.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("tags")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "tags"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <TagIcon className="w-4 h-4" />
          Tag Aset
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold ml-1">
            {tags.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("locations")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "locations"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <MapPin className="w-4 h-4" />
          Lokasi & Ruangan
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold ml-1">
            {locations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("asset-types")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "asset-types"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <Box className="w-4 h-4" />
          Jenis BMN
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold ml-1">
            {assetTypes.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: TAG ASET */}
      {/* ======================================================== */}
      {activeTab === "tags" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Tag
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {tags.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <TagIcon className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Asosiasi Aset Terpasang
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {totalAssetsTagged}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Standarisasi Tag
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Diawali tanda <b>#</b> (contoh: <code>#motor</code>, <code>#mobil</code>, <code>#balai</code>)
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau deskripsi tag..."
                value={tagSearch}
                onChange={(e) => {
                  setTagSearch(e.target.value);
                  setTagPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            {canManage && (
              <Button
                onClick={handleOpenCreateTag}
                size="sm"
                className="rounded-xl gap-2 text-xs bg-emerald-600 hover:bg-emerald-500"
              >
                <Plus className="w-4 h-4" /> Tambah Tag Baru
              </Button>
            )}
          </div>

          {/* Tags Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Badge Tag
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Slug Sistem
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Warna
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
                  {isLoadingTags ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="p-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Memuat daftar tag...</p>
                      </td>
                    </tr>
                  ) : filteredTags.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="p-12 text-center">
                        <TagIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
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
                      return (
                        <tr
                          key={tag.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                        >
                          <td className="px-5 py-3.5">
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
                          </td>
                          <td className="px-5 py-3.5">
                            <code className="text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {tag.name}
                            </code>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm",
                                  AVAILABLE_TAG_COLORS.find((c) => c.key === tag.color)?.class || "bg-emerald-500"
                                )}
                              />
                              <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                                {AVAILABLE_TAG_COLORS.find((c) => c.key === tag.color)?.label || tag.color}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm truncate">
                              {tag.description || "-"}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {tag.assets_count || 0}
                            </span>
                          </td>
                          {canManage && (
                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditTag(tag)}
                                  title="Edit Tag"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTag(tag)}
                                  title="Hapus Tag"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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

            {/* Pagination Footer */}
            {filteredTags.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/30 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {tagPageSize === 0 ? 1 : Math.min(totalTagItems, (activeTagPage - 1) * tagPageSize + 1)}
                    </span>
                    {" - "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {tagPageSize === 0 ? totalTagItems : Math.min(totalTagItems, activeTagPage * tagPageSize)}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {totalTagItems}
                    </span>{" "}
                    tag
                  </span>
                  <select
                    value={tagPageSize}
                    onChange={(e) => {
                      setTagPageSize(Number(e.target.value));
                      setTagPage(1);
                    }}
                    className="h-7 px-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value={10}>10 / halaman</option>
                    <option value={25}>25 / halaman</option>
                    <option value={50}>50 / halaman</option>
                    <option value={0}>Semua</option>
                  </select>
                </div>
                {totalTagPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeTagPage === 1}
                      onClick={() => setTagPage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs rounded-lg px-2.5"
                    >
                      Prev
                    </Button>
                    <span className="text-slate-500 dark:text-slate-400 px-1 font-medium">
                      Hal {activeTagPage} / {totalTagPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeTagPage === totalTagPages}
                      onClick={() => setTagPage((p) => Math.min(totalTagPages, p + 1))}
                      className="h-7 text-xs rounded-lg px-2.5"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LOKASI & RUANGAN */}
      {/* ======================================================== */}
      {activeTab === "locations" && (
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
                  {isLoadingLocations ? (
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

            {/* Pagination Footer */}
            {filteredLocations.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/30 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {locationPageSize === 0 ? 1 : Math.min(totalLocationItems, (activeLocationPage - 1) * locationPageSize + 1)}
                    </span>
                    {" - "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {locationPageSize === 0 ? totalLocationItems : Math.min(totalLocationItems, activeLocationPage * locationPageSize)}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {totalLocationItems}
                    </span>{" "}
                    lokasi
                  </span>
                  <select
                    value={locationPageSize}
                    onChange={(e) => {
                      setLocationPageSize(Number(e.target.value));
                      setLocationPage(1);
                    }}
                    className="h-7 px-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value={10}>10 / halaman</option>
                    <option value={25}>25 / halaman</option>
                    <option value={50}>50 / halaman</option>
                    <option value={0}>Semua</option>
                  </select>
                </div>
                {totalLocationPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeLocationPage === 1}
                      onClick={() => setLocationPage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs rounded-lg px-2.5"
                    >
                      Prev
                    </Button>
                    <span className="text-slate-500 dark:text-slate-400 px-1 font-medium">
                      Hal {activeLocationPage} / {totalLocationPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeLocationPage === totalLocationPages}
                      onClick={() => setLocationPage((p) => Math.min(totalLocationPages, p + 1))}
                      className="h-7 text-xs rounded-lg px-2.5"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: JENIS BMN */}
      {/* ======================================================== */}
      {activeTab === "asset-types" && (
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
              <div className="relative flex-1 min-w-[200px]">
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
                      Mode Formulir
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
                  {isLoadingAssetTypes ? (
                    <tr>
                      <td colSpan={canManage ? 5 : 4} className="p-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Memuat master jenis BMN...</p>
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

            {/* Pagination Footer */}
            {filteredAssetTypes.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/30 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {typePageSize === 0 ? 1 : Math.min(totalTypeItems, (activeTypePage - 1) * typePageSize + 1)}
                    </span>
                    {" - "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {typePageSize === 0 ? totalTypeItems : Math.min(totalTypeItems, activeTypePage * typePageSize)}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {totalTypeItems}
                    </span>{" "}
                    jenis BMN
                  </span>
                  <select
                    value={typePageSize}
                    onChange={(e) => {
                      setTypePageSize(Number(e.target.value));
                      setTypePage(1);
                    }}
                    className="h-7 px-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value={10}>10 / halaman</option>
                    <option value={25}>25 / halaman</option>
                    <option value={50}>50 / halaman</option>
                    <option value={0}>Semua</option>
                  </select>
                </div>
                {totalTypePages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeTypePage === 1}
                      onClick={() => setTypePage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs rounded-lg px-2.5"
                    >
                      Prev
                    </Button>
                    <span className="text-slate-500 dark:text-slate-400 px-1 font-medium">
                      Hal {activeTypePage} / {totalTypePages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeTypePage === totalTypePages}
                      onClick={() => setTypePage((p) => Math.min(totalTypePages, p + 1))}
                      className="h-7 text-xs rounded-lg px-2.5"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG: CREATE / EDIT TAG */}
      {/* ======================================================== */}
      <Dialog open={isTagFormOpen} onOpenChange={setIsTagFormOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleSubmitTag}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-emerald-600" />
                {editingTag ? "Edit Tag Aset" : "Tambah Tag Aset Baru"}
              </DialogTitle>
              <DialogDescription>
                Tag digunakan untuk mengelompokkan dan menandai aset BMN (diawali tanda #).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Tag <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    #
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="misal: motor, mobil, speed, balai..."
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value.replace(/^#/, ""))}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ketik nama tag tanpa spasi. Tanda # akan ditambahkan secara otomatis.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Warna Badge:{" "}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                      {AVAILABLE_TAG_COLORS.find((c) => c.key === tagColor)?.label || tagColor}
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400">22 pilihan warna</span>
                </div>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl justify-start items-center">
                  {AVAILABLE_TAG_COLORS.map((color) => {
                    const isSelected = tagColor === color.key;
                    return (
                      <button
                        key={color.key}
                        type="button"
                        title={color.label}
                        onClick={() => setTagColor(color.key)}
                        className={cn(
                          "w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all duration-150 relative shadow-xs shrink-0",
                          color.class,
                          isSelected
                            ? "ring-2 ring-offset-2 ring-emerald-600 dark:ring-offset-slate-900 scale-110 z-10"
                            : "hover:scale-115 opacity-85 hover:opacity-100 hover:shadow-sm"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Preview Tampilan Tag:
                </p>
                <div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs transition-all",
                      getTagColorClasses(tagColor).bg,
                      getTagColorClasses(tagColor).text,
                      getTagColorClasses(tagColor).border
                    )}
                  >
                    <TagIcon className="w-3 h-3" />
                    #{tagName.trim().replace(/^#/, "").toLowerCase() || "contoh"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan kegunaan tag..."
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                disabled={isSubmittingTag || !tagName.trim()}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 gap-2"
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

      {/* ======================================================== */}
      {/* DIALOG: CREATE / EDIT LOKASI */}
      {/* ======================================================== */}
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
                  <option value="__custom__">+ Tambah Unit Kerja Baru (Ketik Manual)...</option>
                </select>

                {isCustomUnit && (
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

      {/* ======================================================== */}
      {/* DIALOG: CREATE / EDIT JENIS BMN */}
      {/* ======================================================== */}
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
