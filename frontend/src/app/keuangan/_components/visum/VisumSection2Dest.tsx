"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { VisumSpdData } from "../VisumSpdDocument";
import { IndoDatePicker } from "./IndoDatePicker";

interface VisumSection2DestProps {
  data: VisumSpdData;
  updateData: (field: keyof VisumSpdData, value: string) => void;
}

export function VisumSection2Dest({ data, updateData }: VisumSection2DestProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
        <Building2 className="h-4 w-4 text-amber-600" />
        <span>II. Tiba di Tujuan &amp; Berangkat Kembali</span>
      </div>

      <div className="space-y-4">
        {/* Kolom Kiri II: Tiba di */}
        <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-950">
          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Tiba di Lokasi Tujuan:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Tiba di</label>
              <input
                type="text"
                value={data.tujuan_1_tempat || ""}
                onChange={(e) => updateData("tujuan_1_tempat", e.target.value)}
                placeholder="Kabupaten Kutai Barat"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Pada Tanggal</label>
              <IndoDatePicker
                value={data.tujuan_1_tiba_tanggal || ""}
                onChange={(v) => updateData("tujuan_1_tiba_tanggal", v)}
                placeholder="23 April 2026"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Jabatan Pejabat Tujuan</label>
              <input
                type="text"
                value={data.tujuan_1_kepala_jabatan || ""}
                onChange={(e) => updateData("tujuan_1_kepala_jabatan", e.target.value)}
                placeholder="Plt. Manager Camp PT. HLKL"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Nama Pejabat Tujuan</label>
              <input
                type="text"
                value={data.tujuan_1_kepala_nama || ""}
                onChange={(e) => updateData("tujuan_1_kepala_nama", e.target.value)}
                placeholder="Theodorus Dedi"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Nomor Identitas Pejabat Tujuan (Opsional)
                </label>
                <div className="flex items-center gap-1 rounded-md bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => updateData("tujuan_1_id_type", "NIP")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      (data.tujuan_1_id_type || "NIP") === "NIP"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIP
                  </button>
                  <button
                    type="button"
                    onClick={() => updateData("tujuan_1_id_type", "NIK")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      data.tujuan_1_id_type === "NIK"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIK
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={data.tujuan_1_kepala_nip || ""}
                onChange={(e) => updateData("tujuan_1_kepala_nip", e.target.value)}
                placeholder={
                  data.tujuan_1_id_type === "NIK"
                    ? "Masukkan 16 digit NIK (misal: 6402...)"
                    : "Kosongkan jika bukan ASN / swasta"
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Kolom Kanan II: Berangkat dari */}
        <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-950">
          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Berangkat Kembali dari Tujuan:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Berangkat Dari</label>
              <input
                type="text"
                value={data.tujuan_1_berangkat_dari || ""}
                onChange={(e) => updateData("tujuan_1_berangkat_dari", e.target.value)}
                placeholder="Kabupaten Kutai Barat"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Ke</label>
              <input
                type="text"
                value={data.tujuan_1_berangkat_ke || ""}
                onChange={(e) => updateData("tujuan_1_berangkat_ke", e.target.value)}
                placeholder="Samarinda"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Pada Tanggal</label>
              <IndoDatePicker
                value={data.tujuan_1_berangkat_tanggal || ""}
                onChange={(v) => updateData("tujuan_1_berangkat_tanggal", v)}
                placeholder="30 April 2026"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Jabatan Pejabat Berangkat</label>
              <input
                type="text"
                value={data.tujuan_1_berangkat_kepala_jabatan || ""}
                onChange={(e) => updateData("tujuan_1_berangkat_kepala_jabatan", e.target.value)}
                placeholder="Plt. Manager Camp PT. HLKL"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Nama Pejabat Berangkat</label>
              <input
                type="text"
                value={data.tujuan_1_berangkat_kepala_nama || ""}
                onChange={(e) => updateData("tujuan_1_berangkat_kepala_nama", e.target.value)}
                placeholder="Theodorus Dedi"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Identitas Pejabat Berangkat
                </label>
                <div className="flex items-center gap-1 rounded-md bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => updateData("tujuan_1_berangkat_id_type", "NIP")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      (data.tujuan_1_berangkat_id_type || "NIP") === "NIP"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIP
                  </button>
                  <button
                    type="button"
                    onClick={() => updateData("tujuan_1_berangkat_id_type", "NIK")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      data.tujuan_1_berangkat_id_type === "NIK"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIK
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={data.tujuan_1_berangkat_kepala_nip || ""}
                onChange={(e) => updateData("tujuan_1_berangkat_kepala_nip", e.target.value)}
                placeholder={
                  data.tujuan_1_berangkat_id_type === "NIK"
                    ? "Masukkan 16 digit NIK"
                    : "Kosongkan jika bukan ASN / swasta"
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
