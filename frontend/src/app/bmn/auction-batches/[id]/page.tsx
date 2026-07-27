"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBatch, getChecklist, AuctionBatch } from "../_lib/api";
import { getStatusLabel, getStatusColorClass, isReadOnly } from "../_lib/status";
import { formatRupiah } from "../../auction-candidates/_lib/auction-helpers";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Layers,
  CheckCircle2,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBlockedReason, getWorkflowTabs } from "./_lib/workflow-tabs";

// Lazy-loaded or imported tab components (stubbed for compile stability)
import { AssetsLotTab } from "./_components/AssetsLotTab";
import { ValuationTab } from "./_components/ValuationTab";
import { SignatoriesDocumentsTab } from "./_components/SignatoriesDocumentsTab";
import { DocumentsCenterTab } from "./_components/DocumentsCenterTab";
import { ScheduleTab } from "./_components/ScheduleTab";
import { RealizationTab } from "./_components/RealizationTab";
import { AuditTrailTab } from "./_components/AuditTrailTab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BmnAuctionBatchDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const batchId = resolvedParams.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("assets");

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

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-zinc-500">Memuat detail paket lelang...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 text-center p-6">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Gagal Memuat Paket</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
          Paket lelang tidak ditemukan atau Anda tidak memiliki akses untuk melihat paket ini.
        </p>
        <Link href="/bmn/auction-batches">
          <Button variant="outline" className="rounded-xl">
            Kembali ke Daftar Paket
          </Button>
        </Link>
      </div>
    );
  }

  const readOnly = isReadOnly(batch.status);
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

  return (
    <div className="flex flex-col h-full min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sticky Header Panel */}
      <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-md px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/95 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/bmn/auction-batches">
              <Button variant="ghost" size="icon-sm" className="rounded-xl">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-zinc-500">
                  {batch.batch_number}
                </span>
                <Badge
                  variant="outline"
                  className={`${getStatusColorClass(
                    batch.status
                  )} text-[10px] font-bold px-2 py-0.5 rounded-md`}
                >
                  {getStatusLabel(batch.status)}
                </Badge>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
                {batch.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <Layers className="h-4 w-4 text-zinc-450" />
              <span>
                Jumlah Aset: <strong className="text-zinc-900 dark:text-zinc-100">{batch.assets_count}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <DollarSign className="h-4 w-4 text-zinc-450" />
              <span>
                Total Taksiran: <strong className="text-zinc-900 dark:text-zinc-100">{formatRupiah(batch.nilai_taksiran_total)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Status Timeline */}
        <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800/60 pt-5 overflow-x-auto">
          <div className="flex items-center min-w-175 justify-between px-2">
            {isCancelled ? (
              <div className="flex items-center w-full justify-center gap-2 text-red-650 font-bold text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <span>Paket ini telah dibatalkan (BATAL) dan berstatus read-only.</span>
              </div>
            ) : (
              statusesOrder.map((statusKey, index) => {
                const stepState = getStatusStepState(statusKey);
                const isLast = index === statusesOrder.length - 1;
                return (
                  <React.Fragment key={statusKey}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                          stepState.isCurrent && "bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/50 shadow-xs",
                          stepState.isPassed && "bg-emerald-500 text-white",
                          !stepState.isCurrent && !stepState.isPassed && "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                        )}
                      >
                        {stepState.isPassed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-xs font-bold leading-tight",
                            stepState.isCurrent && "text-emerald-700 dark:text-emerald-400",
                            stepState.isPassed && "text-zinc-800 dark:text-zinc-200",
                            !stepState.isCurrent && !stepState.isPassed && "text-zinc-400 dark:text-zinc-500"
                          )}
                        >
                          {STATUS_LABELS[statusKey as keyof typeof STATUS_LABELS] || statusKey}
                        </p>
                      </div>
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 mx-3 rounded-full transition-all",
                          stepState.isPassed ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
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
          <TabsList className="flex flex-wrap h-auto bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 gap-1 w-full justify-start overflow-x-auto">
            {workflowTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                title={getBlockedReason(tab.value, checklist) || undefined}
                className="rounded-lg text-xs py-2 px-3 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Langkah {activeTabIndex + 1} dari {workflowTabs.length}
              </p>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-50">
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
                className="rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                disabled={!nextTab || Boolean(nextBlockedReason)}
                title={nextBlockedReason || undefined}
                onClick={() => nextTab && setActiveTab(nextTab.value)}
              >
                {nextTab ? `Lanjut ke ${nextTab.label}` : "Selesai"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Tab Contents */}
          <TabsContent value="assets" className="mt-0 space-y-8 focus-visible:outline-none">
            <AssetsLotTab batch={batch} readOnly={readOnly} onRefetch={refetchAll} />
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <ValuationTab
                batch={batch}
                readOnly={readOnly}
                onRefetch={refetchAll}
                checklist={checklist}
                onGoToPreDocs={() => setActiveTab("documents")}
              />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
            <DocumentsCenterTab
              batch={batch}
              checklist={checklist}
              onRefetch={refetchAll}
            />
          </TabsContent>

          <TabsContent value="realization" className="mt-0 focus-visible:outline-none">
            <RealizationTab batch={batch} readOnly={readOnly} onRefetch={refetchAll} />
          </TabsContent>

          <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
            <AuditTrailTab batchId={batch.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
