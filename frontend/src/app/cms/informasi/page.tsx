"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Newspaper,
  Plus,
  Search,
  Loader2,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import Link from "next/link";

interface Category {
  id: number;
  nama: string;
}

interface BeritaItem {
  id: number;
  judul: string;
  thumbnail_path: string | null;
  published_at: string | null;
  category: Category | null;
  is_published: boolean;
  views_count: number;
}

interface ApiResponse {
  data: BeritaItem[];
  last_page: number;
  next_page_url: string | null;
}

export default function CMSInformasiPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Penarikan Data Berita
  const { data: response, isLoading } = useQuery({
    queryKey: ["cms-informasi", debouncedSearch, page],
    queryFn: async () => {
      const res = await api.get<ApiResponse>("/cms/admin/informasi", {
        params: { search: debouncedSearch || undefined, page },
      });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Mutasi: Toggle Status Publikasi
  const toggleMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/cms/admin/informasi/${id}/toggle-publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-informasi"] });
      toast.success("Status publikasi berita berhasil diubah.");
    },
    onError: () => toast.error("Gagal mengubah status."),
  });

  // Mutasi: Hapus Berita
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/cms/admin/informasi/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-informasi"] });
      toast.success("Berita berhasil dihapus.");
    },
    onError: () => toast.error("Gagal menghapus berita."),
  });

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-teal-500" /> Kelola Berita
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
            Tulis, terbitkan, dan kelola seluruh konten berita website BKSDA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari judul berita..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all w-56 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
          </div>
          <Link
            href="/cms/informasi/create"
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Tulis Berita
          </Link>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                  Berita
                </th>
                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                  Kategori
                </th>
                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                  Status
                </th>
                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                  Views
                </th>
                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-teal-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <span className="text-sm font-bold uppercase tracking-widest">
                      Memuat Arsip Berita...
                    </span>
                  </td>
                </tr>
              ) : response?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-zinc-500">
                    Belum ada berita.
                  </td>
                </tr>
              ) : (
                response?.data?.map((berita: BeritaItem) => (
                  <tr
                    key={berita.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Mini Thumbnail */}
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                          {berita.thumbnail_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${berita.thumbnail_path}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Newspaper className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm max-w-[250px] truncate">
                            {berita.judul}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {berita.published_at
                              ? new Date(
                                  berita.published_at,
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })
                              : "Belum diterbitkan"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-1 rounded-lg border border-teal-500/20 font-medium">
                        {berita.category?.nama || "Tanpa Kategori"}
                      </span>
                    </td>
                    <td className="p-4">
                      {berita.is_published ? (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20 font-bold">
                          Terbit
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg border border-amber-500/20 font-bold">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                      {berita.views_count || 0}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* Toggle Publikasi */}
                        <button
                          onClick={() => toggleMutation.mutate(berita.id)}
                          className="p-2 hover:bg-teal-500/10 rounded-lg transition-colors group"
                          title={
                            berita.is_published ? "Tarik ke Draft" : "Terbitkan"
                          }
                        >
                          {berita.is_published ? (
                            <EyeOff className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-amber-500 dark:group-hover:text-amber-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400" />
                          )}
                        </button>
                        {/* Edit */}
                        <Link
                          href={`/cms/informasi/${berita.id}`}
                          className="p-2 hover:bg-teal-500/10 rounded-lg transition-colors group"
                        >
                          <Pencil className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-teal-500 dark:group-hover:text-teal-400" />
                        </Link>
                        {/* Hapus */}
                        <button
                          onClick={() => {
                            toast("Yakin hapus berita ini?", {
                              action: {
                                label: "Hapus",
                                onClick: () => deleteMutation.mutate(berita.id),
                              },
                            });
                          }}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                        >
                          <Trash2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-red-500 dark:group-hover:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-sm">
          <span className="text-zinc-500 font-medium">
            Hal. {page} dari {response?.last_page || 1}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={!response?.next_page_url}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
