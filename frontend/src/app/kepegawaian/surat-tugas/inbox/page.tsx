"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Inbox } from "lucide-react";
import api from "@/lib/api";
import { useRole } from "@/hooks/useRole";

import type {
  AssignmentLetter,
  PaginationMeta,
  StatusCounts,
  AdvancedFilters,
} from "./_lib/types";

import { useConfirm } from "@/components/ui/confirm-dialog";
import { GmailInboxHeader } from "./_components/GmailInboxHeader";
import { GmailStatusTabs } from "./_components/GmailStatusTabs";
import { GmailToolbar } from "./_components/GmailToolbar";
import { GmailRowItem } from "./_components/GmailRowItem";
import { GmailReaderView } from "./_components/GmailReaderView";
import { ScanViewerModal } from "@/app/kepegawaian/cuti/_components/ScanViewerModal";

export default function SuratTugasInbox() {
  const router = useRouter();
  const { canWrite } = useRole();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<string>("all"); // 'all' | 'pending' | 'approved' | 'draft' | 'rejected' | 'trashed'
  const [splitView, setSplitView] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<AssignmentLetter | null>(null);
  const [previewModalLetter, setPreviewModalLetter] = useState<AssignmentLetter | null>(null);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);


  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when tab or filters change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setPage(1);
    setSelectedIds([]);
    if (!splitView) {
      setSelectedLetter(null);
    }
  };

  const handleFiltersChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds([]);
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const isTrashView = activeTab === "trashed";

  // Fetch Status Counts for Tabs
  const { data: statusCounts, refetch: fetchCounts } = useQuery<StatusCounts>({
    queryKey: ["surat-tugas-status-counts"],
    queryFn: async () => {
      const resp = await api.get("/surat-tugas/status-counts");
      return resp.data as StatusCounts;
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Fetch Paginated Letters
  const {
    data: listResponse,
    isLoading: loading,
    refetch: fetchLetters,
  } = useQuery<{ data: AssignmentLetter[]; meta: PaginationMeta }>({
    queryKey: [
      "surat-tugas-inbox-list",
      activeTab,
      page,
      perPage,
      debouncedSearch,
      filters,
    ],
    queryFn: async () => {
      const statusParam =
        ["draft", "pending", "approved", "rejected"].includes(activeTab)
          ? activeTab
          : undefined;

      const resp = await api.get("/surat-tugas", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          status: statusParam,
          trashed: isTrashView ? "true" : "false",
          nomor_surat: filters.nomor_surat || undefined,
          employee: filters.pegawai || undefined,
          tempat_tujuan: filters.tempat_tujuan || undefined,
          template_type: filters.template_type || undefined,
          sumber_dana: filters.sumber_dana || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        },
      });

      return resp.data as { data: AssignmentLetter[]; meta: PaginationMeta };
    },
    staleTime: 0,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const letters: AssignmentLetter[] = useMemo(
    () => listResponse?.data || [],
    [listResponse?.data]
  );
  const meta: PaginationMeta | undefined = listResponse?.meta;

  // Sync selected letter if split view is enabled and letters load
  useEffect(() => {
    if (splitView && letters.length > 0 && !selectedLetter) {
      setSelectedLetter(letters[0]);
    }
  }, [splitView, letters, selectedLetter]);

  // Keep selectedLetter in sync with fresh query data
  useEffect(() => {
    if (selectedLetter && letters.length > 0) {
      const fresh = letters.find((l) => l.id === selectedLetter.id);
      if (fresh && (fresh.nomor_surat !== selectedLetter.nomor_surat || fresh.status !== selectedLetter.status)) {
        setSelectedLetter(fresh);
      }
    }
  }, [letters, selectedLetter]);

  // Multi-Selection handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAllPage = useCallback(() => {
    setSelectedIds(letters.map((l) => l.id));
  }, [letters]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Action: Single Status Update
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/surat-tugas/${id}/status`, { status: newStatus });
      const statusLabel =
        newStatus === "approved"
          ? "Disetujui"
          : newStatus === "rejected"
          ? "Ditolak"
          : newStatus === "draft"
          ? "Draft"
          : newStatus;
      toast.success("Status surat tugas diperbarui", {
        description: `Status telah diubah menjadi ${statusLabel}.`,
      });
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      if (selectedLetter && selectedLetter.id === id) {
        setSelectedLetter({ ...selectedLetter, status: newStatus as AssignmentLetter["status"] });
      }
    } catch (error) {
      console.error("Status update failed", error);
      toast.error("Gagal memperbarui status", {
        description: "Terjadi kesalahan saat memproses perubahan status.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleApprove = async (letter: AssignmentLetter) => {
    const ident = letter.nomor_surat
      ? `Nomor ${letter.nomor_surat}`
      : (letter.maksud_tujuan || "dokumen ini");
    const ok = await confirm({
      title: "Terbitkan Surat Tugas?",
      description: `Surat tugas (${ident}) akan diterbitkan dan disetujui secara resmi. Nomor surat dan stempel digital akan dikunci.`,
      confirmText: "Terbitkan Sekarang",
      cancelText: "Batal",
      variant: "info",
    });
    if (!ok) return;

    try {
      await api.put(`/surat-tugas/${letter.id}/approve`, { status: "approved" });
      toast.success("Surat tugas berhasil diterbitkan", {
        description: `${letter.nomor_surat || "Dokumen"} telah resmi disetujui.`,
      });
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      if (selectedLetter?.id === letter.id) {
        setSelectedLetter({ ...letter, status: "approved" });
      }
    } catch (error) {
      console.error("Approval failed", error);
      toast.error("Gagal menerbitkan surat tugas", {
        description: "Periksa kelengkapan data atau koneksi Anda.",
      });
    }
  };

  const handleReject = async (letter: AssignmentLetter) => {
    const ident = letter.nomor_surat
      ? `Nomor ${letter.nomor_surat}`
      : (letter.maksud_tujuan || "dokumen ini");
    const ok = await confirm({
      title: "Tolak Pengajuan Surat Tugas?",
      description: `Pengajuan surat tugas (${ident}) akan ditolak dan dikembalikan untuk diperbaiki oleh pembuat surat.`,
      confirmText: "Tolak Pengajuan",
      cancelText: "Batal",
      variant: "warning",
    });
    if (!ok) return;

    await handleUpdateStatus(letter.id, "rejected");
  };

  // Action: Single Delete / Restore
  const handleDelete = async (id: string) => {
    const target = letters.find((l) => l.id === id) || (selectedLetter?.id === id ? selectedLetter : null);
    const ident = target?.nomor_surat
      ? `Nomor ${target.nomor_surat}`
      : (target?.maksud_tujuan || "Surat tugas ini");
    const ok = await confirm({
      title: "Pindahkan ke Sampah?",
      description: `${ident} akan dipindahkan ke folder sampah. Anda masih dapat memulihkannya kapan saja dari tab Sampah.`,
      confirmText: "Pindahkan ke Sampah",
      cancelText: "Batal",
      variant: "warning",
    });
    if (!ok) return;

    try {
      await api.delete(`/surat-tugas/${id}`);
      toast.success("Surat tugas dipindahkan ke sampah", {
        description: `${ident} berhasil dipindahkan ke folder sampah.`,
      });
      if (selectedLetter?.id === id) {
        setSelectedLetter(null);
      }
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
    } catch (error) {
      console.error("Delete failed", error);
      toast.error("Gagal menghapus surat tugas", {
        description: "Terjadi kesalahan saat memindahkan surat ke sampah.",
      });
    }
  };

  const handleRestore = async (id: string) => {
    const target = letters.find((l) => l.id === id) || (selectedLetter?.id === id ? selectedLetter : null);
    const ident = target?.nomor_surat
      ? `Nomor ${target.nomor_surat}`
      : (target?.maksud_tujuan || "Surat tugas ini");
    const ok = await confirm({
      title: "Pulihkan Surat Tugas?",
      description: `${ident} akan dipulihkan dan dikembalikan ke daftar surat tugas aktif.`,
      confirmText: "Pulihkan Dokumen",
      cancelText: "Batal",
      variant: "info",
    });
    if (!ok) return;

    try {
      await api.post(`/surat-tugas/${id}/restore`);
      toast.success("Surat tugas berhasil dipulihkan", {
        description: `${ident} telah kembali ke daftar aktif.`,
      });
      if (selectedLetter?.id === id) {
        setSelectedLetter(null);
      }
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
    } catch (error) {
      console.error("Restore failed", error);
      toast.error("Gagal memulihkan surat tugas", {
        description: "Terjadi kesalahan saat memulihkan dokumen.",
      });
    }
  };

  // Bulk Actions
  const handleBulkTrash = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const ok = await confirm({
      title: `Pindahkan ${count} Dokumen ke Sampah?`,
      description: `${count} surat tugas terpilih akan dipindahkan ke folder sampah. Dokumen masih dapat dipulihkan sewaktu-waktu.`,
      confirmText: `Pindahkan ${count} Dokumen`,
      cancelText: "Batal",
      variant: "warning",
    });
    if (!ok) return;

    try {
      await api.post("/surat-tugas/bulk-trash", { ids: selectedIds });
      toast.success(`${count} dokumen dipindahkan ke sampah`, {
        description: "Surat tugas terpilih telah dipindahkan ke folder sampah.",
      });
      setSelectedIds([]);
      if (selectedLetter && selectedIds.includes(selectedLetter.id)) {
        setSelectedLetter(null);
      }
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
    } catch (error) {
      console.error("Bulk trash failed", error);
      toast.error("Gagal memproses penghapusan massal", {
        description: "Terjadi gangguan saat memindahkan dokumen ke sampah.",
      });
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const ok = await confirm({
      title: `Pulihkan ${count} Dokumen?`,
      description: `${count} surat tugas terpilih akan dipulihkan dan dikembalikan ke daftar surat aktif.`,
      confirmText: `Pulihkan ${count} Dokumen`,
      cancelText: "Batal",
      variant: "info",
    });
    if (!ok) return;

    try {
      await api.post("/surat-tugas/bulk-restore", { ids: selectedIds });
      toast.success(`${count} dokumen berhasil dipulihkan`, {
        description: "Dokumen terpilih telah dikembalikan ke daftar aktif.",
      });
      setSelectedIds([]);
      if (selectedLetter && selectedIds.includes(selectedLetter.id)) {
        setSelectedLetter(null);
      }
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
    } catch (error) {
      console.error("Bulk restore failed", error);
      toast.error("Gagal memulihkan dokumen terpilih", {
        description: "Terjadi kesalahan saat memulihkan dokumen massal.",
      });
    }
  };

  const handleForceDelete = async (id: string) => {
    const target = letters.find((l) => l.id === id) || (selectedLetter?.id === id ? selectedLetter : null);
    const ident = target?.nomor_surat
      ? `Nomor ${target.nomor_surat}`
      : (target?.maksud_tujuan || "Surat tugas ini");
    const ok = await confirm({
      title: "Hapus Permanen Surat Tugas?",
      description: `Tindakan ini tidak dapat dibatalkan. Berkas arsip dan data ${ident} akan dimusnahkan secara permanen dari server database.`,
      confirmText: "Hapus Permanen",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`/surat-tugas/${id}/force`);
      toast.success("Surat tugas berhasil dihapus permanen", {
        description: `${ident} telah dimusnahkan secara permanen.`,
      });
      if (selectedLetter?.id === id) {
        setSelectedLetter(null);
      }
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      queryClient.invalidateQueries({ queryKey: ["kepegawaian-dashboard-stats"] });
    } catch (error) {
      console.error("Force delete failed", error);
      toast.error("Gagal menghapus permanen surat tugas", {
        description: "Terjadi kesalahan saat memusnahkan dokumen.",
      });
    }
  };

  const handleBulkForceDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const ok = await confirm({
      title: `Hapus Permanen ${count} Dokumen?`,
      description: `Tindakan ini permanen dan tidak dapat dibatalkan. Seluruh berkas arsip dan data ${count} dokumen terpilih akan dimusnahkan dari database.`,
      confirmText: `Hapus Permanen ${count} Dokumen`,
      cancelText: "Batal",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.post("/surat-tugas/bulk-force-delete", { ids: selectedIds });
      toast.success(`${count} dokumen berhasil dihapus permanen`, {
        description: "Seluruh data terpilih telah dimusnahkan secara permanen.",
      });
      setSelectedIds([]);
      if (selectedLetter && selectedIds.includes(selectedLetter.id)) {
        setSelectedLetter(null);
      }
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      queryClient.invalidateQueries({ queryKey: ["kepegawaian-dashboard-stats"] });
    } catch (error) {
      console.error("Bulk force delete failed", error);
      toast.error("Gagal menghapus permanen dokumen terpilih", {
        description: "Terjadi kesalahan saat memusnahkan dokumen massal.",
      });
    }
  };

  const handleViewDoc = (letter: AssignmentLetter) => {
    if (!letter.file_surat_path) {
      toast.error("Surat tugas ini tidak memiliki lampiran dokumen dasar.");
      return;
    }
    setPreviewModalLetter(letter);
  };

  const handleDownload = async (letter: AssignmentLetter) => {
    if (!letter.file_surat_path) {
      toast.error("Surat tugas ini tidak memiliki lampiran dokumen dasar.");
      return;
    }
    const toastId = toast.loading("Mengunduh dokumen dasar...");
    try {
      const resp = await api.get(`/surat-tugas/${letter.id}/download`, {
        params: { preview: 1 },
      });
      if (resp.data?.data_url) {
        const link = document.createElement("a");
        link.href = resp.data.data_url;
        link.download =
          resp.data.file_name ||
          `Dokumen_Dasar_${letter.nomor_surat ? letter.nomor_surat.replace(/[^a-zA-Z0-9]/g, "_") : letter.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Dokumen dasar berhasil diunduh.", { id: toastId });
        return;
      }

      const blobResp = await api.get(`/surat-tugas/${letter.id}/download`, {
        params: { download: 1 },
        responseType: "blob",
        timeout: 30000,
      });
      const contentDisposition = blobResp.headers["content-disposition"];
      const blob = new Blob([blobResp.data]);
      const blobType = blobResp.data?.type || blobResp.headers["content-type"] || "";
      const ext = blobType.includes("png")
        ? "png"
        : blobType.includes("jpeg") || blobType.includes("jpg")
        ? "jpg"
        : "pdf";
      let filename = `Dokumen_Dasar_${letter.nomor_surat ? letter.nomor_surat.replace(/\//g, "_") : letter.id}.${ext}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1].replace(/['"]/g, ""));
        }
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Dokumen dasar berhasil diunduh.", { id: toastId });
    } catch {
      toast.error("Gagal mengunduh dokumen dasar surat tugas.", { id: toastId });
    }
  };

  const handleEdit = (letter: AssignmentLetter) => {
    router.push(`/kepegawaian/surat-tugas/builder/${letter.id}`);
  };

  // PLH Draft Helper
  const findExistingPlhDraft = useCallback(
    (parentLetter: AssignmentLetter) => {
      return letters.find((letter) => {
        if (letter.id === parentLetter.id) return false;
        if (letter.template_type !== "plh") return false;
        if (!["draft", "pending"].includes(letter.status)) return false;

        const hasParentNumber = Boolean(
          parentLetter.nomor_surat &&
            letter.dasar?.some((item) => item.text?.includes(parentLetter.nomor_surat || ""))
        );
        if (hasParentNumber) return true;

        const parentPlhName = parentLetter.nama_plh?.trim().toLowerCase();
        const hasSamePlhPerson = Boolean(
          parentPlhName &&
            letter.employees.some((employee) => employee.nama_lengkap?.trim().toLowerCase() === parentPlhName)
        );

        return hasSamePlhPerson && letter.maksud_tujuan.toLowerCase().includes("pelaksana harian");
      });
    },
    [letters]
  );

  const openPlhBuilder = useCallback(
    (parentLetter: AssignmentLetter) => {
      const existingDraft = findExistingPlhDraft(parentLetter);
      if (existingDraft) {
        toast.info("Draft ST PLH yang sudah ada dibuka.");
        router.push(`/kepegawaian/surat-tugas/builder/${existingDraft.id}`);
        return;
      }
      router.push(`/kepegawaian/surat-tugas/create?template=plh&parent_st_id=${parentLetter.id}`);
    },
    [findExistingPlhDraft, router]
  );

  // Keyboard navigation for Prev/Next document
  const currentIndex = useMemo(() => {
    if (!selectedLetter) return -1;
    return letters.findIndex((l) => l.id === selectedLetter.id);
  }, [letters, selectedLetter]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < letters.length - 1;

  const handlePrevDoc = useCallback(() => {
    if (hasPrev) {
      setSelectedLetter(letters[currentIndex - 1]);
    }
  }, [hasPrev, letters, currentIndex]);

  const handleNextDoc = useCallback(() => {
    if (hasNext) {
      setSelectedLetter(letters[currentIndex + 1]);
    }
  }, [hasNext, letters, currentIndex]);

  const hasActiveFilters = Object.values(filters).some((v) => Boolean(v));

  const previewModalElement = (
    <ScanViewerModal
      isOpen={Boolean(previewModalLetter)}
      title="Pratinjau Dokumen Dasar Surat Tugas"
      scanUrl={previewModalLetter ? `/surat-tugas/${previewModalLetter.id}/download` : null}
      fileName={
        previewModalLetter
          ? `Dokumen_Dasar_${previewModalLetter.nomor_surat ? previewModalLetter.nomor_surat.replace(/\//g, "_") : previewModalLetter.id}.pdf`
          : null
      }
      onClose={() => setPreviewModalLetter(null)}
    />
  );

  // Render Full Reader View (when in full view mode & a letter is selected)
  if (!splitView && selectedLetter) {
    return (
      <div className="p-6 space-y-6 animate-in fade-in duration-200">
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-175 flex flex-col">
          <GmailReaderView
            letter={selectedLetter}
            onBack={() => setSelectedLetter(null)}
            onPrev={handlePrevDoc}
            onNext={handleNextDoc}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={handleEdit}
            onDownload={handleDownload}
            onViewDoc={handleViewDoc}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onForceDelete={canWrite ? handleForceDelete : undefined}
            onCreatePlh={openPlhBuilder}
            existingPlh={findExistingPlhDraft(selectedLetter)}
            onOpenExistingPlh={(plh) => router.push(`/kepegawaian/surat-tugas/builder/${plh.id}`)}
            isTrashView={isTrashView}
            updatingStatus={updatingStatus}
            isSplitView={false}
          />
        </div>
        {previewModalElement}
      </div>
    );
  }

  return (
    <div className="p-5 md:p-7 space-y-5">
      {/* Header Top Section: Title & Compose Button (Matching /kepegawaian/cuti) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Inbox className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Inbox Surat Tugas Pegawai
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Daftar pengajuan & arsip surat tugas pegawai (Otorisasi, Cetak, Buat PLH, dan Kelola Arsip).
          </p>
        </div>

        {/* Compose Button ala Gmail "Tulis" */}
        <button
          onClick={() => router.push("/surat-tugas")}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Surat Tugas</span>
        </button>
      </div>

      {/* Filter Toolbar ala /kepegawaian/cuti */}
      <GmailInboxHeader
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        totalCount={meta?.total ?? letters.length}
      />

      {/* Main Gmail Box Container */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-160 h-[calc(100vh-240px)]">
        {/* Horizontal Status Tabs ala Gmail */}
        <GmailStatusTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={statusCounts}
        />

        {/* Gmail Toolbar: Checkbox master, Refresh, Bulk actions, Pagination */}
        <GmailToolbar
          meta={meta}
          loading={loading}
          onRefresh={() => {
            fetchLetters();
            fetchCounts();
          }}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
          selectedCount={selectedIds.length}
          totalOnPage={letters.length}
          onSelectAllPage={handleSelectAllPage}
          onDeselectAll={handleDeselectAll}
          onBulkTrash={handleBulkTrash}
          onBulkRestore={handleBulkRestore}
          onBulkForceDelete={canWrite ? handleBulkForceDelete : undefined}
          isTrashView={isTrashView}
          splitView={splitView}
          onToggleSplitView={() => {
            const next = !splitView;
            setSplitView(next);
            if (next && letters.length > 0 && !selectedLetter) {
              setSelectedLetter(letters[0]);
            }
          }}
        />

        {/* Content Area: Full Table vs Split Pane */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Table / List View */}
          <div
            className={`flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar ${
              splitView ? "max-w-105 lg:max-w-120 border-r border-slate-200 dark:border-zinc-800" : ""
            }`}
          >
            {loading ? (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 animate-pulse p-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-11 bg-slate-50 dark:bg-zinc-800/40 rounded-lg my-1" />
                ))}
              </div>
            ) : letters.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <Inbox className="w-12 h-12 stroke-[1.2] opacity-20 mb-3" />
                <p className="font-bold text-sm text-slate-600 dark:text-zinc-300">Tidak ada surat tugas</p>
                <p className="text-xs text-slate-400 mt-1">
                  {hasActiveFilters || debouncedSearch
                    ? "Coba ubah kata kunci atau bersihkan filter penelusuran Anda."
                    : "Belum ada dokumen yang sesuai dengan kategori ini."}
                </p>
                {(hasActiveFilters || debouncedSearch) && (
                  <button
                    onClick={handleResetFilters}
                    className="mt-4 px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-zinc-300"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {letters.map((letter) => (
                  <GmailRowItem
                    key={letter.id}
                    letter={letter}
                    isSelected={selectedIds.includes(letter.id)}
                    onToggleSelect={handleToggleSelect}
                    onClick={(clicked) => setSelectedLetter(clicked)}
                    onQuickDownload={handleDownload}
                    onQuickApprove={handleApprove}
                    onQuickEdit={handleEdit}
                    onQuickDelete={handleDelete}
                    onQuickRestore={handleRestore}
                    onQuickForceDelete={canWrite ? handleForceDelete : undefined}
                    isTrashView={isTrashView}
                    isActive={splitView && selectedLetter?.id === letter.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Pane (Only in Split-Pane Mode) */}
          {splitView && (
            <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-white dark:bg-zinc-900">
              {selectedLetter ? (
                <GmailReaderView
                  letter={selectedLetter}
                  onPrev={handlePrevDoc}
                  onNext={handleNextDoc}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={handleEdit}
                  onDownload={handleDownload}
                  onViewDoc={handleViewDoc}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  onForceDelete={canWrite ? handleForceDelete : undefined}
                  onCreatePlh={openPlhBuilder}
                  existingPlh={findExistingPlhDraft(selectedLetter)}
                  onOpenExistingPlh={(plh) => router.push(`/kepegawaian/surat-tugas/builder/${plh.id}`)}
                  isTrashView={isTrashView}
                  updatingStatus={updatingStatus}
                  isSplitView={true}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <Inbox className="w-12 h-12 stroke-[1.2] opacity-20 mb-3" />
                  <p className="font-bold text-sm text-slate-600 dark:text-zinc-300">
                    Pilih surat tugas untuk membaca
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Klik pada salah satu baris di panel sebelah kiri.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Modal Pratinjau Dokumen Dasar */}
      {previewModalElement}
    </div>
  );
}
