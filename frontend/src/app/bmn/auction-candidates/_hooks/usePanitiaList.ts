"use client";

import { useCallback, useState } from "react";
import { formatNip } from "../_lib/sk-defaults";
import {
  DEFAULT_PANITIA_SUSUNAN,
  type PanitiaAnggota,
} from "../_lib/sk-panitia-defaults";
import type { EmployeeOption } from "./useEmployeeOptions";

export interface UsePanitiaListResult {
  susunanPanitia: PanitiaAnggota[];
  addPanitiaAnggota: () => void;
  removePanitiaAnggota: (id: string) => void;
  updatePanitiaAnggota: (
    id: string,
    field: keyof PanitiaAnggota,
    value: string,
  ) => void;
  selectPanitiaEmployee: (
    id: string,
    employeeId: string,
    employees: EmployeeOption[],
  ) => void;
}

export function usePanitiaList(): UsePanitiaListResult {
  const [susunanPanitia, setSusunanPanitia] = useState<PanitiaAnggota[]>(DEFAULT_PANITIA_SUSUNAN);

  const addPanitiaAnggota = useCallback(() => {
    setSusunanPanitia((prev) => [
      ...prev,
      {
        id: "id" + Math.random().toString(36).slice(2),
        nama: "",
        nip: "",
        jabatanInstansi: "",
        jabatanKegiatan: "",
      },
    ]);
  }, []);

  const removePanitiaAnggota = useCallback((id: string) => {
    setSusunanPanitia((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updatePanitiaAnggota = useCallback(
    (id: string, field: keyof PanitiaAnggota, value: string) => {
      setSusunanPanitia((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      );
    },
    [],
  );

  const selectPanitiaEmployee = useCallback(
    (id: string, employeeId: string, employees: EmployeeOption[]) => {
      if (!employeeId) return;
      const emp = employees.find((e) => String(e.id) === employeeId);
      if (!emp) return;
      setSusunanPanitia((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                nama: emp.nama_lengkap || emp.name || "",
                nip: formatNip(emp.nip || ""),
                jabatanInstansi: emp.position || emp.jabatan || "",
              }
            : item,
        ),
      );
    },
    [],
  );

  return {
    susunanPanitia,
    addPanitiaAnggota,
    removePanitiaAnggota,
    updatePanitiaAnggota,
    selectPanitiaEmployee,
  };
}
