"use client";

import React, { useId, use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBatch, deleteBatch, getChecklist, AuctionBatch } from "../_lib/api";
import { getStatusLabel, getStatusColorClass, isReadOnly, AuctionBatchStatus } from "../_lib/status";
import { formatRupiah } from "../../auction-candidates/_lib/auction-helpers";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Layers,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Check,
  Trash2,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { BmnTabContent } from "@/app/bmn/_components/BmnTabContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import { getBlockedReason, getWorkflowTabs } from "./_lib/workflow-tabs";

// Lazy-loaded or imported tab components (stubbed for compile stability)
import { AssetsLotTab, useAssetsLotFormState } from "./_components/AssetsLotTab";
import { ValuationTab, useValuationFormState } from "./_components/ValuationTab";
import { DocumentsCenterTab, useDocumentsCenterFormState } from "./_components/DocumentsCenterTab";
import { RealizationTab, useRealizationFormState } from "./_components/RealizationTab";
import { AuditTrailTab } from "./_components/AuditTrailTab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BmnAuctionBatchDetailPage({ params }: PageProps) {
  const highlightId = useId();
  const reduced = useReducedMotion();
  const resolvedParams = use(params);
  const batchId = resolvedParams.id;
  const router = useRouter();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { hasPermission } = useRole();
  const [activeTab, setActiveTab] = useState("assets");
  const [isDeleting, setIsDeleting] = useState(false);

  // Load batch data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ["bmn-auction-batch", batchId],
    queryFn: () => getBatch(batchId),
  });
  const { data: checklist, refetch: refetchChecklist } = useQuery({
    queryKey: ["bmn-auction-batch-checklist", batchId],
    queryFn: () => getChecklist(batchId),
  });

  const batch = response?.data;
  const assetsForm = useAssetsLotFormState(batch);
  const valuationForm = useValuationFormState(batch);
  const realizationForm = useRealizationFormState(batch);
  const documentsForm = useDocumentsCenterFormState();

  if (isLoading) {
    return (
      <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui flex h-[80vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-accent-fg)]" />
        <p className="text-sm font-medium text-[var(--ds-fg-muted)]">Memuat detail paket lelang...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui flex h-[80vh] flex-col items-center justify-center space-y-4 text-center p-6">
        <AlertCircle className="h-12 w-12 text-[var(--ds-status-danger-fg)]" />
        <h2 className="text-lg font-bold text-[var(--ds-fg)]">Gagal Memuat Paket</h2>
        <p className="text-sm text-[var(--ds-fg-muted)] max-w-sm">
          Paket lelang tidak ditemukan atau Anda tidak memiliki akses untuk melihat paket ini.
        </p>
        <Button asChild variant="outline" className="rounded-xl"><Link href="/bmn/auction-batches">
            Kembali ke Daftar Paket
          </Link></Button>
        <Button variant="outline" onClick={() => refetch()}>Coba lagi</Button>
      </div>
    );
  }

  const canUpdate = hasPermission("bmn.auction.update");
  const canDelete = hasPermission("bmn.auction.delete");
  const readOnly = isReadOnly(batch.status) || !canUpdate;
  const refetchAll = () => {
    refetch();
    refetchChecklist();
    queryClient.invalidateQueries({ queryKey: ["bmn-auction-document-context", batchId] });
  };
  const workflowTabs = getWorkflowTabs(batch);
  const activeTabIndex = Math.max(
    0,
    workflowTabs.findIndex((tab) => tab.value === activeTab)
  );
  const previousTab = workflowTabs[activeTabIndex - 1] ?? null;
  const nextTab = workflowTabs[activeTabIndex + 1] ?? null;
  const nextBlockedReason = nextTab ? getBlockedReason(nextTab.value, checklist) : null;

  // Status timeline definition
  const statusesOrder = ["DRAFT", "DIAJUKAN", "JADWAL_DITETAPKAN", "LELANG_ULANG", "REALISASI"];
  const isCancelled = batch.status === "BATAL";

  const getStatusStepState = (statusKey: string) => {
    if (isCancelled) return "cancelled";

    const currentIndex = statusesOrder.indexOf(batch.status);
    const stepIndex = statusesOrder.indexOf(statusKey);

    // If batch is in REALISASI, everything is completed
    if (batch.status === "REALISASI") return "completed";

    // If batch status is not in the normal path (e.g. somehow different)
    if (currentIndex === -1 || stepIndex === -1) return "inactive";

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "inactive";
  };

  const handleDeleteBatch = async () => {
    if (!canDelete || isDeleting || !["DRAFT", "BATAL"].includes(batch.status)) return;
    const ok = await confirm({
      title: "Hapus Paket Lelang",
      description: `Apakah Anda yakin ingin menghapus paket "${batch.name}" (${batch.batch_number})? Sebanyak ${batch.assets_count} aset di dalamnya akan dikembalikan ke daftar kandidat lelang.`,
      confirmText: "Hapus Paket",
      cancelText: "Batal",
      variant: "danger",
      contentModule: "bmn",
      contentClassName: "bmn-assets-ui bmn-standard-ui bmn-popover",
    });

    if (!ok) return;

    try {
      setIsDeleting(true);
      await deleteBatch(batch.id);
      toast.success("Paket lelang berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["bmn-auction-batches"] });
      router.push("/bmn/auction-batches");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menghapus paket lelang.");
      setIsDeleting(false);
    }
  };

  return (
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter flex flex-col h-full min-h-screen bg-[var(--ds-surface-muted)]">
      {/* Sticky Header Panel */}
      <div className="sticky top-0 z-30 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-4 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild aria-label="Kembali ke daftar paket lelang" variant="ghost" size="icon-sm" className="rounded-xl"><Link href="/bmn/auction-batches">
                <ArrowLeft className="h-4 w-4" />
              </Link></Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--ds-fg-muted)]">
                  {batch.batch_number}
                </span>
                <Badge
                  variant="outline"
                  className={`${getStatusColorClass(
                    batch.status
                  )} text-xs font-bold px-2 py-0.5 rounded-md`}
                >
                  {getStatusLabel(batch.status)}
                </Badge>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--ds-fg)] mt-0.5">
                {batch.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-[var(--ds-fg-muted)]">
            <div className="flex items-center gap-1.5 bg-[var(--ds-surface-muted)] px-3 py-1.5 rounded-xl border border-[var(--ds-border-subtle)]">
              <Layers className="h-4 w-4 text-[var(--ds-fg-muted)]" />
              <span>
                Jumlah Aset: <strong className="text-[var(--ds-fg)]">{batch.assets_count}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[var(--ds-surface-muted)] px-3 py-1.5 rounded-xl border border-[var(--ds-border-subtle)]">
              <DollarSign className="h-4 w-4 text-[var(--ds-fg-muted)]" />
              <span>
                Total Taksiran: <strong className="text-[var(--ds-fg)]">{formatRupiah(batch.nilai_taksiran_total)}</strong>
              </span>
            </div>
            {canDelete && (batch.status === "DRAFT" || batch.status === "BATAL") && (
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteBatch}
                className="bmn-icon-danger border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] hover:text-[var(--ds-status-danger-fg)] hover:border-[var(--ds-status-danger-border)] rounded-xl text-xs font-semibold flex items-center gap-1.5"
                title="Hapus paket lelang ini"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ds-status-danger-fg)]" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Hapus Paket
              </Button>
            )}
          </div>
        </div>

        {/* Horizontal Status Timeline */}
        <div className="mt-6 border-t border-[var(--ds-border-subtle)] pt-5 overflow-x-auto">
          <div className="flex items-center min-w-175 justify-between px-2">
            {isCancelled ? (
              <div className="flex items-center w-full justify-center gap-2 text-[var(--ds-status-danger-fg)] font-bold text-sm bg-[var(--ds-status-danger-bg)] border border-[var(--ds-status-danger-border)] p-3 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <span>Paket ini telah dibatalkan (BATAL) dan berstatus read-only.</span>
              </div>
            ) : (
              statusesOrder.map((statusKey, index) => {
                const stepState = getStatusStepState(statusKey);
                const isCompleted = stepState === "completed";
                const isActive = stepState === "active";
                const isLast = index === statusesOrder.length - 1;
                return (
                  <React.Fragment key={statusKey}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-150 ease-out",
                          isActive && "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] ring-4 ring-[var(--ds-accent-soft-border)]  shadow-xs",
                          isCompleted && "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]",
                          !isActive && !isCompleted && "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]  "
                        )}
                      >
                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-xs font-bold leading-tight",
                            isActive && "text-[var(--ds-accent-fg)] ",
                            isCompleted && "text-[var(--ds-fg)] ",
                            !isActive && !isCompleted && "text-[var(--ds-fg-muted)] "
                          )}
                        >
                          {getStatusLabel(statusKey as AuctionBatchStatus)}
                        </p>
                      </div>
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 mx-3 rounded-full transition-colors duration-150 ease-out",
                          isCompleted ? "bg-[var(--ds-accent-solid)]" : "bg-[var(--ds-border-subtle)] "
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Main Workspace Body with Tabs */}
      <div className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile Tab Select Dropdown (< md) */}
          <div className="md:hidden">
            <label htmlFor="auction-workflow-tab" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] mb-1.5 block">
              Pilih Tahapan Alur Lelang:
            </label>
            <select aria-label="Pilih Tahapan Alur Lelang:"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-sm font-semibold text-[var(--ds-fg)] shadow-xs focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] focus:outline-none"
            >
              {workflowTabs.map((tab) => (
                <option key={tab.value} value={tab.value}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Tab Pills (>= md) */}
          <TabsList className="bmn-workflow-tabs hidden md:flex flex-wrap h-auto bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] rounded-xl p-1.5 gap-1 w-full justify-start overflow-x-auto">
            {workflowTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                title={getBlockedReason(tab.value, checklist) || undefined}
                className="relative rounded-lg text-xs py-2 px-3 font-semibold"
              >
                {tab.label}
                {activeTab === tab.value && <motion.span aria-hidden="true" layoutId={`${highlightId}-workflow`} className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--ds-accent-fg)]" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }} />}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-fg-muted)]">
                Langkah {activeTabIndex + 1} dari {workflowTabs.length}
              </p>
              <p className="mt-0.5 text-sm font-bold text-[var(--ds-fg)]">
                {workflowTabs[activeTabIndex]?.label}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                disabled={!previousTab}
                onClick={() => previousTab && setActiveTab(previousTab.value)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Sebelumnya
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-[var(--ds-accent-solid)] text-xs font-semibold text-white hover:bg-[var(--ds-accent-hover)]"
                disabled={!nextTab || Boolean(nextBlockedReason)}
                title={nextBlockedReason || undefined}
                onClick={() => nextTab && setActiveTab(nextTab.value)}
              >
                {nextTab ? `Lanjut ke ${nextTab.label}` : "Selesai"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Animated content; draft hooks remain mounted in this page. */}
          <BmnTabContent value={activeTab}>
            <TabsContent forceMount value={activeTab} className="mt-0 space-y-8">
              {activeTab === "assets" && <>

            <AssetsLotTab formState={assetsForm} batch={batch} readOnly={readOnly} onRefetch={refetchAll} />
            <div className="pt-4 border-t border-[var(--ds-border-subtle)]">
              <ValuationTab
                formState={valuationForm}
                batch={batch}
                readOnly={readOnly}
                onRefetch={refetchAll}
                checklist={checklist}
                onGoToPreDocs={() => setActiveTab("documents")}
              />
            </div>

              </>}
              {activeTab === "documents" && <>

            <DocumentsCenterTab
              formState={documentsForm}
              readOnly={readOnly}
              batch={batch}
              checklist={checklist}
              onRefetch={refetchAll}
            />

              </>}
              {activeTab === "realization" && <>

            <RealizationTab formState={realizationForm} batch={batch} readOnly={readOnly} onRefetch={refetchAll} />

              </>}
              {activeTab === "audit" && <>

            <AuditTrailTab batchId={batch.id} />

              </>}
            </TabsContent>
          </BmnTabContent>
        </Tabs>
      </div>
    </div>
  );
}
