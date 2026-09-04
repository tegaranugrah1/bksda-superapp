"use client";

import React from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentTemplates } from "@/app/keuangan/_components/DocumentTemplates";
import {
  DipaConfig,
  KwitansiConfig,
  Official,
  Recipient,
  SpbConfig,
  SpdConfig,
} from "@/app/keuangan/_components/templates/shared";

export interface Step2PreviewSpjProps {
  documentCounts: Array<{ key: string; label: string; count: number; description: string }>;
  selectedDocument: string;
  setSelectedDocument: (k: string) => void;
  selectedDocumentLabel: string;
  previewRecipients: Recipient[];
  activity: { awpCode: string; name: string };
  spjName: string;
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  sptNumber: string;
  ppk: Official;
  pdo: Official;
  verifikator: Official;
  total: number;
  spbNumber: { no: string; suffix: string };
  spdNumber: { no: string; suffix: string };
  spbConfig: SpbConfig;
  spdConfig: SpdConfig;
  kwitansiConfig: KwitansiConfig;
  tipeAnggaran: "FOLU" | "DIPA";
  dipaConfig: DipaConfig;
  handleSaveSpj: (status: "Draft" | "Diajukan") => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  printDocument: () => void;
}

export function Step2PreviewSpj({
  documentCounts,
  selectedDocument,
  setSelectedDocument,
  selectedDocumentLabel,
  previewRecipients,
  activity,
  spjName,
  travel,
  sptNumber,
  ppk,
  pdo,
  verifikator,
  total,
  spbNumber,
  spdNumber,
  spbConfig,
  spdConfig,
  kwitansiConfig,
  tipeAnggaran,
  dipaConfig,
  handleSaveSpj,
  isSubmitting,
  isEditMode,
  printDocument,
}: Step2PreviewSpjProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            <FileSpreadsheet className="h-4 w-4" /> TAHAP 3
          </div>
          <h2 className="text-2xl font-bold">Review &amp; Cetak Dokumen</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pilih dokumen untuk melihat preview di bawahnya, lalu cetak setelah layout sesuai.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documentCounts.map((document) => (
            <button
              key={document.key}
              onClick={() => setSelectedDocument(document.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedDocument === document.key
                  ? "border-amber-400 bg-amber-50 shadow-sm dark:border-amber-600 dark:bg-amber-500/10"
                  : "border-slate-200 bg-white hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <FileSpreadsheet
                  className={`h-5 w-5 ${selectedDocument === document.key ? "text-amber-600" : "text-slate-400"}`}
                />
                <Badge variant="outline">{document.count} output</Badge>
              </div>
              <p className="mt-4 text-sm font-bold">{document.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{document.description}</p>
            </button>
          ))}
        </div>
      </div>

      <DocumentTemplates
        selectedDocument={selectedDocument}
        recipients={previewRecipients}
        activity={{
          awpCode: activity.awpCode,
          name: activity.name.trim() || spjName.trim(),
        }}
        travel={travel}
        sptNumber={sptNumber}
        ppk={ppk}
        pdo={pdo}
        verifikator={verifikator}
        total={total}
        spbNumber={spbNumber}
        spdNumber={spdNumber}
        spbConfig={spbConfig}
        spdConfig={spdConfig}
        kwitansiConfig={kwitansiConfig}
        tipeAnggaran={tipeAnggaran}
        dipaConfig={dipaConfig}
      />

      <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
        <Button
          variant="outline"
          className="h-11 rounded-xl border-slate-300 hover:bg-slate-100 dark:border-slate-700"
          onClick={() => handleSaveSpj("Draft")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4 text-slate-500" />
          )}
          {isEditMode ? "Simpan Perubahan Draft" : "Simpan sebagai Draft"}
        </Button>
        <Button
          className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
          onClick={() => handleSaveSpj("Diajukan")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          {isEditMode ? "Simpan & Ajukan SPJ" : "Simpan & Ajukan SPJ"}
        </Button>
        <Button className="h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white" onClick={printDocument}>
          <Printer className="mr-2 h-4 w-4" /> Print {selectedDocumentLabel}
        </Button>
      </div>
    </section>
  );
}
