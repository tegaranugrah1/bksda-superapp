"use client";

import { useParams } from "next/navigation";
import { SpjForm } from "@/app/keuangan/_components/SpjForm";

export default function EditSpjPage() {
  const params = useParams();
  const id = params?.id as string;

  return <SpjForm spjId={id} />;
}
