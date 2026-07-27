"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LembarDisposisiForm } from "../../_components/LembarDisposisiForm";
import { api } from "@/lib/api";
import type { SuratMasuk } from "../../_lib/surat-types";

function EditSuratMasukContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [initialData, setInitialData] = useState<SuratMasuk | undefined>(undefined);
  const [loading, setLoading] = useState(!!idParam);

  useEffect(() => {
    if (!idParam) {
      setLoading(false);
      return;
    }

    async function loadInitial() {
      // 1. Try local storage first
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("bksda_saved_surat_masuk");
        if (saved) {
          try {
            const list: SuratMasuk[] = JSON.parse(saved);
            const found = list.find((item) => String(item.id) === String(idParam));
            if (found) {
              setInitialData(found);
              setLoading(false);
              return;
            }
          } catch (e) {}
        }
      }

      // 2. Fallback to API
      try {
        const res = await api.get(`/api/surat-masuk/${idParam}`);
        if (res.data?.data) {
          setInitialData(res.data.data);
        }
      } catch (err) {}
      setLoading(false);
    }

    loadInitial();
  }, [idParam]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-semibold text-zinc-500">
        Memuat data surat masuk untuk diedit...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
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
            <p className="text-xs text-zinc-500">
              Form Lembar Disposisi presisi BKSDA KALTIM (Ukuran Kertas Letter dibagi 2).
            </p>
          </div>
        </div>
      </div>

      {/* Lembar Disposisi Form */}
      <LembarDisposisiForm initialData={initialData} />
    </div>
  );
}

export default function CreateSuratMasukPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-zinc-500">Memuat...</div>}>
      <EditSuratMasukContent />
    </Suspense>
  );
}
