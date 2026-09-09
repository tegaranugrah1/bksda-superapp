"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Inbox } from "lucide-react";
import api from "@/lib/api";

import type {
  AssignmentLetter,
  PaginationMeta,
  StatusCounts,
  AdvancedFilters,
} from "./_lib/types";

import { ConfirmActionModal } from "./_components/ConfirmActionModal";
import { GmailInboxHeader } from "./_components/GmailInboxHeader";
import { GmailStatusTabs } from "./_components/GmailStatusTabs";
import { GmailToolbar } from "./_components/GmailToolbar";
import { GmailRowItem } from "./_components/GmailRowItem";
import { GmailReaderView } from "./_components/GmailReaderView";

export default function SuratTugasInbox() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<string>("all"); // 'all' | 'pending' | 'approved' | 'draft' | 'rejected' | 'trashed'
  const [splitView, setSplitView] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<AssignmentLetter | null>(null);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    variant: "danger" | "warning" | "success";
  }>({
    open: false,
    title: "",
    message: "",
    action: async () => {},
    variant: "warning",
  });

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
      toast.success(`Berhasil mengubah status menjadi ${newStatus}`);
      fetchLetters();
      fetchCounts();
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      if (selectedLetter && selectedLetter.id === id) {
        setSelectedLetter({ ...selectedLetter, status: newStatus as AssignmentLetter["status"] });
      }
    } catch (error) {
      console.error("Status update failed", error);
      toast.error("Gagal memperbarui status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleApprove = (letter: AssignmentLetter) => {
    setConfirmModal({
      open: true,
      title: "Terbitkan Surat Tugas?",
      message: `Surat tugas "${letter.nomor_surat || letter.maksud_tujuan}" akan diterbitkan dan disetujui secara resmi.`,
      variant: "success",
      action: async () => {
        try {
          await api.put(`/surat-tugas/${letter.id}/approve`, { status: "approved" });
          toast.success("Surat tugas berhasil diterbitkan.");
          fetchLetters();
          fetchCounts();
          queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
          if (selectedLetter?.id === letter.id) {
            setSelectedLetter({ ...letter, status: "approved" });
          }
        } catch (error) {
          console.error("Approval failed", error);
          toast.error("Gagal menerbitkan surat tugas");
        }
      },
    });
  };

  const handleReject = (letter: AssignmentLetter) => {
    setConfirmModal({
      open: true,
      title: "Tolak Pengajuan?",
      message: "Surat tugas ini akan ditolak statusnya.",
      variant: "warning",
      action: async () => {
        handleUpdateStatus(letter.id, "rejected");
      },
    });
  };

  // Action: Single Delete / Restore
  const handleDelete = (id: string) => {
    setConfirmModal({
      open: true,
      title: "Pindahkan ke Sampah?",
      message: "Dokumen ini akan dipindahkan ke arsip sampah. Anda masih dapat memulihkannya nanti.",
      variant: "warning",
      action: async () => {
        try {
          await api.delete(`/surat-tugas/${id}`);
          toast.success("Berhasil memindahkan ke sampah");
          if (selectedLetter?.id === id) {
            setSelectedLetter(null);
          }
          fetchLetters();
          fetchCounts();
          queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
        } catch (error) {
          console.error("Delete failed", error);
          toast.error("Gagal menghapus surat tugas");
        }
      },
    });
  };

  const handleRestore = (id: string) => {
    setConfirmModal({
      open: true,
      title: "Pulihkan Surat Tugas?",
      message: "Dokumen ini akan dikembalikan ke daftar aktif.",
      variant: "success",
      action: async () => {
        try {
          await api.post(`/surat-tugas/${id}/restore`);
          toast.success("Berhasil memulihkan surat tugas");
          if (selectedLetter?.id === id) {
            setSelectedLetter(null);
          }
          fetchLetters();
          fetchCounts();
          queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
        } catch (error) {
          console.error("Restore failed", error);
          toast.error("Gagal memulihkan surat tugas");
        }
      },
    });
  };

  // Bulk Actions
  const handleBulkTrash = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      open: true,
      title: `Pindahkan ${selectedIds.length} Dokumen ke Sampah?`,
      message: `${selectedIds.length} dokumen terpilih akan dipindahkan ke arsip sampah.`,
      variant: "warning",
      action: async () => {
        try {
          await api.post("/surat-tugas/bulk-trash", { ids: selectedIds });
          toast.success(`${selectedIds.length} dokumen dipindahkan ke sampah.`);
          setSelectedIds([]);
          if (selectedLetter && selectedIds.includes(selectedLetter.id)) {
            setSelectedLetter(null);
          }
          fetchLetters();
          fetchCounts();
          queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
        } catch (error) {
          console.error("Bulk trash failed", error);
          toast.error("Gagal memproses penghapusan massal.");
        }
      },
    });
  };

  const handleBulkRestore = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      open: true,
      title: `Pulihkan ${selectedIds.length} Dokumen?`,
      message: `${selectedIds.length} dokumen terpilih akan dikembalikan ke daftar aktif.`,
      variant: "success",
      action: async () => {
        try {
          await api.post("/surat-tugas/bulk-restore", { ids: selectedIds });
          toast.success(`${selectedIds.length} dokumen berhasil dipulihkan.`);
          setSelectedIds([]);
          if (selectedLetter && selectedIds.includes(selectedLetter.id)) {
            setSelectedLetter(null);
          }
          fetchLetters();
          fetchCounts();
          queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
        } catch (error) {
          console.error("Bulk restore failed", error);
          toast.error("Gagal memulihkan dokumen terpilih.");
        }
      },
    });
  };

  const handleDownload = async (letter: AssignmentLetter) => {
    try {
      const resp = await api.get(`/surat-tugas/${letter.id}/download`, {
        responseType: "blob",
        timeout: 30000,
      });
      const contentDisposition = resp.headers["content-disposition"];
      const blob = new Blob([resp.data]);
      const blobType = resp.data?.type || resp.headers["content-type"] || "";
      const ext = blobType.includes("png")
        ? "png"
        : blobType.includes("jpeg") || blobType.includes("jpg")
        ? "jpg"
        : "pdf";
      let filename = `SuratTugas_${letter.nomor_surat ? letter.nomor_surat.replace(/\//g, "_") : letter.id}.${ext}`;
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
    } catch {
      toast.error("Gagal mengunduh dokumen surat tugas.");
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

  // Render Full Reader View (when in full view mode & a letter is selected)
  if (!splitView && selectedLetter) {
    return (
      <div className="p-6 space-y-6 animate-in fade-in duration-200">
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-[700px] flex flex-col">
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
            onDelete={handleDelete}
            onRestore={handleRestore}
            onCreatePlh={openPlhBuilder}
            existingPlh={findExistingPlhDraft(selectedLetter)}
            onOpenExistingPlh={(plh) => router.push(`/kepegawaian/surat-tugas/builder/${plh.id}`)}
            isTrashView={isTrashView}
            updatingStatus={updatingStatus}
            isSplitView={false}
          />
        </div>

        <ConfirmActionModal
          open={confirmModal.open}
          onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
          title={confirmModal.title}
          message={confirmModal.message}
          action={confirmModal.action}
          variant={confirmModal.variant}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header Top Section: Title & Compose Button (Matching /kepegawaian/cuti) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          onClick={() => router.push("/kepegawaian/surat-tugas/create")}
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
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[640px] h-[calc(100vh-240px)]">
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
              splitView ? "max-w-[420px] lg:max-w-[480px] border-r border-slate-200 dark:border-zinc-800" : ""
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
                    onQuickEdit={handleEdit}
                    onQuickDelete={handleDelete}
                    onQuickRestore={handleRestore}
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
                  onDelete={handleDelete}
                  onRestore={handleRestore}
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

      {/* Confirmation Modal */}
      <ConfirmActionModal
        open={confirmModal.open}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        action={confirmModal.action}
        variant={confirmModal.variant}
      />
    </div>
  );
}
