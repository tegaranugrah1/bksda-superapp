"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Search, Loader2, Pencil, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import CrudFormDrawer from "./CrudFormDrawer";
import type { CrudPageConfig } from "./types";

interface Props {
  config: CrudPageConfig;
}

interface CrudRecord {
  id: number;
  [key: string]: unknown;
}

export default function CrudPageFactory({ config }: Props) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CrudRecord | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 500);

  const queryKey = [`cms-crud-${config.apiEndpoint}`, debouncedSearch, page];

  // Penarikan Data
  const { data: response, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get(config.apiEndpoint, {
        params: { search: debouncedSearch || undefined, page },
      });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Mutasi Hapus
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`${config.apiEndpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Data berhasil dihapus.");
    },
    onError: () =>
      toast.error("Gagal menghapus. Data mungkin masih terkait data lain."),
  });

  // Handler buka form Edit
  const handleEdit = (record: CrudRecord) => {
    setEditingRecord(record);
    setDrawerOpen(true);
  };

  // Handler buka form Tambah
  const handleCreate = () => {
    setEditingRecord(null);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <config.icon className={`w-8 h-8 text-${config.accentColor}-500`} />{" "}
            {config.title}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder={config.searchPlaceholder || "Cari..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 transition-all w-56 placeholder:text-zinc-600"
            />
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800">
                {config.columns.map((col) => (
                  <th
                    key={col.key}
                    className="p-4 text-xs font-bold text-zinc-400 uppercase"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="p-12 text-center"
                  >
                    <Loader2
                      className={`w-8 h-8 animate-spin mx-auto mb-3 text-${config.accentColor}-500`}
                    />
                  </td>
                </tr>
              ) : response?.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="p-12 text-center text-zinc-500"
                  >
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                response?.data?.map((row: CrudRecord) => (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-900/40 transition-colors"
                  >
                    {config.columns.map((col) => (
                      <td key={col.key} className="p-4 text-sm text-zinc-300">
                        {String(
                          col.render
                            ? col.render(row[col.key], row)
                            : row[col.key],
                        ) || "-"}
                      </td>
                    ))}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(row)}
                          className="p-2 hover:bg-teal-500/10 rounded-lg transition-colors group"
                        >
                          <Pencil className="w-4 h-4 text-zinc-500 group-hover:text-teal-400" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Yakin hapus?"))
                              deleteMutation.mutate(row.id);
                          }}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                        >
                          <Trash2 className="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
          <span className="text-zinc-500">Hal. {page}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={!response?.next_page_url}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Form */}
      <CrudFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingRecord(null);
        }}
        config={config}
        editingRecord={editingRecord}
      />
    </div>
  );
}
