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
      <div className="p-12 text-center text-xs font-semibold text-zinc-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
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
    <div className="w-full p-5 md:p-7 space-y-5 text-slate-900 dark:text-zinc-100">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/surat/masuk">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-emerald-600" />
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {idParam ? "Edit Surat Masuk & Lembar Disposisi" : "Input Surat Masuk Baru & Lembar Disposisi"}
              </h1>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Form Lembar Disposisi presisi BKSDA KALTIM (Ukuran Kertas Letter dibagi 2).
            </p>
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
        <div className="p-6 text-xs text-zinc-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          Memuat...
        </div>
      }
    >
      <EditSuratMasukContent />
    </Suspense>
  );
}
