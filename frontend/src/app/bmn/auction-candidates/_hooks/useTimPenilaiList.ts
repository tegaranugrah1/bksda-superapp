"use client";

import { useCallback, useState } from "react";
import { formatNip } from "../_lib/sk-defaults";
import {
  DEFAULT_TIM_PENILAI_SUSUNAN,
  newTimPenilaiAnggota,
  type TimPenilaiAnggota,
} from "../_lib/sk-tim-penilai-defaults";
import type { EmployeeOption } from "./useEmployeeOptions";

export interface UseTimPenilaiListResult {
  susunanTimPenilai: TimPenilaiAnggota[];
  addTimPenilaiAnggota: () => void;
  removeTimPenilaiAnggota: (id: string) => void;
  updateTimPenilaiAnggota: (
    id: string,
    field: keyof TimPenilaiAnggota,
    value: string,
  ) => void;
  selectTimPenilaiEmployee: (
    id: string,
    employeeId: string,
    employees: EmployeeOption[],
  ) => void;
}

export function useTimPenilaiList(): UseTimPenilaiListResult {
  const [susunanTimPenilai, setSusunanTimPenilai] = useState<TimPenilaiAnggota[]>(
    DEFAULT_TIM_PENILAI_SUSUNAN,
  );

  const addTimPenilaiAnggota = useCallback(() => {
    setSusunanTimPenilai((prev) => [...prev, newTimPenilaiAnggota()]);
  }, []);

  const removeTimPenilaiAnggota = useCallback((id: string) => {
    setSusunanTimPenilai((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateTimPenilaiAnggota = useCallback(
    (id: string, field: keyof TimPenilaiAnggota, value: string) => {
      setSusunanTimPenilai((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      );
    },
    [],
  );

  const selectTimPenilaiEmployee = useCallback(
    (id: string, employeeId: string, employees: EmployeeOption[]) => {
      if (!employeeId) return;
      const emp = employees.find((e) => String(e.id) === employeeId);
      if (!emp) return;
      setSusunanTimPenilai((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                nama: emp.nama_lengkap || emp.name || "",
                nip: formatNip(emp.nip || ""),
              }
            : item,
        ),
      );
    },
    [],
  );

  return {
    susunanTimPenilai,
    addTimPenilaiAnggota,
    removeTimPenilaiAnggota,
    updateTimPenilaiAnggota,
    selectTimPenilaiEmployee,
  };
}
