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
        "h-auto min-h-12 justify-start rounded-xl border-zinc-200 bg-white px-3 py-2 text-left hover:border-emerald-200 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10",
        disabled && "cursor-not-allowed opacity-55",
      )}
      onClick={action.onClick}
      disabled={disabled}
    >
      <FileText className="mr-2 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
          {action.label}
        </span>
        <span className="block truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Generate Dokumen Lelang</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {orderedIdsLength > 0
                ? `${orderedIdsLength} aset siap dipakai sebagai lampiran.`
                : "Beberapa dokumen membutuhkan aset terpilih."}
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          Langkah 3
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {groups.map(({ title, description, Icon, actions }) => (
          <section
            key={title}
            className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="mb-3 flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-emerald-400 dark:ring-zinc-700">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{title}</p>
                <p className="text-[10px] leading-4 text-zinc-500 dark:text-zinc-400">{description}</p>
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
