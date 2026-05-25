"use client";

import { useCallback, useState } from "react";
import { formatNip } from "../_lib/sk-defaults";
import {
  DEFAULT_PEMERIKSA,
  newPemeriksaAnggota,
  type PemeriksaAnggota,
} from "../_lib/pemeriksa-defaults";
import type { EmployeeOption } from "./useEmployeeOptions";

export interface UsePemeriksaListResult {
  pemeriksaList: PemeriksaAnggota[];
  addPemeriksaAnggota: () => void;
  removePemeriksaAnggota: (id: string) => void;
  updatePemeriksaAnggota: (
    id: string,
    field: keyof PemeriksaAnggota,
    value: string,
  ) => void;
  selectPemeriksaEmployee: (
    id: string,
    employeeId: string,
    employees: EmployeeOption[],
  ) => void;
}

export function usePemeriksaList(): UsePemeriksaListResult {
  const [pemeriksaList, setPemeriksaList] = useState<PemeriksaAnggota[]>(DEFAULT_PEMERIKSA);

  const addPemeriksaAnggota = useCallback(() => {
    setPemeriksaList((prev) => [...prev, newPemeriksaAnggota()]);
  }, []);

  const removePemeriksaAnggota = useCallback((id: string) => {
    setPemeriksaList((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updatePemeriksaAnggota = useCallback(
    (id: string, field: keyof PemeriksaAnggota, value: string) => {
      setPemeriksaList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      );
    },
    [],
  );

  const selectPemeriksaEmployee = useCallback(
    (id: string, employeeId: string, employees: EmployeeOption[]) => {
      if (!employeeId) return;
      const emp = employees.find((e) => String(e.id) === employeeId);
      if (!emp) return;
      setPemeriksaList((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                nama: emp.nama_lengkap || emp.name || "",
                nip: formatNip(emp.nip || ""),
                jabatan: emp.position || emp.jabatan || "",
              }
            : item,
        ),
      );
    },
    [],
  );

  return {
    pemeriksaList,
    addPemeriksaAnggota,
    removePemeriksaAnggota,
    updatePemeriksaAnggota,
    selectPemeriksaEmployee,
  };
}
