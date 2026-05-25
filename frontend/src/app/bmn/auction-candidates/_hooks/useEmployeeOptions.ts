"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface EmployeeOption {
  id: string | number;
  nama_lengkap?: string;
  name?: string;
  nip?: string | null;
  jabatan?: string | null;
  position?: string | null;
}

export interface UseEmployeeOptionsResult {
  sortedEmployeesForPanitia: EmployeeOption[];
}

export function useEmployeeOptions(): UseEmployeeOptionsResult {
  const { data: employeesForPanitia = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-select-panitia"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data?.data || res.data || [];
    },
  });

  const sortedEmployeesForPanitia = useMemo(() => {
    const list = Array.isArray(employeesForPanitia) ? [...employeesForPanitia] : [];
    return list.sort((a, b) => {
      const an = (a.nama_lengkap || a.name || "").toLowerCase();
      const bn = (b.nama_lengkap || b.name || "").toLowerCase();
      return an.localeCompare(bn);
    });
  }, [employeesForPanitia]);

  return { sortedEmployeesForPanitia };
}
