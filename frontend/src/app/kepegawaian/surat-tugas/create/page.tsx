"use client";

import { useSearchParams } from "next/navigation";
import { SuratTugasForm } from "../_components/SuratTugasForm";

export default function STCreatePremiumPage() {
  const searchParams = useSearchParams();
  const initialEmployeeId = searchParams.get("employee_id");
  const initialTemplate = searchParams.get("template");
  const initialParentStId = searchParams.get("parent_st_id");

  return (
    <SuratTugasForm
      mode="create"
      initialEmployeeId={initialEmployeeId}
      initialTemplate={initialTemplate}
      initialParentStId={initialParentStId}
    />
  );
}
