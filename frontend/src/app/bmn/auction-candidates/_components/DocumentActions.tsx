"use client";

import { FileCheck2, FileText, FolderKanban, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentActionsProps {
  orderedIdsLength: number;
  onProcess: () => void;
  onProcessSk: () => void;
  onProcessSkPanitia: () => void;
  onProcessSkTimPenilai: () => void;
  onProcessSptjLimit: () => void;
  onProcessSptjm: () => void;
  onProcessSpTugas: () => void;
  onProcessSkKebenaran: () => void;
  onProcessBaPemeriksaan: () => void;
  onProcessNotaDinas: () => void;
  onProcessPermohonanKpknl: () => void;
}

interface DocumentAction {
  label: string;
  description: string;
  onClick: () => void;
  needsSelection?: boolean;
}

interface DocumentGroup {
  title: string;
  description: string;
  Icon: typeof FileText;
  actions: DocumentAction[];
}

function ActionButton({ action, disabled }: { action: DocumentAction; disabled: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-auto min-h-12 justify-start rounded-lg border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-3 py-2 text-left hover:border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)]",
        disabled && "cursor-not-allowed opacity-55",
      )}
      onClick={action.onClick}
      disabled={disabled}
    >
      <FileText className="mr-2 h-4 w-4 shrink-0 text-[var(--ds-accent-fg)]" />
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-[var(--ds-fg)]">
          {action.label}
        </span>
        <span className="block truncate text-xs font-medium text-[var(--ds-fg-muted)]">
          {action.description}
        </span>
      </span>
    </Button>
  );
}

export function DocumentActions({
  orderedIdsLength,
  onProcess,
  onProcessSk,
  onProcessSkPanitia,
  onProcessSkTimPenilai,
  onProcessSptjLimit,
  onProcessSptjm,
  onProcessSpTugas,
  onProcessSkKebenaran,
  onProcessBaPemeriksaan,
  onProcessNotaDinas,
  onProcessPermohonanKpknl,
}: DocumentActionsProps) {
  const noSelection = orderedIdsLength === 0;
  const groups: DocumentGroup[] = [
    {
      title: "Berita acara",
      description: "Dokumen utama dengan lampiran aset terpilih.",
      Icon: FileCheck2,
      actions: [
        { label: "BA Koreksi", description: "Koreksi kondisi aset", onClick: onProcess, needsSelection: true },
        { label: "BA Pemeriksaan", description: "Pemeriksaan fisik aset", onClick: onProcessBaPemeriksaan, needsSelection: true },
      ],
    },
    {
      title: "Surat keputusan",
      description: "SK pendukung proses pemindahtanganan.",
      Icon: FolderKanban,
      actions: [
        { label: "SK Penghentian", description: "Penghentian penggunaan", onClick: onProcessSk, needsSelection: true },
        { label: "SK Panitia", description: "Pembentukan panitia", onClick: onProcessSkPanitia, needsSelection: true },
        { label: "SK Tim Penilai", description: "Pembentukan tim penilai", onClick: onProcessSkTimPenilai, needsSelection: true },
        { label: "SK Kebenaran", description: "Pernyataan kebenaran dokumen", onClick: onProcessSkKebenaran, needsSelection: true },
      ],
    },
    {
      title: "Surat pendukung",
      description: "Surat dan pengantar yang melengkapi berkas.",
      Icon: FileText,
      actions: [
        { label: "SPTJ Limit", description: "Tanggung jawab limit", onClick: onProcessSptjLimit },
        { label: "SPTJM", description: "Tanggung jawab mutlak", onClick: onProcessSptjm },
        { label: "SP Tugas", description: "Surat penugasan", onClick: onProcessSpTugas },
        { label: "Nota Dinas KSDAE", description: "Pengantar internal", onClick: onProcessNotaDinas, needsSelection: true },
        { label: "Permohonan KPKNL", description: "Permohonan ke KPKNL", onClick: onProcessPermohonanKpknl, needsSelection: true },
      ],
    },
  ];

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--ds-accent-fg)]" />
          <div>
            <h2 className="text-sm font-bold text-[var(--ds-fg)]">Generate Dokumen Lelang</h2>
            <p className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
              {orderedIdsLength > 0
                ? `${orderedIdsLength} aset siap dipakai sebagai lampiran.`
                : "Beberapa dokumen membutuhkan aset terpilih."}
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full bg-[var(--ds-surface-muted)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
          Langkah 3
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {groups.map(({ title, description, Icon, actions }) => (
          <section
            key={title}
            className="rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-3"
          >
            <div className="mb-3 flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] text-[var(--ds-accent-fg)]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--ds-fg)]">{title}</p>
                <p className="text-xs leading-4 text-[var(--ds-fg-muted)]">{description}</p>
              </div>
            </div>
            <div className="grid gap-2">
              {actions.map((action) => (
                <ActionButton
                  key={action.label}
                  action={action}
                  disabled={Boolean(action.needsSelection && noSelection)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
