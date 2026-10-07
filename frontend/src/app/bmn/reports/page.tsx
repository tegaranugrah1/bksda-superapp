"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { Archive, Download, FileClock, FileText, Handshake } from "lucide-react";

import { ExportReportsTab } from "./_tabs/ExportReportsTab";
import { UsageAgreementTab } from "./_tabs/UsageAgreementTab";
import { HandoverAgreementTab } from "./_tabs/HandoverAgreementTab";
import { PowerOfAttorneyTab } from "./_tabs/PowerOfAttorneyTab";
import { CoveringLetterTab } from "./_tabs/CoveringLetterTab";
import { DocumentHistoryTab } from "./_tabs/DocumentHistoryTab";

import { isDraftNumber, type EmployeeOption } from "./_lib/report-utils";
import {
  type DocumentHistoryItem,
  type EditingDocumentState,
  type BmnAssetOption,
} from "./_lib/types";

export default function BmnReportsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useRole();
  const canDelete = hasPermission("bmn.document.delete");
  const canGenerate = hasPermission("bmn.document.generate");
  const canWrite = canDelete;

  const [activeTab, setActiveTab] = useState<"exports" | "documents" | "history">("exports");
  const [activeDocumentType, setActiveDocumentType] = useState<
    "usage" | "handover" | "power_of_attorney" | "covering_letter"
  >("usage");
  const [editingDocument, setEditingDocument] = useState<EditingDocumentState | null>(null);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<EmployeeOption[]>({
    queryKey: ["bmn-report-employees"],
    queryFn: async () => {
      const response = await api.get("/employees", { params: { per_page: 500 } });
      return response.data.data || [];
    },
  });

  const { data: vehicleAssetOptions = [], isLoading: loadingVehicleAssets } = useQuery<BmnAssetOption[]>({
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
    setEditingDocument(null);
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
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-500" /> Laporan
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Export laporan dan generate dokumen BMN dari satu workspace.
          </p>
        </div>
      </div>

      <div className="inline-flex max-w-full overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "exports" && <ExportReportsTab />}

      {activeTab === "documents" && (
        <section className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-5">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-2 pb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Jenis Dokumen</p>
            </div>
            {documentTypes.map((doc) => {
              const Icon = doc.icon;
              const active = activeDocumentType === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveDocumentType(doc.id)}
                  className={`mt-2 first:mt-0 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                      : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm dark:bg-zinc-950">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-zinc-900 dark:text-white">{doc.title}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{doc.desc}</span>
                  </span>
                </button>
              );
            })}
          </aside>

          <div className="space-y-5">
            {editingDocument && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                        Mode Edit Aktif: {editingDocument.titleOrNumber}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          editingDocument.status === "draft"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        }`}
                      >
                        Status: {editingDocument.status === "draft" ? "Draf" : "Terbit"}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                      Anda sedang menyunting dokumen yang tersimpan di riwayat. Kosongkan nomor urut jika ingin menyimpan
                      sebagai Draf.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-amber-300 bg-white text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-zinc-800 dark:text-amber-200"
                  onClick={cancelEditMode}
                >
                  Batal Edit
                </Button>
              </div>
            )}

            {activeDocumentType === "usage" && (
              <UsageAgreementTab
                employees={employees}
                loadingEmployees={loadingEmployees}
                canGenerate={canGenerate}
                canWrite={canWrite}
                editingDocument={editingDocument}
                onClearEditing={() => setEditingDocument(null)}
                onViewHistory={() => setActiveTab("history")}
                onRefetchHistory={handleRefetchHistory}
              />
            )}

            {activeDocumentType === "handover" && (
              <HandoverAgreementTab
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
                employees={employees}
                vehicleAssetOptions={vehicleAssetOptions}
                loadingEmployees={loadingEmployees}
                canGenerate={canGenerate}
                canWrite={canWrite}
                editingDocument={editingDocument}
                onClearEditing={() => setEditingDocument(null)}
                onViewHistory={() => setActiveTab("history")}
                onRefetchHistory={handleRefetchHistory}
              />
            )}

            {activeDocumentType === "covering_letter" && (
              <CoveringLetterTab
                employees={employees}
                loadingEmployees={loadingEmployees}
                canGenerate={canGenerate}
                editingDocument={editingDocument}
                onClearEditing={() => setEditingDocument(null)}
                onRefetchHistory={handleRefetchHistory}
              />
            )}
          </div>
        </section>
      )}

      {activeTab === "history" && (
        <DocumentHistoryTab
          canWrite={canWrite}
          employees={employees}
          vehicleAssetOptions={vehicleAssetOptions}
          onEdit={handleEditFromHistory}
          onDuplicate={handleDuplicateFromHistory}
        />
      )}
    </div>
  );
}
