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
  Eye,
  Pencil,
  Trash2,
  Printer,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
import { useKepegawaianTabs } from "@/app/kepegawaian/_lib/useKepegawaianTabs";
import { KepegawaianTabContent } from "@/app/kepegawaian/_components/KepegawaianTabContent";
import { useDialogFocusReturn } from "@/components/ui/use-dialog-focus-return";
import type { SuratKeluar } from "../_lib/surat-types";
import {
  SuratDinasDocument,
  handlePrintSuratDinas,
} from "../_components/SuratDinasDocument";
import { TemplatePickerModal, ALL_TEMPLATES } from "../_components/TemplatePickerModal";

const STATUS_TABS = ["all", "terdaftar", "draft"] as const;
type StatusFilter = (typeof STATUS_TABS)[number];

const STATUS_TAB_META: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "terdaftar", label: "Terdaftar" },
  { id: "draft", label: "Draft" },
];

const getTemplateBadge = (tplType?: string | null) => {
  const tpl = ALL_TEMPLATES.find((t) => t.id === tplType);
  if (!tpl) return <span className="text-[11px] text-[var(--ds-fg-muted)]">Manual / Umum</span>;
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${tpl.colorClass}`}>
      {tpl.name}
    </Badge>
  );
};

export default function SuratKeluarListPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const focusReturn = useDialogFocusReturn();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const tabs = useKepegawaianTabs(statusFilter, "Filter status surat keluar");

  const {
    data: suratList = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<SuratKeluar[]>({
    queryKey: ["surat-keluar", search],
    queryFn: async () => {
      const res = await api.get("/surat/surat-keluar", {
        params: { search: search.trim() || undefined, per_page: 50 },
      });
      return res.data?.data || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
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
          <p className="text-sm text-[var(--ds-fg-muted)]">
            Apakah Anda yakin ingin menghapus data surat keluar ini?
          </p>
          <div className="p-3 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] text-xs font-mono font-semibold text-[var(--ds-fg)] break-all text-center select-all">
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
      contentModule: "persuratan",
      contentClassName: "psr-ui",
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
    <div className="psr-ui w-full p-4 md:p-5 space-y-3 text-[var(--ds-fg)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
              <Send className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold text-[var(--ds-fg)]">
              Daftar Surat Keluar
            </h1>
          </div>
          <p className="text-xs text-[var(--ds-fg-muted)]">
            Penatausahaan dan pengagendaan naskah dinas resmi Permen Kehutanan No. 1/2025.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsTemplatePickerOpen(true)}
            className="h-8 px-3 text-xs font-semibold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Buat Naskah Dinas
          </Button>
          <Link href="/surat/keluar/create">
            <Button variant="outline" className="kpg-secondary h-8 px-3 text-xs font-semibold rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Input Manual
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-2 md:px-3.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-2 h-4 w-4 text-[var(--ds-fg-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no surat, tujuan, perihal..."
              className="pl-9 h-8 text-xs"
            />
          </div>

          {/* Sliding Pill Status Filter */}
          <div
            {...tabs.tabListProps}
            className="kpg-pill-tabs flex items-center gap-1 p-1 rounded-xl"
          >
            {STATUS_TAB_META.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  {...tabs.tabProps(tab.id)}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "relative px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none",
                    isActive
                      ? "text-[var(--ds-accent-on-solid)]"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeSuratKeluarStatusTab"
                      className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            aria-label="Filter format template"
            className="h-8 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-2.5 text-[var(--ds-fg)] font-medium max-w-[175px]"
          >
            <option value="all">Semua Format ({ALL_TEMPLATES.length})</option>
            {ALL_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ds-fg-muted)]">
          {isFetching && (
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--ds-accent-fg)]">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Menyinkronkan...
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Segarkan data surat keluar"
            title="Segarkan data surat keluar"
            className="h-8 w-8 p-0 text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] rounded-lg hover:bg-[var(--ds-surface-muted)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[var(--ds-accent-fg)]" : ""}`} />
          </Button>
          <span>
            Menampilkan <span className="text-[var(--ds-fg)] font-bold">{filteredList.length}</span> Surat Keluar
          </span>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-700 dark:text-rose-300">
          <span>Gagal memuat daftar Surat Keluar dari server.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-7 px-2.5 text-xs font-semibold border-rose-500/40 text-rose-700 dark:text-rose-200 hover:bg-rose-500/15"
          >
            Coba lagi
          </Button>
        </div>
      )}

      {/* Data Table */}
      <div {...tabs.panelProps}>
        <KepegawaianTabContent key={statusFilter}>
        <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] font-semibold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-2 px-3">Nomor & Tanggal Surat</th>
                  <th className="py-2 px-3 min-w-[180px]">Tujuan Surat</th>
                  <th className="py-2 px-3">Perihal</th>
                  <th className="py-2 px-3">Sifat & Lampiran</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Tipe Template</th>
                  <th className="py-2 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--ds-fg-muted)]">
                      Memuat data Surat Keluar...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[var(--ds-fg-muted)]">
                      <p className="font-medium text-sm text-[var(--ds-fg)]">Belum ada Surat Keluar.</p>
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                        Klik <strong>Buat Naskah Dinas</strong> untuk membuat naskah dinas resmi.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const hasTemplate = Boolean(item.document_payload || item.template_type);
                    const isDraft = item.status === "draft";
                    return (
                      <tr key={item.id} className="hover:bg-[var(--ds-surface-muted)] transition-colors">
                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ds-accent-fg)]">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span>{item.no_surat}</span>
                          </div>
                          {item.no_surat?.includes("${nomor_naskah}") && (
                            <div className="mt-0.5 pl-5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                Perlu Nomor Definitif
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--ds-fg-muted)] mt-0.5 pl-5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{item.tanggal_surat}</span>
                          </div>
                        </td>

                        <td className="py-2 px-3 align-top max-w-[240px] font-semibold text-[12px] text-[var(--ds-fg)] leading-snug">
                          <div className="line-clamp-2">{item.tujuan_surat}</div>
                        </td>

                        <td className="py-2 px-3 align-top max-w-[300px] text-[12px] text-[var(--ds-fg-muted)] leading-snug">
                          <div className="line-clamp-2">{item.perihal}</div>
                        </td>

                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                            {item.sifat || "Biasa"}
                          </span>
                          <span className="text-[10px] text-[var(--ds-fg-muted)] block mt-0.5">
                            {item.lampiran || "-"}
                          </span>
                        </td>

                        <td className="py-2 px-3 align-top whitespace-nowrap">
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

                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          {getTemplateBadge(item.template_type)}
                        </td>

                        <td className="py-2 px-3 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {item.document_payload && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPreview(item)}
                                className="kpg-secondary h-7 px-2 text-xs gap-1 rounded-lg"
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
                                  className="kpg-secondary h-7 px-2 text-xs gap-1 rounded-lg"
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
                                className="kpg-secondary h-7 px-2 text-xs gap-1 rounded-lg"
                                title="Edit Agenda Surat Manual"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline text-[11px]">Edit</span>
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Hapus surat keluar ${item.no_surat}`}
                              onClick={() => handleDelete(item.id, item.no_surat)}
                              className="h-7 w-7 p-0 text-[var(--ds-fg-muted)] hover:text-red-600 rounded-lg"
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
        </KepegawaianTabContent>
      </div>

      {/* Pop-up Modal Pratinjau Dokumen */}
      <Dialog open={!!selectedPreview} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent
          data-module="persuratan"
          {...focusReturn}
          className="psr-ui w-[96vw] sm:max-w-5xl lg:max-w-6xl max-h-[94vh] overflow-y-auto p-4 md:p-6 bg-[var(--ds-surface-muted)] rounded-2xl shadow-2xl border border-[var(--ds-border-subtle)]"
        >
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-[var(--ds-fg)]">
              <FileText className="h-4 w-4 text-[var(--ds-accent-fg)]" />
              <span>Pratinjau Dokumen: {selectedPreview?.no_surat}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              <Button
                size="sm"
                onClick={handlePrintSuratDinas}
                className="h-7 text-xs gap-1.5 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Dokumen
              </Button>
              {selectedPreview?.id && (selectedPreview.document_payload || selectedPreview.template_type) && (
                <Link href={`/surat/keluar/dinas?id=${selectedPreview.id}&template=${selectedPreview.template_type || 'surat_dinas'}`}>
                  <Button variant="outline" size="sm" className="kpg-secondary h-7 text-xs gap-1.5 rounded-lg">
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
              <div className="p-8 text-center text-sm text-[var(--ds-fg-muted)]">
                Tidak ada data template untuk surat ini.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pop-up Modal Edit Surat Keluar Manual */}
      <Dialog open={!!editingManualSurat} onOpenChange={(open) => !open && setEditingManualSurat(null)}>
        <DialogContent
          data-module="persuratan"
          {...focusReturn}
          className="psr-ui sm:max-w-lg p-5 bg-[var(--ds-surface)] rounded-2xl shadow-xl border border-[var(--ds-border-subtle)]"
        >
          <DialogHeader className="pb-3 border-b border-[var(--ds-border-subtle)]">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-[var(--ds-fg)]">
              <Pencil className="h-4 w-4 text-[var(--ds-accent-fg)]" />
              <span>Edit Surat Keluar (Agenda Manual)</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveManualEdit} className="space-y-3.5 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--ds-fg)] block mb-1">Nomor Surat</label>
                <Input
                  value={manualFormData.no_surat}
                  onChange={(e) => setManualFormData((p) => ({ ...p, no_surat: e.target.value }))}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-[var(--ds-fg)] block mb-1">Tanggal Surat</label>
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
              <label className="font-semibold text-[var(--ds-fg)] block mb-1">Tujuan Surat</label>
              <Input
                value={manualFormData.tujuan_surat}
                onChange={(e) => setManualFormData((p) => ({ ...p, tujuan_surat: e.target.value }))}
                required
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--ds-fg)] block mb-1">Perihal</label>
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
                <label className="font-semibold text-[var(--ds-fg)] block mb-1">Sifat</label>
                <select
                  value={manualFormData.sifat}
                  onChange={(e) => setManualFormData((p) => ({ ...p, sifat: e.target.value }))}
                  className="w-full h-8 text-xs rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-2 text-[var(--ds-fg)]"
                >
                  <option value="Biasa">Biasa</option>
                  <option value="Penting">Penting</option>
                  <option value="Rahasia">Rahasia</option>
                  <option value="Segera">Segera</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-[var(--ds-fg)] block mb-1">Lampiran</label>
                <Input
                  value={manualFormData.lampiran}
                  onChange={(e) => setManualFormData((p) => ({ ...p, lampiran: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-[var(--ds-fg)] block mb-1">Status</label>
                <select
                  value={manualFormData.status}
                  onChange={(e) => setManualFormData((p) => ({ ...p, status: e.target.value }))}
                  className="w-full h-8 text-xs rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-2 text-[var(--ds-fg)]"
                >
                  <option value="terdaftar">Terdaftar</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--ds-border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingManualSurat(null)}
                className="kpg-secondary h-8 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingManual}
                className="h-8 text-xs rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold"
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
