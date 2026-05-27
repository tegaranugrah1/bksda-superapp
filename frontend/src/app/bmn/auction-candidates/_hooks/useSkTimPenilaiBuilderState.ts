"use client";

import { useState } from "react";
import type { SkBuilderItem } from "../_lib/sk-defaults";
import {
  DEFAULT_TIM_PENILAI_MEMUTUSKAN,
  DEFAULT_TIM_PENILAI_MENGINGAT,
  DEFAULT_TIM_PENILAI_MENIMBANG,
  DEFAULT_TIM_PENILAI_TEMBUSAN,
  type SkTimPenilaiMemutuskan,
} from "../_lib/sk-tim-penilai-defaults";

export interface UseSkTimPenilaiBuilderStateResult {
  timPenilaiMenimbang: SkBuilderItem[];
  setTimPenilaiMenimbang: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
  timPenilaiMengingat: SkBuilderItem[];
  setTimPenilaiMengingat: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
  timPenilaiMemutuskan: SkTimPenilaiMemutuskan;
  setTimPenilaiMemutuskan: React.Dispatch<React.SetStateAction<SkTimPenilaiMemutuskan>>;
  timPenilaiTembusan: SkBuilderItem[];
  setTimPenilaiTembusan: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
}

export function useSkTimPenilaiBuilderState(): UseSkTimPenilaiBuilderStateResult {
  const [timPenilaiMenimbang, setTimPenilaiMenimbang] = useState<SkBuilderItem[]>(
    DEFAULT_TIM_PENILAI_MENIMBANG,
  );
  const [timPenilaiMengingat, setTimPenilaiMengingat] = useState<SkBuilderItem[]>(
    DEFAULT_TIM_PENILAI_MENGINGAT,
  );
  const [timPenilaiMemutuskan, setTimPenilaiMemutuskan] = useState<SkTimPenilaiMemutuskan>(
    DEFAULT_TIM_PENILAI_MEMUTUSKAN,
  );
  const [timPenilaiTembusan, setTimPenilaiTembusan] = useState<SkBuilderItem[]>(
    DEFAULT_TIM_PENILAI_TEMBUSAN,
  );

  return {
    timPenilaiMenimbang,
    setTimPenilaiMenimbang,
    timPenilaiMengingat,
    setTimPenilaiMengingat,
    timPenilaiMemutuskan,
    setTimPenilaiMemutuskan,
    timPenilaiTembusan,
    setTimPenilaiTembusan,
  };
}
