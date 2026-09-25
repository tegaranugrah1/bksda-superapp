"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const destination = qs ? `/surat/keluar/dinas?${qs}` : "/surat/keluar/dinas";
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center text-xs text-zinc-400">
      Mengalihkan ke Buat Surat Dinas...
    </div>
  );
}

export default function LaporanRedirectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Memuat...</div>}>
      <RedirectContent />
    </Suspense>
  );
}
