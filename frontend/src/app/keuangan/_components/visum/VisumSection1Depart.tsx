"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { VisumSpdData } from "../VisumSpdDocument";
import { IndoDatePicker } from "./IndoDatePicker";

interface VisumSection1DepartProps {
  data: VisumSpdData;
  updateData: (field: keyof VisumSpdData, value: string) => void;
}

export function VisumSection1Depart({ data, updateData }: VisumSection1DepartProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
        <MapPin className="h-4 w-4 text-amber-600" />
        <span>I. Berangkat dari Tempat Kedudukan</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Tempat Kedudukan (Asal)
          </label>
          <input
            type="text"
            value={data.asal_tempat || ""}
            onChange={(e) => updateData("asal_tempat", e.target.value)}
            placeholder="Samarinda"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Pada Tanggal Berangkat
          </label>
          <IndoDatePicker
            value={data.asal_tanggal || ""}
            onChange={(v) => updateData("asal_tanggal", v)}
            placeholder="23 April 2026"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Ke (Tempat Tujuan Awal)
          </label>
          <input
            type="text"
            value={data.tujuan_awal || ""}
            onChange={(e) => updateData("tujuan_awal", e.target.value)}
            placeholder="Kabupaten Kutai Barat"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Jabatan Pengesah Berangkat
          </label>
          <textarea
            rows={2}
            value={data.asal_jabatan_pengesah || ""}
            onChange={(e) => updateData("asal_jabatan_pengesah", e.target.value)}
            placeholder="a.n. Kepala Balai&#10;Kepala Subbagian Tata Usaha"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Nama Pejabat Berangkat
          </label>
          <input
            type="text"
            value={data.asal_nama_pejabat || ""}
            onChange={(e) => updateData("asal_nama_pejabat", e.target.value)}
            placeholder="Dheny Mardiono, S.Hut., MSc."
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            NIP Pejabat Berangkat
          </label>
          <input
            type="text"
            value={data.asal_nip_pejabat || ""}
            onChange={(e) => updateData("asal_nip_pejabat", e.target.value)}
            placeholder="19750314 199903 1 004"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      </div>
    </div>
  );
}
