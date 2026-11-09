"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import {
  Tag as TagIcon,
  Layers,
  MapPin,
  Box,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type IBmnTag } from "../_lib/tag-utils";
import { type IBmnLocation, type IBmnAssetType, STANDARD_UNIT_KERJA } from "./_lib/types";
import { TagManagementTab } from "./_tabs/TagManagementTab";
import { LocationManagementTab } from "./_tabs/LocationManagementTab";
import { AssetTypeManagementTab } from "./_tabs/AssetTypeManagementTab";

// Backward-compatibility re-exports
export type { IBmnLocation, IBmnAssetType };
export { STANDARD_UNIT_KERJA };

export default function BmnSettingsPage() {
  const [activeTab, setActiveTab] = useState<"tags" | "locations" | "asset-types">("tags");

  const { hasPermission, isSuperAdmin } = useRole();
  const canManage = hasPermission("bmn.asset.update");

  // ==========================================
  // DATA QUERIES
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
            "relative pb-3 text-sm font-semibold transition-colors duration-150 flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "tags"
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          {activeTab === "tags" && (
            <motion.span
              layoutId="activeSettingsTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <TagIcon className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Tag Aset</span>
          <span className="relative z-10 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold ml-1">
            {tags.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("locations")}
          className={cn(
            "relative pb-3 text-sm font-semibold transition-colors duration-150 flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "locations"
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          {activeTab === "locations" && (
            <motion.span
              layoutId="activeSettingsTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <MapPin className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Lokasi & Ruangan</span>
          <span className="relative z-10 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold ml-1">
            {locations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("asset-types")}
          className={cn(
            "relative pb-3 text-sm font-semibold transition-colors duration-150 flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "asset-types"
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          {activeTab === "asset-types" && (
            <motion.span
              layoutId="activeSettingsTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <Box className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Jenis BMN</span>
          <span className="relative z-10 text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold ml-1">
            {assetTypes.length}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {activeTab === "tags" && (
            <TagManagementTab
              tags={tags}
              isLoading={isLoadingTags}
              canManage={canManage}
            />
          )}

          {activeTab === "locations" && (
            <LocationManagementTab
              locations={locations}
              isLoading={isLoadingLocations}
              canManage={canManage}
              isSuperAdmin={Boolean(isSuperAdmin)}
            />
          )}

          {activeTab === "asset-types" && (
            <AssetTypeManagementTab
              assetTypes={assetTypes}
              isLoading={isLoadingAssetTypes}
              canManage={canManage}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
