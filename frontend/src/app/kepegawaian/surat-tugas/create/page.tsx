"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { SuratTugasForm } from "../_components/SuratTugasForm";

export default function STCreatePremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canWrite } = useRole();

  const initialEmployeeId = searchParams.get("employee_id");
  const initialTemplate = searchParams.get("template");
  const initialParentStId = searchParams.get("parent_st_id");

  const isPlhFromInbox = initialTemplate === "plh" && Boolean(initialParentStId) && canWrite;

  useEffect(() => {
    if (!isPlhFromInbox) {
      const target = initialEmployeeId
        ? `/surat-tugas?employee_id=${encodeURIComponent(initialEmployeeId)}`
        : "/surat-tugas";
      router.replace(target);
    }
  }, [isPlhFromInbox, initialEmployeeId, router]);

  if (!isPlhFromInbox) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 gap-2">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
          Mengalihkan ke Form Pengajuan Surat Tugas...
        </p>
      </div>
    );
  }

  return (
    <SuratTugasForm
      mode="create"
      initialEmployeeId={initialEmployeeId}
      initialTemplate={initialTemplate}
      initialParentStId={initialParentStId}
    />
  );
}
