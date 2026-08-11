"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { EditableItemListSection } from "../../surat-tugas/_components/EditableItemListSection";
import { motion, AnimatePresence } from "framer-motion";

interface DasarItem {
  id: string;
  text: string;
}

interface StTemplate {
  id: number;
  name: string;
  menimbang: DasarItem[];
  dasar: DasarItem[];
  created_at: string;
  updated_at: string;
}

export default function StTemplatesSettingsPage() {
  const [templates, setTemplates] = useState<StTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [menimbangItems, setMenimbangItems] = useState<DasarItem[]>([]);
  const [dasarItems, setDasarItems] = useState<DasarItem[]>([]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/kepegawaian/st-templates");
      if (res.data?.data) {
        setTemplates(res.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error("Akses Ditolak: Anda tidak memiliki hak superadmin.");
      } else {
        toast.error("Gagal memuat template ST");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setMenimbangItems([]);
    setDasarItems([]);
    setIsFormOpen(false);
  };

  const handleEdit = (t: StTemplate) => {
    setEditId(t.id);
    setName(t.name);
    setMenimbangItems(t.menimbang || []);
    setDasarItems(t.dasar || []);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template ini?")) return;
    try {
      await api.delete(`/kepegawaian/st-templates/${id}`);
      toast.success("Template berhasil dihapus");
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menghapus template");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return toast.error("Nama template wajib diisi");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        menimbang: menimbangItems,
        dasar: dasarItems,
      };

      if (editId) {
        await api.put(`/kepegawaian/st-templates/${editId}`, payload);
        toast.success("Template berhasil diperbarui");
      } else {
        await api.post("/kepegawaian/st-templates", payload);
        toast.success("Template berhasil ditambahkan");
      }
      
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menyimpan template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Manajemen Template Surat Tugas</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola template khusus dengan nilai default Menimbang dan Dasar.</p>
        </div>
        {!isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Template
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isFormOpen ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editId ? "Edit Template" : "Buat Template Baru"}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nama Template
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Perjalanan Dinas Biasa"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl p-4">
                <EditableItemListSection
                  title="Default Menimbang"
                  items={menimbangItems}
                  onChange={setMenimbangItems}
                  marker="letter"
                />
              </div>

              <div className="bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl p-4">
                <EditableItemListSection
                  title="Default Dasar"
                  items={dasarItems}
                  onChange={setDasarItems}
                  marker="number"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <button 
                onClick={resetForm}
                className="px-5 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Template
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm"
          >
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center p-12 text-slate-500">
                Belum ada template custom yang dibuat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-zinc-400">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-zinc-500">
                    <tr>
                      <th className="px-6 py-4">Nama Template</th>
                      <th className="px-6 py-4">Butir Menimbang</th>
                      <th className="px-6 py-4">Butir Dasar</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                    {templates.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                          {t.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-medium text-xs">
                            {t.menimbang?.length || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-medium text-xs">
                            {t.dasar?.length || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(t)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(t.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
