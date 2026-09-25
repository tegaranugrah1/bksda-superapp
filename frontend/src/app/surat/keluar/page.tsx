"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Plus,
  Search,
  FileText,
  Calendar,
  UserCheck,
  Eye,
  Pencil,
  Trash2,
  Printer,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { SuratKeluar } from "../_lib/surat-types";
import {
  SuratDinasDocument,
  handlePrintSuratDinas,
} from "../_components/SuratDinasDocument";
import { TemplatePickerModal, ALL_TEMPLATES } from "../_components/TemplatePickerModal";

const getTemplateBadge = (tplType?: string | null) => {
  const tpl = ALL_TEMPLATES.find((t) => t.id === tplType);
  if (!tpl) return <span className="text-[11px] text-zinc-400">Manual / Umum</span>;
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${tpl.colorClass}`}>
      {tpl.name}
    </Badge>
  );
};

export default function SuratKeluarListPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<SuratKeluar | null>(null);
  const [editingManualSurat, setEditingManualSurat] = useState<SuratKeluar | null>(null);
  const [manualFormData, setManualFormData] = useState({
    no_surat: "",
    tanggal_surat: "",
    tujuan_surat: "",
    perihal: "",
    sifat: "Biasa",
    lampiran: "-",
    status: "terdaftar",
  });
  const [isSavingManual, setIsSavingManual] = useState(false);

  const {
    data: suratList = [],
    isLoading,
    refetch,
  } = useQuery<SuratKeluar[]>({
    queryKey: ["surat-keluar", search],
    queryFn: async () => {
      try {
        const res = await api.get("/surat/surat-keluar", {
          params: { search: search.trim() || undefined, per_page: 50 },
        });
        return res.data?.data || [];
      } catch (err) {
        console.error("Gagal mengambil data surat keluar:", err);
        return [];
      }
    },
  });

  const filteredList = suratList.filter((item) => {
    if (statusFilter === "draft" && item.status !== "draft") return false;
    if (statusFilter === "terdaftar" && item.status === "draft") return false;
    if (templateFilter !== "all" && item.template_type !== templateFilter) return false;
    return true;
  });

  const handleOpenEditManual = (item: SuratKeluar) => {
    setEditingManualSurat(item);
    setManualFormData({
      no_surat: item.no_surat || "",
      tanggal_surat: item.tanggal_surat || "",
      tujuan_surat: item.tujuan_surat || "",
      perihal: item.perihal || "",
      sifat: item.sifat || "Biasa",
      lampiran: item.lampiran || "-",
      status: item.status || "terdaftar",
    });
  };

  const handleSaveManualEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManualSurat?.id) return;
    setIsSavingManual(true);
    try {
      await api.put(`/surat/surat-keluar/${editingManualSurat.id}`, manualFormData);
      queryClient.invalidateQueries({ queryKey: ["surat-keluar"] });
      toast.success("Surat Keluar berhasil diperbarui.");
      setEditingManualSurat(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memperbarui Surat Keluar.");
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleDelete = async (id?: number, noSurat?: string) => {
    if (!id) return;
    const ok = await confirm({
      title: "Hapus Surat Keluar",
      description: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Apakah Anda yakin ingin menghapus data surat keluar ini?
          </p>
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 break-all text-center select-all">
            {noSurat || `#ID: ${id}`}
          </div>
          <p className="text-xs text-rose-500 font-medium">
            Tindakan ini permanen dan data tidak dapat dipulihkan.
          </p>
        </div>
      ),
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/surat/surat-keluar/${id}`);
      queryClient.invalidateQueries({ queryKey: ["surat-keluar"] });
      toast.success("Surat Keluar berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus Surat Keluar.");
    }
  };

  return (
    <div className="space-y-4 px-5 py-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <Send className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Daftar Surat Keluar
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Penatausahaan dan pengagendaan naskah dinas resmi Permen Kehutanan No. 1/2025.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsTemplatePickerOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Buat Naskah Dinas
          </Button>
          <Link href="/surat/keluar/create">
            <Button variant="outline" className="h-9 px-3.5 text-xs font-semibold rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Input Manual
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-2.5 md:px-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no surat, tujuan, perihal..."
              className="pl-9 h-9 text-xs border-zinc-200 focus-visible:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-zinc-700 dark:text-zinc-300 font-medium"
          >
            <option value="all">Semua Status</option>
            <option value="terdaftar">Resmi / Terdaftar</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="h-9 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 text-zinc-700 dark:text-zinc-300 font-medium max-w-[170px]"
          >
            <option value="all">Semua Format ({ALL_TEMPLATES.length})</option>
            {ALL_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-zinc-500">
          Menampilkan <span className="text-zinc-900 font-bold dark:text-zinc-50">{filteredList.length}</span> Surat Keluar
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider text-[10.5px]">
              <tr>
                <th className="py-2.5 px-3.5">Nomor & Tanggal Surat</th>
                <th className="py-2.5 px-3.5 min-w-[200px]">Tujuan Surat</th>
                <th className="py-2.5 px-3.5">Perihal</th>
                <th className="py-2.5 px-3.5">Sifat & Lampiran</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Tipe Template</th>
                <th className="py-2.5 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    Memuat data Surat Keluar...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <p className="font-medium text-sm text-zinc-600 dark:text-zinc-300">Belum ada Surat Keluar.</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Klik <strong>Generate Surat Dinas</strong> untuk membuat naskah dinas resmi.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const hasTemplate = Boolean(item.document_payload || item.template_type);
                  const isDraft = item.status === "draft";
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-blue-600 dark:text-blue-400">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span>{item.no_surat}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 pl-5">
                          <Calendar className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span>{item.tanggal_surat}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top max-w-[280px] font-semibold text-[12.5px] text-zinc-800 dark:text-zinc-200 leading-snug">
                        {item.tujuan_surat}
                      </td>

                      <td className="py-3 px-3.5 align-top max-w-[320px] text-[12px] text-zinc-700 dark:text-zinc-300 leading-snug">
                        {item.perihal}
                      </td>

                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                          {item.sifat || "Biasa"}
                        </span>
                        <span className="text-[10.5px] text-zinc-400 block mt-1">
                          {item.lampiran || "-"}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        {isDraft ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400">
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Terdaftar
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        {getTemplateBadge(item.template_type)}
                      </td>

                      <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.document_payload && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPreview(item)}
                              className="h-7 px-2 text-xs gap-1 text-zinc-700 hover:text-emerald-600 rounded-lg"
                              title="Lihat Pratinjau Dokumen Cetak"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline text-[11px]">Lihat</span>
                            </Button>
                          )}

                          {hasTemplate ? (
                            <Link href={`/surat/keluar/dinas?id=${item.id}&template=${item.template_type || 'surat_dinas'}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 text-zinc-700 hover:text-blue-600 rounded-lg"
                                title="Edit Dokumen di Generator"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline text-[11px]">Edit</span>
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditManual(item)}
                              className="h-7 px-2 text-xs gap-1 text-zinc-700 hover:text-blue-600 rounded-lg"
                              title="Edit Agenda Surat Manual"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline text-[11px]">Edit</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id, item.no_surat)}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-red-600 rounded-lg"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pop-up Modal Pratinjau Dokumen */}
      <Dialog open={!!selectedPreview} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent className="w-[96vw] sm:max-w-5xl lg:max-w-6xl max-h-[94vh] overflow-y-auto p-4 md:p-6 bg-zinc-100 dark:bg-zinc-950 rounded-2xl shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>Pratinjau Dokumen: {selectedPreview?.no_surat}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              <Button
                size="sm"
                onClick={handlePrintSuratDinas}
                className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Dokumen
              </Button>
              {selectedPreview?.id && (selectedPreview.document_payload || selectedPreview.template_type) && (
                <Link href={`/surat/keluar/dinas?id=${selectedPreview.id}&template=${selectedPreview.template_type || 'surat_dinas'}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 rounded-lg">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit di Generator
                  </Button>
                </Link>
              )}
            </div>
          </DialogHeader>

          <div className="py-6 flex justify-center overflow-x-auto">
            {selectedPreview?.document_payload ? (
              <div className="w-full flex justify-center">
                <SuratDinasDocument data={selectedPreview.document_payload} />
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-zinc-400">
                Tidak ada data template untuk surat ini.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pop-up Modal Edit Surat Keluar Manual */}
      <Dialog open={!!editingManualSurat} onOpenChange={(open) => !open && setEditingManualSurat(null)}>
        <DialogContent className="sm:max-w-lg p-5 bg-white dark:bg-zinc-950 rounded-2xl shadow-xl">
          <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Pencil className="h-4 w-4 text-blue-600" />
              <span>Edit Surat Keluar (Agenda Manual)</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveManualEdit} className="space-y-3.5 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Nomor Surat</label>
                <Input
                  value={manualFormData.no_surat}
                  onChange={(e) => setManualFormData((p) => ({ ...p, no_surat: e.target.value }))}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Tanggal Surat</label>
                <Input
                  type="date"
                  value={manualFormData.tanggal_surat}
                  onChange={(e) => setManualFormData((p) => ({ ...p, tanggal_surat: e.target.value }))}
                  required
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Tujuan Surat</label>
              <Input
                value={manualFormData.tujuan_surat}
                onChange={(e) => setManualFormData((p) => ({ ...p, tujuan_surat: e.target.value }))}
                required
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Perihal</label>
              <Textarea
                value={manualFormData.perihal}
                onChange={(e) => setManualFormData((p) => ({ ...p, perihal: e.target.value }))}
                required
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Sifat</label>
                <select
                  value={manualFormData.sifat}
                  onChange={(e) => setManualFormData((p) => ({ ...p, sifat: e.target.value }))}
                  className="w-full h-8 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2"
                >
                  <option value="Biasa">Biasa</option>
                  <option value="Penting">Penting</option>
                  <option value="Rahasia">Rahasia</option>
                  <option value="Segera">Segera</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Lampiran</label>
                <Input
                  value={manualFormData.lampiran}
                  onChange={(e) => setManualFormData((p) => ({ ...p, lampiran: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Status</label>
                <select
                  value={manualFormData.status}
                  onChange={(e) => setManualFormData((p) => ({ ...p, status: e.target.value }))}
                  className="w-full h-8 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2"
                >
                  <option value="terdaftar">Terdaftar</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingManualSurat(null)}
                className="h-8 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingManual}
                className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSavingManual ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Pemilihan Format Naskah Dinas Permen 1/2025 */}
      <TemplatePickerModal
        open={isTemplatePickerOpen}
        onOpenChange={setIsTemplatePickerOpen}
      />
    </div>
  );
}
