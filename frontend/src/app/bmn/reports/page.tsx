"use client";

import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { Archive, Download, FileClock, FileText, Handshake } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { BmnTabContent } from "@/app/bmn/_components/BmnTabContent";

import { ExportReportsTab } from "./_tabs/ExportReportsTab";
import { UsageAgreementTab, useUsageAgreementFormState } from "./_tabs/UsageAgreementTab";
import { HandoverAgreementTab, useHandoverAgreementFormState } from "./_tabs/HandoverAgreementTab";
import { PowerOfAttorneyTab, usePowerOfAttorneyFormState } from "./_tabs/PowerOfAttorneyTab";
import { CoveringLetterTab, useCoveringLetterFormState } from "./_tabs/CoveringLetterTab";
import { DocumentHistoryTab } from "./_tabs/DocumentHistoryTab";

import { isDraftNumber, type EmployeeOption } from "./_lib/report-utils";
import {
  type DocumentHistoryItem,
  type EditingDocumentState,
  type BmnAssetOption,
} from "./_lib/types";

export default function BmnReportsPage() {
  const tabsId = useId();
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { hasPermission } = useRole();
  const canDelete = hasPermission("bmn.document.delete");
  const canGenerate = hasPermission("bmn.document.generate");
  const canWrite = canGenerate;

  const [activeTab, setActiveTab] = useState<"exports" | "documents" | "history">("exports");
  const [activeDocumentType, setActiveDocumentType] = useState<
    "usage" | "handover" | "power_of_attorney" | "covering_letter"
  >("usage");
  const [editingDocument, setEditingDocument] = useState<EditingDocumentState | null>(null);

  const usageAgreementFormState = useUsageAgreementFormState(editingDocument);
  const powerOfAttorneyFormState = usePowerOfAttorneyFormState(editingDocument);
  const handoverAgreementFormState = useHandoverAgreementFormState(editingDocument);
  const coveringLetterFormState = useCoveringLetterFormState(editingDocument);

  const { data: employees = [], isLoading: loadingEmployees, isError: employeesError, refetch: refetchEmployees } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-select-report"],
    queryFn: async () => {
      const response = await api.get("/kepegawaian/employees/select");
      const raw = response.data?.data ?? response.data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  const { data: vehicleAssetOptions = [], isLoading: loadingVehicleAssets, isError: vehicleOptionsError, refetch: refetchVehicleOptions } = useQuery<BmnAssetOption[]>({
    queryKey: ["bmn-report-vehicle-assets"],
    queryFn: async () => {
      const response = await api.get("/bmn/assets", {
        params: { jenis_bmn: "ALAT ANGKUTAN BERMOTOR", per_page: 500 },
      });
      return response.data.data || [];
    },
  });

  const handleRefetchHistory = async () => {
    await queryClient.invalidateQueries({ queryKey: ["bmn-document-histories"] });
  };

  const handleEditFromHistory = (item: DocumentHistoryItem) => {
    setActiveTab("documents");
    let docType: "usage" | "handover" | "power_of_attorney" | "covering_letter" = "usage";
    if (item.document_type === "usage_agreement") {
      docType = "usage";
    } else if (item.document_type === "power_of_attorney") {
      docType = "power_of_attorney";
    } else if (item.document_type === "covering_letter") {
      docType = "covering_letter";
    } else {
      docType = "handover";
    }
    setActiveDocumentType(docType);
    setEditingDocument({
      id: item.id,
      type: docType,
      titleOrNumber: isDraftNumber(item.number) ? "Dokumen (Draf)" : item.number,
      status: item.status || (isDraftNumber(item.number) ? "draft" : "published"),
      item,
      isDuplicate: false,
    });
  };

  const handleDuplicateFromHistory = (item: DocumentHistoryItem) => {
    setActiveTab("documents");
    let docType: "usage" | "handover" | "power_of_attorney" | "covering_letter" = "usage";
    if (item.document_type === "usage_agreement") {
      docType = "usage";
    } else if (item.document_type === "power_of_attorney") {
      docType = "power_of_attorney";
    } else if (item.document_type === "covering_letter") {
      docType = "covering_letter";
    } else {
      docType = "handover";
    }
    setActiveDocumentType(docType);
    setEditingDocument({
      type: docType,
      titleOrNumber: isDraftNumber(item.number) ? "Dokumen (Draf)" : item.number,
      status: "draft",
      item,
      isDuplicate: true,
    });
  };

  const cancelEditMode = () => {
    setEditingDocument(null);
    toast.info("Mode edit dibatalkan.");
  };

  const tabs = [
    { id: "exports", label: "Export Laporan", icon: Download },
    { id: "documents", label: "Generate Dokumen", icon: Archive },
    { id: "history", label: "Riwayat Dokumen", icon: FileClock },
  ] as const;

  const documentTypes = [
    {
      id: "usage",
      title: "BA Pemakaian BMN",
      desc: "Format resmi pemakaian BMN antar pihak pertama dan pegawai.",
      icon: Archive,
    },
    {
      id: "handover",
      title: "BA Serah Terima",
      desc: "Dua versi: barang umum manual atau kendaraan BMN.",
      icon: Handshake,
    },
    {
      id: "power_of_attorney",
      title: "Surat Kuasa Kendaraan",
      desc: "Generate surat kuasa pengecekan fisik kendaraan.",
      icon: FileText,
    },
    {
      id: "covering_letter",
      title: "Surat Pengantar",
      desc: "Format resmi pengantar berkas permohonan lelang KPKNL.",
      icon: FileText,
    },
  ] as const;

  return (
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ds-fg)]  flex items-center gap-2">
            <FileText className="w-6 h-6 text-[var(--ds-accent-fg)]" /> Laporan
          </h1>
          <p className="text-sm text-[var(--ds-fg-muted)]  mt-0.5">
            Export laporan dan generate dokumen BMN dari satu workspace.
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Dokumen dan laporan BMN" className="flex max-w-full overflow-x-auto gap-2 border-b border-[var(--ds-border-subtle)]">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab" id={`${tabsId}-${tab.id}`} aria-controls={`${tabsId}-panel`}
              aria-selected={active} tabIndex={active ? 0 : -1}
              onKeyDown={(event) => {
                const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                if (!offset && event.key !== "Home" && event.key !== "End") return;
                event.preventDefault();
                const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (tabs.findIndex(item => item.id === tab.id) + offset + tabs.length) % tabs.length;
                setActiveTab(tabs[index].id);
                const target = document.getElementById(`${tabsId}-${tabs[index].id}`);
              target?.focus();
              target?.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex h-11 shrink-0 items-center gap-2 rounded-t-lg px-4 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                active
                  ? "text-[var(--ds-accent-fg)] font-bold"
                  : "text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-fg)]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`${tabsId}-tab-indicator`}
                  initial={false}
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ds-accent-fg)]"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <TabIcon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab !== "exports" && employeesError && <div role="alert" className="text-sm text-[var(--ds-status-danger-fg)]">Daftar pegawai gagal dimuat. <Button variant="outline" onClick={() => refetchEmployees()}>Muat ulang pegawai</Button></div>}
      {activeTab === "documents" && activeDocumentType === "power_of_attorney" && vehicleOptionsError && <div role="alert" className="text-sm text-[var(--ds-status-danger-fg)]">Daftar kendaraan gagal dimuat. <Button variant="outline" onClick={() => refetchVehicleOptions()}>Muat ulang kendaraan</Button></div>}

      <BmnTabContent value={activeTab}>
        <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${activeTab}`} tabIndex={0}>
          {activeTab === "exports" && <ExportReportsTab />}

          {activeTab === "documents" && (
            <section className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-5">
              <aside className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3  ">
                <div className="px-2 pb-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">Jenis Dokumen</p>
                </div>
                {documentTypes.map((doc) => {
                  const Icon = doc.icon;
                  const active = activeDocumentType === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      aria-pressed={active}
                      aria-controls={`${tabsId}-document-form`}
                      onClick={() => setActiveDocumentType(doc.id)}
                      className={`relative mt-2 first:mt-0 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-150 cursor-pointer ${
                        active
                          ? "border-[var(--ds-accent-soft-border)] "
                          : "border-transparent hover:bg-[var(--ds-surface-muted)] "
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId={`${tabsId}-document-type-indicator`}
                          initial={false}
                          className="absolute inset-0 bg-[var(--ds-accent-soft)]  rounded-xl"
                          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-sm  relative z-10">
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="relative z-10">
                        <span className="block text-sm font-bold text-[var(--ds-fg)] ">{doc.title}</span>
                        <span className="mt-0.5 block text-xs text-[var(--ds-fg-muted)] ">{doc.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </aside>

              <div className="space-y-5">
                {editingDocument && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] p-4  ">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]  ">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-[var(--ds-status-warning-fg)] ">
                            {editingDocument.isDuplicate
                              ? `Duplikasi dari: ${editingDocument.titleOrNumber}`
                              : `Mode Edit Aktif: ${editingDocument.titleOrNumber}`}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                              editingDocument.status === "draft"
                                ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]  "
                                : "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]  "
                            }`}
                          >
                            {editingDocument.isDuplicate
                              ? "Dokumen Baru"
                              : `Status: ${editingDocument.status === "draft" ? "Draf" : "Terbit"}`}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--ds-status-warning-fg)]  mt-0.5">
                          {editingDocument.isDuplicate
                            ? "Data telah disalin ke formulir. Silakan sesuaikan dan simpan sebagai dokumen baru."
                            : "Anda sedang menyunting dokumen yang tersimpan di riwayat. Kosongkan nomor urut jika ingin menyimpan sebagai Draf."}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-[var(--ds-status-warning-border)] bg-[var(--ds-surface)] text-xs font-medium text-[var(--ds-status-warning-fg)] hover:bg-[var(--ds-status-warning-bg)]   "
                      onClick={cancelEditMode}
                    >
                      {editingDocument.isDuplicate ? "Batal Duplikasi" : "Batal Edit"}
                    </Button>
                  </div>
                )}

                <BmnTabContent value={activeDocumentType}>
                  <div id={`${tabsId}-document-form`}>
                    {activeDocumentType === "usage" && (
                      <UsageAgreementTab
                        formState={usageAgreementFormState}
                        key={`${editingDocument?.isDuplicate ? "dup" : "edit"}_${editingDocument?.id || "new"}`}
                        employees={employees}
                        loadingEmployees={loadingEmployees}
                        canGenerate={canGenerate}
                        canWrite={canWrite}
                        canDelete={canDelete}
                        editingDocument={editingDocument}
                        onSetEditingDocument={setEditingDocument}
                        onClearEditing={() => setEditingDocument(null)}
                        onViewHistory={() => setActiveTab("history")}
                        onRefetchHistory={handleRefetchHistory}
                      />
                    )}

                    {activeDocumentType === "handover" && (
                      <HandoverAgreementTab
                        formState={handoverAgreementFormState}
                        key={`${editingDocument?.isDuplicate ? "dup" : "edit"}_${editingDocument?.id || "new"}`}
                        employees={employees}
                        loadingEmployees={loadingEmployees}
                        canGenerate={canGenerate}
                        editingDocument={editingDocument}
                        onClearEditing={() => setEditingDocument(null)}
                        onRefetchHistory={handleRefetchHistory}
                      />
                    )}

                    {activeDocumentType === "power_of_attorney" && (
                      <PowerOfAttorneyTab
                        formState={powerOfAttorneyFormState}
                        key={`${editingDocument?.isDuplicate ? "dup" : "edit"}_${editingDocument?.id || "new"}`}
                        employees={employees}
                        vehicleAssetOptions={vehicleAssetOptions}
                        loadingEmployees={loadingEmployees}
                        canGenerate={canGenerate}
                        canWrite={canWrite}
                        canDelete={canDelete}
                        editingDocument={editingDocument}
                        onSetEditingDocument={setEditingDocument}
                        onClearEditing={() => setEditingDocument(null)}
                        onViewHistory={() => setActiveTab("history")}
                        onRefetchHistory={handleRefetchHistory}
                      />
                    )}

                    {activeDocumentType === "covering_letter" && (
                      <CoveringLetterTab
                        formState={coveringLetterFormState}
                        key={`${editingDocument?.isDuplicate ? "dup" : "edit"}_${editingDocument?.id || "new"}`}
                        employees={employees}
                        loadingEmployees={loadingEmployees}
                        canGenerate={canGenerate}
                        editingDocument={editingDocument}
                        onClearEditing={() => setEditingDocument(null)}
                        onRefetchHistory={handleRefetchHistory}
                      />
                    )}
                  </div>
                </BmnTabContent>
              </div>
            </section>
          )}

          {activeTab === "history" && (
            <DocumentHistoryTab
              canWrite={canWrite}
              canDelete={canDelete}
              employees={employees}
              vehicleAssetOptions={vehicleAssetOptions}
              onEdit={handleEditFromHistory}
              onDuplicate={handleDuplicateFromHistory}
            />
          )}
        </div>
      </BmnTabContent>
    </div>
  );
}
