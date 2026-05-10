"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, UserCog, Edit, Trash2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { EmployeeAccessSheet } from "./_components/EmployeeAccessSheet";

// 1. Tipe Data (TypeScript Interfaces) - Sesuai dengan respons Issue #025
interface Employee {
  id: string;
  nip: string;
  nama_lengkap: string;
  jabatan: string | null;
  satuan_kerja: string | null;
  is_active: boolean;
}

interface Meta {
  current_page: number;
  last_page: number;
  total: number;
}

interface ApiResponse {
  data: Employee[];
  meta: Meta;
}

export default function EmployeeListPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Access Sheet State
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; nip: string; nama_lengkap: string } | null>(null);
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);



  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Otomatis reset ke halaman 1 setiap kali mencari nama baru
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 3. Rule 7.2 & 7.6: Pemanggilan Data Pagination
  const fetchEmployees = async (currentPage: number, search: string) => {
    const { data } = await api.get<ApiResponse>(`/kepegawaian/employees`, {
      params: { page: currentPage, search }
    });
    return data;
  };

  // 4. TanStack Query (Manajemen State Server Premium)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['employees', page, debouncedSearch],
    queryFn: () => fetchEmployees(page, debouncedSearch),
    staleTime: 30 * 1000, // 30 detik agar tidak membebani loop
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch saat window focus (termasuk back button)
  });

  // 5. Notifikasi Error (Jika API Gagal)
  useEffect(() => {
    if (isError) {
      toast.error("Gagal mengambil data pegawai. Pastikan server backend menyala.");
    }
  }, [isError]);

  // 6. BFCache Detection: Paksa refetch saat halaman di-restore dari back/forward cache
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Halaman di-restore dari BFCache, paksa refetch data
        refetch();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [refetch]);

  return (
    <div className="space-y-6">

      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Data Pegawai</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Kelola informasi master data SDM instansi BKSDA.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">

          {/* SEARCH BAR */}
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari NIP / Nama..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm shadow-sm"
            />
          </div>

          {/* TOMBOL TAMBAH (Arah ke form Create) */}
          <Link
            href="/kepegawaian/create"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 w-full sm:w-auto justify-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Data
          </Link>
        </div>
      </div>

      {/* CONTAINER TABEL DATA (Premium Card) */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden animate-in fade-in duration-500 relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50/90 dark:bg-zinc-800/90 backdrop-blur-md sticky top-0 z-10 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Profil Pegawai</th>
                <th className="px-6 py-4 whitespace-nowrap">NIP</th>
                <th className="px-6 py-4 whitespace-nowrap">Jabatan</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 relative">

              {/* STATE 1: SEDANG LOADING (Skeleton) */}
              {isLoading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-white dark:bg-zinc-900">
                    <td className="px-6 py-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-32 mb-2"></div><div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-40"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-20 ml-auto"></div></td>
                  </tr>
                ))
              )}

              {/* STATE 2: TERJADI ERROR JARINGAN/SERVER */}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-red-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Gagal memuat data dari server.</p>
                    <p className="text-xs mt-1 text-red-400/80">Periksa koneksi internet atau ketersediaan Backend API.</p>
                  </td>
                </tr>
              )}

              {/* STATE 3: PENCARIAN KOSONG / DATA BELUM ADA */}
              {!isLoading && !isError && data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-zinc-500">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">Tidak ada data pegawai yang ditemukan.</p>
                  </td>
                </tr>
              )}

              {/* STATE 4: MENAMPILKAN BARIS DATA */}
              {!isLoading && !isError && data?.data.map((emp) => (
                <tr key={emp.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all duration-300 group hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)] relative z-0 hover:z-10 hover:scale-[1.002]">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{emp.nama_lengkap}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{emp.satuan_kerja || "Satuan Kerja Belum Diatur"}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">{emp.nip}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 text-sm">{emp.jabatan || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      emp.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                      : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                    }`}>
                      {emp.is_active ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <button 
                         onClick={() => {
                           setSelectedEmployee({
                             id: emp.id,
                             nip: emp.nip,
                             nama_lengkap: emp.nama_lengkap
                           });
                           setAccessSheetOpen(true);
                         }}
                         className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl transition-colors" 
                         title="Manajemen Hak Akses (IAM)"
                       >
                         <UserCog className="w-[18px] h-[18px]" />
                       </button>
                       <button className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/20 rounded-xl transition-colors" title="Edit Biodata">
                         <Edit className="w-[18px] h-[18px]" />
                       </button>
                       <button className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-colors" title="Hapus Permanen">
                         <Trash2 className="w-[18px] h-[18px]" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER: PAGINATION CONTROLS (Rule 7.6) */}
        {!isLoading && !isError && data?.meta && data.meta.total > 0 && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Menampilkan <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.data.length}</span> dari total <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.meta.total}</span> data
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Kembali
              </button>
              <div className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Hal {data.meta.current_page} / {data.meta.last_page}
              </div>
              <button
                onClick={() => setPage(p => Math.min(data.meta.last_page, p + 1))}
                disabled={page === data.meta.last_page}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ACCESS MANAGEMENT SHEET */}
      <EmployeeAccessSheet 
        employee={selectedEmployee}
        open={accessSheetOpen}
        onOpenChange={setAccessSheetOpen}
      />
    </div>
  );
}