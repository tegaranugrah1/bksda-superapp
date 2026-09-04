"use client";

import React from "react";
import { VisumSpdData } from "../VisumSpdDocument";

export const BULAN_INDO = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatDateToIndo(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(day) && monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${BULAN_INDO[monthIndex]} ${year}`;
    }
  }
  return isoDate;
}

export function parseIndoDateToIso(indoDate: string): string {
  if (!indoDate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(indoDate)) return indoDate;
  const parts = indoDate.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const monthStr = parts[1].toLowerCase();
    const year = parts[2];
    const monthIndex = BULAN_INDO.findIndex((m) => m.toLowerCase() === monthStr);
    if (monthIndex >= 0) {
      const month = String(monthIndex + 1).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  return "";
}

export function getRegionRank(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("samarinda") || n.includes("balai")) return 1;
  if (n.includes("berau") || n.includes("wilayah i") || n.includes("skw i")) return 2;
  if (n.includes("tenggarong") || n.includes("wilayah ii") || n.includes("skw ii") || n.includes("kelian")) return 3;
  if (n.includes("balikpapan") || n.includes("wilayah iii") || n.includes("skw iii")) return 4;
  return 5;
}

export interface EmployeeOption {
  id: number;
  name: string;
  nip: string | null;
  position: string | null;
  department: string | null;
}

export interface SuratTugasSimpleItem {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tempat_tujuan?: string | null;
}
