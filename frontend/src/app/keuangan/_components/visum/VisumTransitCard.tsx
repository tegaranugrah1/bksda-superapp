"use client";

import React from "react";
import { MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisumTransitItem } from "../VisumSpdDocument";
import { IndoDatePicker } from "./IndoDatePicker";

interface VisumTransitCardProps {
  romNum: string;
  title: string;
  item?: VisumTransitItem;
  onChange: (field: keyof VisumTransitItem, value: any) => void;
  onRemove: () => void;
}

export function VisumTransitCard({
  romNum,
  title,
  item,
  onChange,
  onRemove,
}: VisumTransitCardProps) {
  const d = item || {};
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-xs dark:border-amber-500/20 dark:bg-zinc-900 transition-all">
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
          <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>
            {romNum}. {title}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-7 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          <span>Hapus {romNum}</span>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Kolom Kiri: Tiba di */}
        <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-950">
          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Tiba di Destinasi {romNum}:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Lokasi Tujuan (Tiba di)
              </label>
              <input
                type="text"
                value={d.tiba_di || ""}
                onChange={(e) => onChange("tiba_di", e.target.value)}
                placeholder="Nama Kota / Pos / Resort Lapangan"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Pada Tanggal Tiba</label>
              <IndoDatePicker
                value={d.tiba_tanggal || ""}
                onChange={(v) => onChange("tiba_tanggal", v)}
                placeholder="Pilih tanggal tiba"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Jabatan Pejabat Lapangan
              </label>
              <input
                type="text"
                value={d.tiba_kepala_jabatan || ""}
                onChange={(e) => {
                  onChange("tiba_kepala_jabatan", e.target.value);
                  if (!d.berangkat_kepala_jabatan) {
                    onChange("berangkat_kepala_jabatan", e.target.value);
                  }
                }}
                placeholder="Kepala Resort / Camat / Manager"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Nama Pejabat Lapangan
              </label>
              <input
                type="text"
                value={d.tiba_kepala_nama || ""}
                onChange={(e) => {
                  onChange("tiba_kepala_nama", e.target.value);
                  if (!d.berangkat_kepala_nama) {
                    onChange("berangkat_kepala_nama", e.target.value);
                  }
                }}
                placeholder="Nama Pejabat Pengesah"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Identitas Pejabat Lapangan (NIP / NIK)
                </label>
                <div className="flex items-center gap-1 rounded-md bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => onChange("tiba_id_type", "NIP")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      (d.tiba_id_type || "NIP") === "NIP"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIP
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange("tiba_id_type", "NIK")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      d.tiba_id_type === "NIK"
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
                value={d.tiba_kepala_nip || ""}
                onChange={(e) => {
                  onChange("tiba_kepala_nip", e.target.value);
                  if (!d.berangkat_kepala_nip) {
                    onChange("berangkat_kepala_nip", e.target.value);
                  }
                }}
                placeholder={
                  d.tiba_id_type === "NIK"
                    ? "Masukkan 16 digit NIK"
                    : "Kosongkan jika bukan ASN / swasta"
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Berangkat dari */}
        <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-950">
          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Berangkat Kembali / Melanjutkan dari {romNum}:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Berangkat Dari
              </label>
              <input
                type="text"
                value={d.berangkat_dari || d.tiba_di || ""}
                onChange={(e) => onChange("berangkat_dari", e.target.value)}
                placeholder="Lokasi Berangkat"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Ke (Destinasi Selanjutnya)
              </label>
              <input
                type="text"
                value={d.berangkat_ke || ""}
                onChange={(e) => onChange("berangkat_ke", e.target.value)}
                placeholder="Kota / Destinasi Selanjutnya"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Pada Tanggal</label>
              <IndoDatePicker
                value={d.berangkat_tanggal || ""}
                onChange={(v) => onChange("berangkat_tanggal", v)}
                placeholder="Pilih tanggal berangkat"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Jabatan Pejabat Berangkat
              </label>
              <input
                type="text"
                value={d.berangkat_kepala_jabatan || ""}
                onChange={(e) => onChange("berangkat_kepala_jabatan", e.target.value)}
                placeholder="Kepala Resort / Camat / Manager"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Nama Pejabat Berangkat
              </label>
              <input
                type="text"
                value={d.berangkat_kepala_nama || ""}
                onChange={(e) => onChange("berangkat_kepala_nama", e.target.value)}
                placeholder="Nama Pejabat Pengesah"
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
                    onClick={() => onChange("berangkat_id_type", "NIP")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      (d.berangkat_id_type || "NIP") === "NIP"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIP
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange("berangkat_id_type", "NIK")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      d.berangkat_id_type === "NIK"
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
                value={d.berangkat_kepala_nip || ""}
                onChange={(e) => onChange("berangkat_kepala_nip", e.target.value)}
                placeholder={
                  d.berangkat_id_type === "NIK"
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
