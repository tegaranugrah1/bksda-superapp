"use client";

import React from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { VisumSpdData } from "../VisumSpdDocument";
import { VisumSpdSettings } from "../VisumManageTemplatesModal";
import { IndoDatePicker } from "./IndoDatePicker";

interface VisumSection6ReturnProps {
  data: VisumSpdData;
  spdType: "dipa" | "folu";
  settings: VisumSpdSettings | null;
  updateData: (field: keyof VisumSpdData, value: string) => void;
}

export function VisumSection6Return({
  data,
  spdType,
  settings,
  updateData,
}: VisumSection6ReturnProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
        <UserCheck className="h-4 w-4 text-amber-600" />
        <span>VI. Tiba Kembali di Balai &amp; Pengesahan PPK</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Tiba Kembali di
          </label>
          <input
            type="text"
            value={data.kembali_tempat || ""}
            onChange={(e) => updateData("kembali_tempat", e.target.value)}
            placeholder="Samarinda"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Pada Tanggal Kembali
          </label>
          <IndoDatePicker
            value={data.kembali_tanggal || ""}
            onChange={(v) => updateData("kembali_tanggal", v)}
            placeholder="30 April 2026"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        {/* Quick Switch for Signatory VI Kiri */}
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
            Pengesah Tiba (VI Kiri):
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const activePpk =
                  spdType === "dipa"
                    ? settings?.ppk_dipa || { name: "RUSMANTO, S.Hut", nip: "19810907 200012 1 004" }
                    : settings?.ppk_folu || settings?.ppk || { name: "Ahmad Hidayat, S.PKP., M.Ling", nip: "19820301 200012 1 001" };
                updateData("kembali_jabatan_pengesah", "Pejabat Pembuat Komitmen,");
                updateData("kembali_nama_pejabat", activePpk.name);
                updateData("kembali_nip_pejabat", activePpk.nip);
                toast.success(`Pengesah Tiba diset ke PPK (${activePpk.name})`);
              }}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                (data.kembali_jabatan_pengesah || "").toLowerCase().includes("pembuat komitmen")
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
              }`}
            >
              Set PPK ({spdType === "dipa" ? "Rusmanto" : "Ahmad H."})
            </button>
            <button
              type="button"
              onClick={() => {
                const asalLower = (data.asal_tempat || "Samarinda").toLowerCase();
                let matchedRegion = settings?.samarinda;
                if (asalLower.includes("berau")) matchedRegion = settings?.berau;
                else if (asalLower.includes("tenggarong") || asalLower.includes("kukar"))
                  matchedRegion = settings?.tenggarong;
                else if (asalLower.includes("balikpapan"))
                  matchedRegion = settings?.balikpapan;

                const pos = matchedRegion?.return_position || "Kepala Subbagian Tata Usaha";
                const name = matchedRegion?.official_name || "Dheny Mardiono, S.Hut., MSc.";
                const nip = matchedRegion?.official_nip || "19750314 199903 1 004";

                updateData("kembali_jabatan_pengesah", pos);
                updateData("kembali_nama_pejabat", name);
                updateData("kembali_nip_pejabat", nip);
                toast.success(`Pengesah Tiba diset ke Pejabat Wilayah (${name})`);
              }}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                !(data.kembali_jabatan_pengesah || "").toLowerCase().includes("pembuat komitmen")
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
              }`}
            >
              Set Pejabat Balai/Wilayah
            </button>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Jabatan Pengesah Tiba Kembali
          </label>
          <textarea
            rows={2}
            value={data.kembali_jabatan_pengesah || ""}
            onChange={(e) => updateData("kembali_jabatan_pengesah", e.target.value)}
            placeholder="Kepala Subbagian Tata Usaha"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Nama Pejabat Tiba
          </label>
          <input
            type="text"
            value={data.kembali_nama_pejabat || ""}
            onChange={(e) => updateData("kembali_nama_pejabat", e.target.value)}
            placeholder="Dheny Mardiono, S.Hut., MSc."
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            NIP Pejabat Tiba
          </label>
          <input
            type="text"
            value={data.kembali_nip_pejabat || ""}
            onChange={(e) => updateData("kembali_nip_pejabat", e.target.value)}
            placeholder="19750314 199903 1 004"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        {/* PPK Block */}
        <div className="sm:col-span-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">
            Pejabat Pembuat Komitmen (PPK):
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Nama PPK
              </label>
              <input
                type="text"
                value={data.ppk_nama || ""}
                onChange={(e) => updateData("ppk_nama", e.target.value)}
                placeholder="Ahmad Hidayat, S.PKP., M.Ling"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                NIP PPK
              </label>
              <input
                type="text"
                value={data.ppk_nip || ""}
                onChange={(e) => updateData("ppk_nip", e.target.value)}
                placeholder="19820301 200012 1 001"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
