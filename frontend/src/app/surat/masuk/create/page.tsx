"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LembarDisposisiForm } from "../../_components/LembarDisposisiForm";
import { api } from "@/lib/api";
import type { SuratMasuk } from "../../_lib/surat-types";

function EditSuratMasukContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  // Fetch initial data from server if editing
  const { data: initialData, isLoading } = useQuery<SuratMasuk | undefined>({
    queryKey: ["surat-masuk-detail", idParam],
    queryFn: async () => {
      if (!idParam) return undefined;
      const res = await api.get(`/surat-masuk/${idParam}`);
      return res.data?.data;
    },
    enabled: !!idParam,
  });

  // Fetch next agenda number if creating new
  const { data: nextAgendaData } = useQuery<{ next_agenda: string; year: number }>({
    queryKey: ["surat-masuk-next-agenda"],
    queryFn: async () => {
      const res = await api.get("/surat-masuk/next-agenda");
      return res.data;
    },
    enabled: !idParam,
  });

  if (idParam && isLoading) {
    return (
      <div className="psr-ui p-12 text-center text-xs font-semibold text-[var(--ds-fg-muted)] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-accent-fg)]" />
        Memuat data surat masuk untuk diedit...
      </div>
    );
  }

  const populatedInitialData: Partial<SuratMasuk> | undefined = initialData
    ? initialData
    : nextAgendaData?.next_agenda
    ? { no_agenda: nextAgendaData.next_agenda }
    : undefined;

  return (
    <div className="psr-ui w-full p-4 md:p-6 space-y-6 text-[var(--ds-fg)]">
      {/* Enterprise Header Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/surat/masuk">
              <Button
                variant="outline"
                size="sm"
                aria-label="Kembali ke Agenda Surat Masuk"
                className="kpg-secondary h-10 w-10 p-0 rounded-lg shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="kpg-support-icon w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
                {idParam ? "Edit Surat Masuk & Lembar Disposisi" : "Input Surat Masuk Baru & Lembar Disposisi"}
              </h1>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                Form Lembar Disposisi presisi BKSDA KALTIM (Ukuran Kertas Letter dibagi 2).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Link href="/surat/masuk">
              <Button
                variant="outline"
                size="sm"
                className="kpg-secondary h-9 px-4 text-xs font-semibold rounded-lg gap-2"
              >
                <Inbox className="h-4 w-4 text-[var(--ds-accent-fg)]" />
                Daftar Agenda Masuk
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Lembar Disposisi Form */}
      <LembarDisposisiForm
        key={initialData?.id || nextAgendaData?.next_agenda || "new"}
        initialData={populatedInitialData}
      />
    </div>
  );
}

export default function CreateSuratMasukPage() {
  return (
    <Suspense
      fallback={
        <div className="psr-ui p-6 text-xs text-[var(--ds-fg-muted)] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-accent-fg)]" />
          Memuat...
        </div>
      }
    >
      <EditSuratMasukContent />
    </Suspense>
  );
}
