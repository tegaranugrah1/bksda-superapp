"use client";

import React from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMerkTipe } from "./MyAssetsTab";

export interface BorrowedAssetItem {
  id: number;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  loan_date: string;
  due_date: string;
  status: string;
  merk: string | null;
  jenis_bmn?: string;
  no_polisi?: string | null;
  nup_lama?: string | null;
}

interface ActiveLoansTabProps {
  assets: BorrowedAssetItem[];
}

export function ActiveLoansTab({ assets }: ActiveLoansTabProps) {
  if (assets.length === 0) {
    return (
      <div className="p-12 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada pinjaman aktif</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
      {assets.map((asset) => {
        const isOverdue = new Date(asset.due_date) < new Date();
        const merkDisplay = formatMerkTipe(asset.merk);

        return (
          <div key={asset.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{asset.nama_barang}</p>
              {merkDisplay && (
                <p className="text-xs text-slate-500 mb-0.5 truncate">{merkDisplay}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{asset.kode_barang}</span>
                <span className="text-xs text-slate-500">NUP: {asset.nup}</span>
                {asset.nup_lama && (
                  <span className="text-xs text-slate-400">• NUP Lama: {asset.nup_lama}</span>
                )}
                {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                    {asset.no_polisi}
                  </span>
                )}
              </div>
            </div>
            <Badge variant={isOverdue ? "destructive" : "secondary"} className="shrink-0">
              {isOverdue ? "Terlambat" : asset.status}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
