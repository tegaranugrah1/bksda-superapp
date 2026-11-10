"use client";

import { useId, useState } from "react";
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
import { motion, useReducedMotion } from "framer-motion";
import { BmnTabContent } from "@/app/bmn/_components/BmnTabContent";
import { Button } from "@/components/ui/button";
import { type IBmnTag } from "../_lib/tag-utils";
import { type IBmnLocation, type IBmnAssetType, STANDARD_UNIT_KERJA } from "./_lib/types";
import { TagManagementTab } from "./_tabs/TagManagementTab";
import { LocationManagementTab } from "./_tabs/LocationManagementTab";
import { AssetTypeManagementTab } from "./_tabs/AssetTypeManagementTab";

// Backward-compatibility re-exports
export type { IBmnLocation, IBmnAssetType };
export { STANDARD_UNIT_KERJA };

export default function BmnSettingsPage() {
  const tabsId = useId();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<"tags" | "locations" | "asset-types">("tags");

  const { hasPermission, isSuperAdmin } = useRole();
  const canManage = hasPermission("bmn.asset.update");

  // ==========================================
  // DATA QUERIES
  // ==========================================
  const tagsQuery = useQuery<IBmnTag[]>({
    queryKey: ["bmn-tags"],
    queryFn: async () => {
      const res = await api.get("/bmn/tags");
      return res.data.data || [];
    },
  });

  const locationsQuery = useQuery<IBmnLocation[]>({
    queryKey: ["bmn-locations"],
    queryFn: async () => {
      const res = await api.get("/bmn/locations");
      return res.data.data || [];
    },
  });

  const assetTypesQuery = useQuery<IBmnAssetType[]>({
    queryKey: ["bmn-asset-types"],
    queryFn: async () => {
      const res = await api.get("/bmn/asset-types");
      return res.data.data || [];
    },
  });

  const { data: tags = [], isLoading: isLoadingTags } = tagsQuery;
  const { data: locations = [], isLoading: isLoadingLocations } = locationsQuery;
  const { data: assetTypes = [], isLoading: isLoadingAssetTypes } = assetTypesQuery;
  const activeQuery = activeTab === "tags" ? tagsQuery : activeTab === "locations" ? locationsQuery : assetTypesQuery;
  const tabs = [
    { id: "tags", label: "Tag Aset", icon: TagIcon, count: tags.length },
    { id: "locations", label: "Lokasi & Ruangan", icon: MapPin, count: locations.length },
    { id: "asset-types", label: "Jenis BMN", icon: Box, count: assetTypes.length },
  ] as const;

  return (
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--ds-border-subtle)] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ds-fg)] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
              <Layers className="w-5 h-5" />
            </span>
            Pengaturan & Master Data BMN
          </h1>
          <p className="text-sm text-[var(--ds-fg-muted)] mt-1">
            Konfigurasi tagifikasi aset, master lokasi & ruangan, serta klasifikasi jenis Barang Milik Negara.
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Pengaturan master BMN" className="flex border-b border-[var(--ds-border-subtle)] gap-4 overflow-x-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return <button key={tab.id} type="button" role="tab" id={`${tabsId}-${tab.id}`}
            aria-selected={active} aria-controls={`${tabsId}-panel`} tabIndex={active ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => {
              const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!offset && event.key !== "Home" && event.key !== "End") return;
              event.preventDefault();
              const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (tabs.findIndex(item => item.id === tab.id) + offset + tabs.length) % tabs.length;
              setActiveTab(tabs[index].id);
              const target = document.getElementById(`${tabsId}-${tabs[index].id}`);
              target?.focus();
              target?.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
            className={cn("relative py-3 px-2 text-sm font-semibold flex items-center gap-2 shrink-0 rounded-t-lg hover:bg-[var(--ds-surface-muted)]", active ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)]")}>
            {active && <motion.span layoutId={`${tabsId}-underline`} initial={false} className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ds-accent-fg)]" transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }} />}
            <Icon className="w-4 h-4" /> {tab.label}
            <span className="text-xs rounded-full px-2 py-0.5 bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">{tab.count}</span>
          </button>;
        })}
      </div>

      <BmnTabContent value={activeTab}>
        <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${activeTab}`} tabIndex={0}>
          {activeQuery.isError ? <div role="alert" className="py-8 text-center text-[var(--ds-status-danger-fg)]">
            <p>Master data gagal dimuat.</p>
            <Button variant="outline" className="mt-3" onClick={() => activeQuery.refetch()}>Coba lagi</Button>
          </div> : <>
          {activeTab === "tags" && <TagManagementTab tags={tags} isLoading={isLoadingTags} canManage={canManage} />}
          {activeTab === "locations" && <LocationManagementTab locations={locations} isLoading={isLoadingLocations} canManage={canManage} isSuperAdmin={Boolean(isSuperAdmin)} />}
          {activeTab === "asset-types" && <AssetTypeManagementTab assetTypes={assetTypes} isLoading={isLoadingAssetTypes} canManage={canManage} />}
          </>}
        </div>
      </BmnTabContent>
    </div>
  );
}
