"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ScheduleConflict } from "../_components/ScheduleConflictBanner";

interface CheckConflictParams {
  employees: Array<{ id: string | number; tanggal_mulai?: string; tanggal_selesai?: string }>;
  tanggalMulai: string;
  tanggalSelesai?: string;
  isBedaHari?: boolean;
  employeeDates?: Record<string, { mulai: string; selesai: string }>;
  excludeId?: string;
}

export function useScheduleConflicts({
  employees,
  tanggalMulai,
  tanggalSelesai,
  isBedaHari = false,
  employeeDates = {},
  excludeId,
}: CheckConflictParams) {
  // Filter only valid numeric employee IDs (skip buruh/PM)
  const numericEmployees = employees.filter((e) => {
    const rawId = String(e.id || "");
    return !rawId.startsWith("buruh-") && !rawId.startsWith("pm-") && !isNaN(Number(rawId));
  });

  const employeeKey = numericEmployees.map((e) => e.id).sort().join(",");
  const datesKey = isBedaHari ? JSON.stringify(employeeDates) : "";

  return useQuery<{ has_conflict: boolean; conflicts: ScheduleConflict[] }>({
    queryKey: [
      "schedule-conflicts",
      employeeKey,
      tanggalMulai,
      tanggalSelesai || tanggalMulai,
      isBedaHari,
      datesKey,
      excludeId || "",
    ],
    queryFn: async () => {
      if (numericEmployees.length === 0 || !tanggalMulai) {
        return { has_conflict: false, conflicts: [] };
      }

      const payloadEmployees = numericEmployees.map((e) => {
        const id = Number(e.id);
        if (isBedaHari && employeeDates[e.id]) {
          return {
            id,
            tanggal_mulai: employeeDates[e.id].mulai,
            tanggal_selesai: employeeDates[e.id].selesai,
          };
        }
        return {
          id,
          tanggal_mulai: e.tanggal_mulai || tanggalMulai,
          tanggal_selesai: e.tanggal_selesai || tanggalSelesai || tanggalMulai,
        };
      });

      const res = await api.post("/surat-tugas/check-conflicts", {
        employees: payloadEmployees,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai || tanggalMulai,
        exclude_id: excludeId,
      });

      return res.data || { has_conflict: false, conflicts: [] };
    },
    enabled: numericEmployees.length > 0 && !!tanggalMulai,
    staleTime: 10000,
  });
}
