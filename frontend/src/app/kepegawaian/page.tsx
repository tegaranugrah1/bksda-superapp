"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, UserCog, Trash2, Users, Inbox } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { EmployeeAccessSheet } from "./_components/EmployeeAccessSheet";
import { useRole } from "@/hooks/useRole";

interface Employee {
  id: string;
  nip: string;
  nama_lengkap: string;
  jabatan: string | null;
  satuan_kerja: string | null;
  is_active: boolean;
}

interface ApiResponse {
  data: Employee[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

export default function EmployeeListPage() {
  const { canWrite, canManageAccess } = useRole();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; nip: string; nama_lengkap: string } | null>(null);
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', page, debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/kepegawaian/employees`, {
        params: { page, search: debouncedSearch }
      });
      return data;
    },
    staleTime: 30000,
  });

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Kepegawaian & SDM</h2>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Daftar Pegawai</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Kelola informasi personil dan hak akses sistem.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari NIP / Nama..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all md:w-65 shadow-sm"
            />
          </div>
          <Link href="/kepegawaian/cuti">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-2xl text-sm font-bold transition-all shadow-sm border border-blue-200/50">
              <Inbox className="w-4 h-4" />
              <span>Inbox Surat Cuti</span>
            </button>
          </Link>
          {canWrite && (
            <Link href="/kepegawaian/employees/create">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl">
                <Plus className="w-4 h-4" />
                <span>Tambah Pegawai</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Profil Pegawai</th>
                <th className="px-6 py-4">NIP</th>
                <th className="px-6 py-4">Jabatan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-4"><div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl" /></td></tr>
                ))
              ) : isError ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-red-500">Gagal memuat data pegawai.</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Tidak ada pegawai ditemukan.</td></tr>
              ) : (
                data?.data.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group">
                    <td className="px-6 py-4">
                      <Link href={`/kepegawaian/employees/${emp.id}`}>
                        <p className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors cursor-pointer">{emp.nama_lengkap}</p>
                      </Link>
                      <p className="text-[11px] text-zinc-500">{emp.satuan_kerja || "Satuan Kerja Belum Diatur"}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">{emp.nip?.startsWith("MMP-") ? "-" : emp.nip}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{emp.jabatan || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        emp.is_active ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      }`}>
                        {emp.is_active ? "Aktif" : "Non-Aktif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/kepegawaian/employees/${emp.id}`} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl text-blue-600"><Search className="w-4 h-4" /></Link>
                        {canManageAccess && (
                          <button onClick={() => { setSelectedEmployee(emp); setAccessSheetOpen(true); }} className="p-2 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl text-amber-600"><UserCog className="w-4 h-4" /></button>
                        )}
                        {canWrite && (
                          <button className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-red-600"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Halaman {page} dari {data.meta.last_page}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-zinc-50 transition-colors shadow-sm">Sebelumnya</button>
              <button onClick={() => setPage(p => Math.min(data.meta.last_page, p + 1))} disabled={page === data.meta.last_page} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-zinc-50 transition-colors shadow-sm">Berikutnya</button>
            </div>
          </div>
        )}
      </div>

      {canManageAccess && (
        <EmployeeAccessSheet employee={selectedEmployee} open={accessSheetOpen} onOpenChange={setAccessSheetOpen} />
      )}
    </div>
  );
}