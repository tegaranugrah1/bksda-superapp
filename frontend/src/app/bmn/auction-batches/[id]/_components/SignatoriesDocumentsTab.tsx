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
      ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] ring-[var(--ds-status-warning-border)]"
      : status === "saved"
      ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] ring-[var(--ds-accent-soft-border)]"
      : status === "error"
      ? "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] ring-[var(--ds-status-danger-border)]"
      : "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] ring-slate-200/80 dark:ring-zinc-800";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${className}`}>
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
        <div className="flex items-center gap-3 rounded-3xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] p-4 text-[var(--ds-accent-fg)] shadow-xs">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--ds-accent-fg)]" />
          <div>
            <h3 className="text-sm font-bold">Dokumen & Tanda Tangan Terkunci</h3>
            <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
              Paket ini telah diajukan. Informasi penandatangan dan nomor dokumen dibekukan dari arsip saat penguncian.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
            <h3 className="flex items-center gap-2 border-b border-slate-200/70 dark:border-zinc-800 pb-2 text-sm font-bold text-[var(--ds-fg)]">
              <Users className="h-4 w-4 text-[var(--ds-fg-muted)]" />
              Daftar Penandatangan
            </h3>

            <div>
              <p className="text-xs font-semibold uppercase text-[var(--ds-fg-muted)]">Kepala Balai</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ds-fg)]">{frozenKepalaBalai}</p>
              {frozenKepalaBalaiNip && <p className="mt-1 text-xs text-[var(--ds-fg-muted)] tabular-nums">NIP. {frozenKepalaBalaiNip}</p>}
            </div>

            {[
              ["Panitia Penghapusan", frozenPanitia],
              ["Tim Penilai / Penaksir", frozenTimPenilai],
              ["Tim Pemeriksa", frozenPemeriksa],
            ].map(([label, people]) => (
              <div key={label as string}>
                <p className="text-xs font-semibold uppercase text-[var(--ds-fg-muted)]">{label as string}</p>
                <ul className="mt-1 space-y-1 text-xs text-[var(--ds-fg-secondary)]">
                  {(people as any[]).map((person: any, index: number) => (
                    <li key={`${person.id || person.nip || index}`} className="list-inside list-disc">
                      {person.nama} {person.nip && <span className="font-mono text-[var(--ds-fg-muted)] tabular-nums">(NIP. {person.nip})</span>}
                    </li>
                  ))}
                  {(people as any[]).length === 0 && <li className="italic text-[var(--ds-fg-muted)]">Tidak ada</li>}
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
            <h3 className="flex items-center gap-2 border-b border-slate-200/70 dark:border-zinc-800 pb-2 text-sm font-bold text-[var(--ds-fg)]">
              <FileText className="h-4 w-4 text-[var(--ds-fg-muted)]" />
              Nomor & Tanggal Dokumen
            </h3>
            <div className="grid gap-2">
              {Object.entries(frozenDocNos).map(([key, number]) => (
                <div key={key} className="rounded-lg bg-[var(--ds-surface-muted)] p-3 text-xs tabular-nums">
                  <p className="font-mono text-xs text-[var(--ds-fg-muted)]">{key}</p>
                  <p className="mt-1 font-semibold text-[var(--ds-fg)]">Nomor: {String(number || "-")}</p>
                  <p className="mt-1 text-[var(--ds-fg-muted)]">Tanggal: {String(frozenDocDates[key] || "-")}</p>
                </div>
              ))}
              {Object.keys(frozenDocNos).length === 0 && <p className="text-xs italic text-[var(--ds-fg-muted)]">Tidak ada nomor dokumen.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-4 py-3 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-[var(--ds-fg)]">Kunci & Ajukan</h2>
            <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">Isi penandatangan, nomor dokumen, dan status workflow sebelum paket dikunci.</p>
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
        <DialogContent data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover rounded-3xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-[var(--ds-fg)]">
              <Lock className="h-5 w-5 text-[var(--ds-status-danger-fg)]" />
              Kunci & Ajukan Paket Lelang?
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--ds-fg-muted)]">
              Setelah dikunci, aset dan dokumen di dalam paket ini tidak dapat diedit kembali. Aset terpilih akan dibekukan dari status operasional dinas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLockConfirmOpen(false)} className="rounded-lg text-xs">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleLockSubmit}
              className="rounded-lg text-xs font-semibold"
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
