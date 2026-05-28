"use client";

import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import api from "@/lib/api";
import { formatNip, type SkKepalaBalai } from "../_lib/sk-defaults";

interface EmployeeRecord {
  id: number;
  nama_lengkap?: string;
  name?: string;
  nip?: string;
}

interface KepalaBalaiPickerProps {
  kepalaBalai: SkKepalaBalai;
  setKepalaBalai: (kb: SkKepalaBalai) => void;
}

/**
 * Global Kepala Balai picker. Pilihan pegawai dari API kepegawaian.
 * Saat dipilih: nama otomatis UPPERCASE, NIP terformat dengan spasi.
 * State ini di-share ke semua dokumen yang menampilkan TTD Kepala Balai.
 */
export function KepalaBalaiPicker({ kepalaBalai, setKepalaBalai }: KepalaBalaiPickerProps) {
  const { data: employees = [], isLoading } = useQuery<EmployeeRecord[]>({
    queryKey: ["employees-select-kepala-balai"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data?.data || res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const sortedEmployees = [...employees].sort((a, b) => {
    const an = (a.nama_lengkap || a.name || "").toLowerCase();
    const bn = (b.nama_lengkap || b.name || "").toLowerCase();
    return an.localeCompare(bn);
  });

  const handleSelect = (employeeId: string) => {
    if (!employeeId) return;
    const emp = employees.find((e) => String(e.id) === employeeId);
    if (!emp) return;
    const fullName = (emp.nama_lengkap || emp.name || "").toUpperCase();
    setKepalaBalai({
      nama: fullName,
      nip: formatNip(emp.nip || ""),
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 print:hidden">
      <div className="mb-3 flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Penandatangan Kepala Balai</h3>
      </div>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        Pilih pegawai untuk mengisi nama dan NIP penandatangan di semua dokumen yang digenerate.
      </p>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <select
          className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          onChange={(e) => handleSelect(e.target.value)}
          defaultValue=""
          disabled={isLoading}
        >
          <option value="" disabled>
            {isLoading ? "Memuat daftar pegawai..." : "Pilih pegawai untuk Kepala Balai..."}
          </option>
          {sortedEmployees.map((emp) => (
            <option key={emp.id} value={String(emp.id)}>
              {emp.nama_lengkap || emp.name || "Tanpa Nama"}
              {emp.nip ? ` — NIP. ${formatNip(emp.nip)}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid gap-2 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Nama (UPPERCASE)</p>
          <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">
            {kepalaBalai.nama || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">NIP</p>
          <p className="mt-0.5 font-mono text-zinc-700 dark:text-zinc-300">
            {kepalaBalai.nip ? `NIP. ${kepalaBalai.nip}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
