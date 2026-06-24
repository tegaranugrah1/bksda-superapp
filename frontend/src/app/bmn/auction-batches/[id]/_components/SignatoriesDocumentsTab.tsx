"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getChecklist, transition, updateDraftMetadata, AuctionBatch } from "../../_lib/api";
import { toast } from "sonner";
import { FileText, Loader2, Lock, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignatoryPickerSection } from "./workflow/SignatoryPickerSection";
import { DocumentNumberDateSection } from "./workflow/DocumentNumberDateSection";
import { DocumentWorkflowSection } from "./workflow/DocumentWorkflowSection";
import { FinalSubmitPanel } from "./workflow/FinalSubmitPanel";
import type { Employee, SaveStatus, WorkflowDocuments } from "./workflow/types";

interface SignatoriesDocumentsTabProps {
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
}

function SaveStatusPill({ status }: { status: SaveStatus }) {
  const label =
    status === "saving" ? "Menyimpan..." : status === "saved" ? "Tersimpan" : status === "error" ? "Gagal simpan" : "Draft";
  const className =
    status === "saving"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : status === "saved"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "error"
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-zinc-50 text-zinc-500 ring-zinc-200";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ring-1 ${className}`}>
      {status === "saving" && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
      {label}
    </span>
  );
}

export function SignatoriesDocumentsTab({ batch, readOnly, onRefetch }: SignatoriesDocumentsTabProps) {
  const [kepalaBalaiId, setKepalaBalaiId] = useState("");
  const [panitiaIds, setPanitiaIds] = useState<string[]>([]);
  const [timPenilaiIds, setTimPenilaiIds] = useState<string[]>([]);
  const [pemeriksaIds, setPemeriksaIds] = useState<string[]>([]);
  const [documentNumbers, setDocumentNumbers] = useState<Record<string, string | null>>({});
  const [documentDates, setDocumentDates] = useState<Record<string, string | null>>({});
  const [workflowDocuments, setWorkflowDocuments] = useState<WorkflowDocuments>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveVersion, setSaveVersion] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["employees-select-auction"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data?.data || res.data || [];
    },
  });

  const {
    data: checklist,
    refetch: refetchChecklist,
    isLoading: isLoadingChecklist,
  } = useQuery({
    queryKey: ["bmn-auction-batch-checklist", batch.id],
    queryFn: () => getChecklist(batch.id),
  });

  useEffect(() => {
    const metadata = batch.metadata || {};
    const signatories = metadata.signatories_raw || {};

    setIsHydrated(false);
    setKepalaBalaiId(batch.kepala_balai_id || "");
    setPanitiaIds(signatories.panitia || []);
    setTimPenilaiIds(signatories.tim_penilai || []);
    setPemeriksaIds(signatories.pemeriksa || []);
    setDocumentNumbers(metadata.document_numbers || {});
    setDocumentDates(metadata.document_dates || {});
    setWorkflowDocuments(metadata.workflow?.documents || {});
    setSaveStatus("idle");
    setSaveVersion(0);
    setIsHydrated(true);
  }, [batch.id, batch.kepala_balai_id, batch.metadata]);

  const markDirty = () => setSaveVersion((version) => version + 1);

  useEffect(() => {
    if (readOnly || !isHydrated || saveVersion === 0) {
      return;
    }

    const handle = window.setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await updateDraftMetadata(batch.id, {
          kepala_balai_id: kepalaBalaiId || null,
          signatories: {
            panitia: panitiaIds,
            tim_penilai: timPenilaiIds,
            pemeriksa: pemeriksaIds,
          },
          document_numbers: documentNumbers,
          document_dates: documentDates,
          workflow: {
            documents: workflowDocuments,
          },
        });
        setSaveStatus("saved");
        refetchChecklist();
      } catch {
        setSaveStatus("error");
      }
    }, 600);

    return () => window.clearTimeout(handle);
  }, [
    batch.id,
    documentDates,
    documentNumbers,
    isHydrated,
    kepalaBalaiId,
    panitiaIds,
    pemeriksaIds,
    readOnly,
    refetchChecklist,
    saveVersion,
    timPenilaiIds,
    workflowDocuments,
  ]);

  const lockMutation = useMutation({
    mutationFn: (payload: any) => transition(batch.id, payload),
    onSuccess: () => {
      toast.success("Paket lelang berhasil dikunci dan diajukan.");
      setIsLockConfirmOpen(false);
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal mengunci paket lelang.");
    },
  });

  const handleLockSubmit = () => {
    lockMutation.mutate({
      status: "DIAJUKAN",
      kepala_balai_id: kepalaBalaiId || null,
      signatories: {
        panitia: panitiaIds,
        tim_penilai: timPenilaiIds,
        pemeriksa: pemeriksaIds,
      },
      document_numbers: documentNumbers,
      document_dates: documentDates,
      workflow: {
        documents: workflowDocuments,
      },
    });
  };
  const canCompletePostValuationDocuments = checklist?.can_complete_post_valuation_documents ?? false;

  if (readOnly) {
    const metadata = batch.metadata || {};
    const frozenKepalaBalai = metadata.signatories?.kepala_balai?.nama || "-";
    const frozenKepalaBalaiNip = metadata.signatories?.kepala_balai?.nip || "";
    const frozenPanitia = metadata.committees?.panitia_penghapusan || [];
    const frozenTimPenilai = metadata.committees?.tim_penilai || [];
    const frozenPemeriksa = metadata.committees?.pemeriksa || [];
    const frozenDocNos = metadata.document_numbers || {};
    const frozenDocDates = metadata.document_dates || {};

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800 shadow-xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold">Dokumen & Tanda Tangan Terkunci</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Paket ini telah diajukan. Informasi penandatangan dan nomor dokumen dibekukan dari arsip saat penguncian.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="flex items-center gap-2 border-b pb-2 text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <Users className="h-4.5 w-4.5 text-zinc-400" />
              Daftar Penandatangan
            </h3>

            <div>
              <p className="text-[10px] font-semibold uppercase text-zinc-400">Kepala Balai</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{frozenKepalaBalai}</p>
              {frozenKepalaBalaiNip && <p className="mt-0.5 text-xs text-zinc-400">NIP. {frozenKepalaBalaiNip}</p>}
            </div>

            {[
              ["Panitia Penghapusan", frozenPanitia],
              ["Tim Penilai / Penaksir", frozenTimPenilai],
              ["Tim Pemeriksa", frozenPemeriksa],
            ].map(([label, people]) => (
              <div key={label as string}>
                <p className="text-[10px] font-semibold uppercase text-zinc-400">{label as string}</p>
                <ul className="mt-1 space-y-1 text-xs text-zinc-800 dark:text-zinc-200">
                  {(people as any[]).map((person: any, index: number) => (
                    <li key={`${person.id || person.nip || index}`} className="list-inside list-disc">
                      {person.nama} {person.nip && <span className="font-mono text-zinc-400">(NIP. {person.nip})</span>}
                    </li>
                  ))}
                  {(people as any[]).length === 0 && <li className="italic text-zinc-400">Tidak ada</li>}
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="flex items-center gap-2 border-b pb-2 text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <FileText className="h-4.5 w-4.5 text-zinc-400" />
              Nomor & Tanggal Dokumen
            </h3>
            <div className="grid gap-2">
              {Object.entries(frozenDocNos).map(([key, number]) => (
                <div key={key} className="rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-900/40">
                  <p className="font-mono text-[10px] text-zinc-400">{key}</p>
                  <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">Nomor: {String(number || "-")}</p>
                  <p className="mt-0.5 text-zinc-500">Tanggal: {String(frozenDocDates[key] || "-")}</p>
                </div>
              ))}
              {Object.keys(frozenDocNos).length === 0 && <p className="text-xs italic text-zinc-400">Tidak ada nomor dokumen.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Kunci & Ajukan</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Isi penandatangan, nomor dokumen, dan status workflow sebelum paket dikunci.</p>
          </div>
          <SaveStatusPill status={saveStatus} />
        </div>

        <SignatoryPickerSection
          employees={employees}
          isLoadingEmployees={isLoadingEmployees}
          kepalaBalaiId={kepalaBalaiId}
          panitiaIds={panitiaIds}
          timPenilaiIds={timPenilaiIds}
          pemeriksaIds={pemeriksaIds}
          onKepalaBalaiChange={(id) => {
            setKepalaBalaiId(id);
            markDirty();
          }}
          onPanitiaChange={(ids) => {
            setPanitiaIds(ids);
            markDirty();
          }}
          onTimPenilaiChange={(ids) => {
            setTimPenilaiIds(ids);
            markDirty();
          }}
          onPemeriksaChange={(ids) => {
            setPemeriksaIds(ids);
            markDirty();
          }}
        />

        <DocumentNumberDateSection
          documentNumbers={documentNumbers}
          documentDates={documentDates}
          canCompletePostValuationDocuments={canCompletePostValuationDocuments}
          onDocumentNumbersChange={(values) => {
            setDocumentNumbers(values);
            markDirty();
          }}
          onDocumentDatesChange={(values) => {
            setDocumentDates(values);
            markDirty();
          }}
        />

        <DocumentWorkflowSection
          documents={workflowDocuments}
          canCompletePostValuationDocuments={canCompletePostValuationDocuments}
          onChange={(documents) => {
            setWorkflowDocuments(documents);
            markDirty();
          }}
        />
      </div>

      <div className="space-y-6">
        <FinalSubmitPanel
          checklist={checklist}
          isLoading={isLoadingChecklist}
          isLocking={lockMutation.isPending}
          onLock={() => setIsLockConfirmOpen(true)}
        />
      </div>

      <Dialog open={isLockConfirmOpen} onOpenChange={setIsLockConfirmOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-base font-bold text-zinc-900 dark:text-zinc-50">
              <Lock className="h-5 w-5 text-red-500" />
              Kunci & Ajukan Paket Lelang?
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-555">
              Setelah dikunci, aset dan dokumen di dalam paket ini tidak dapat diedit kembali. Aset terpilih akan dibekukan dari status operasional dinas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLockConfirmOpen(false)} className="rounded-xl text-xs">
              Batal
            </Button>
            <Button
              onClick={handleLockSubmit}
              className="rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-750"
              disabled={lockMutation.isPending}
            >
              {lockMutation.isPending ? "Mengunci..." : "Ya, Kunci & Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
