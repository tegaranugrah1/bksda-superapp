"use client";

import { useParams } from "next/navigation";
import { SuratTugasForm } from "../../_components/SuratTugasForm";

export default function STBuilderPage() {
  const params = useParams();
  const id = params.id as string;

  return <SuratTugasForm mode="edit" letterId={id} />;
}
