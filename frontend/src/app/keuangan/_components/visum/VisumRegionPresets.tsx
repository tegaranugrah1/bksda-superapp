"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisumSpdData } from "../VisumSpdDocument";
import { VisumSpdSettings } from "../VisumManageTemplatesModal";

interface VisumRegionPresetsProps {
  data: VisumSpdData;
  settings: VisumSpdSettings | null;
  onApplyPresetSamarinda: () => void;
  onApplyPresetBerau: () => void;
  onApplyPresetTenggarong: () => void;
  onApplyPresetBalikpapan: () => void;
}

export function VisumRegionPresets({
  data,
  settings,
  onApplyPresetSamarinda,
  onApplyPresetBerau,
  onApplyPresetTenggarong,
  onApplyPresetBalikpapan,
}: VisumRegionPresetsProps) {
  const currentOfficial = data.asal_nama_pejabat || "";
  const currentPlace = (data.asal_tempat || "").toLowerCase();

  const presets = [
    {
      key: "samarinda",
      place: settings?.samarinda?.place || "Samarinda",
      label: "Balai",
      color: "text-amber-600 dark:text-amber-400",
      badgeColor: "text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-500/20",
      name: settings?.samarinda?.official_name || "Dheny Mardiono, S.Hut., MSc.",
      position: settings?.samarinda?.return_position?.split("\n")[0] || "Kasubbag Tata Usaha",
      isActive:
        currentOfficial === (settings?.samarinda?.official_name || "Dheny Mardiono, S.Hut., MSc.") ||
        (currentPlace.includes("samarinda") && !currentOfficial),
      onClick: onApplyPresetSamarinda,
    },
    {
      key: "berau",
      place: settings?.berau?.place || "Berau",
      label: "Wil. I",
      color: "text-blue-600 dark:text-blue-400",
      badgeColor: "text-blue-700 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-500/20",
      name: settings?.berau?.official_name || "Yulian Sadono, S.Hut., M.T.",
      position: settings?.berau?.return_position?.split("\n")[0] || "Kepala Seksi Wil. I",
      isActive:
        currentOfficial === (settings?.berau?.official_name || "Yulian Sadono, S.Hut., M.T.") ||
        (currentPlace.includes("berau") && !currentOfficial),
      onClick: onApplyPresetBerau,
    },
    {
      key: "tenggarong",
      place: settings?.tenggarong?.place || "Tenggarong",
      label: "Wil. II",
      color: "text-emerald-600 dark:text-emerald-400",
      badgeColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-500/20",
      name: settings?.tenggarong?.official_name || "Suriawati Halim, S.Hut., M.P.",
      position: settings?.tenggarong?.return_position?.split("\n")[0] || "Kepala Seksi Wil. II",
      isActive:
        currentOfficial === (settings?.tenggarong?.official_name || "Suriawati Halim, S.Hut., M.P.") ||
        ((currentPlace.includes("tenggarong") || currentPlace.includes("kukar")) && !currentOfficial),
      onClick: onApplyPresetTenggarong,
    },
    {
      key: "balikpapan",
      place: settings?.balikpapan?.place || "Balikpapan",
      label: "Wil. III",
      color: "text-violet-600 dark:text-violet-400",
      badgeColor: "text-violet-700 dark:text-violet-400 bg-violet-100/60 dark:bg-violet-500/20",
      name: settings?.balikpapan?.official_name || "Bambang Hari Trimarsito, S.Si., M.P.",
      position: settings?.balikpapan?.return_position?.split("\n")[0] || "Kepala Seksi Wil. III",
      isActive:
        currentOfficial === (settings?.balikpapan?.official_name || "Bambang Hari Trimarsito, S.Si., M.P.") ||
        (currentPlace.includes("balikpapan") && !currentOfficial),
      onClick: onApplyPresetBalikpapan,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Pilihan Pejabat Balai / Wilayah:
        </span>
        <span className="text-[10px] text-zinc-400">4 Wilayah Kerja</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {presets.map((p) => (
          <Button
            key={p.key}
            type="button"
            variant="outline"
            size="sm"
            onClick={p.onClick}
            className={`h-auto flex-col items-start justify-start p-3 text-left text-xs rounded-xl border transition cursor-pointer ${
              p.isActive
                ? "border-amber-500 bg-amber-50/85 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300 font-semibold ring-2 ring-amber-500/40 shadow-xs"
                : "border-zinc-200 bg-white hover:border-amber-300 dark:border-zinc-700 dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 font-bold">
                <Building2 className={`h-3.5 w-3.5 ${p.color} shrink-0`} />
                <span>{p.place}</span>
              </div>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${p.badgeColor}`}>
                {p.label}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate w-full" title={p.name}>
              {p.name}
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full mt-0.5">
              {p.position}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
