"use client";

import { useState } from "react";
import type { SkBuilderItem, SkMemutuskan } from "../_lib/sk-defaults";
import {
  DEFAULT_PANITIA_MEMUTUSKAN,
  DEFAULT_PANITIA_MENGINGAT,
  DEFAULT_PANITIA_MENIMBANG,
  DEFAULT_PANITIA_TEMBUSAN,
} from "../_lib/sk-panitia-defaults";

export interface UseSkPanitiaBuilderStateResult {
  panitiaMenimbang: SkBuilderItem[];
  setPanitiaMenimbang: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
  panitiaMengingat: SkBuilderItem[];
  setPanitiaMengingat: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
  panitiaMemutuskan: SkMemutuskan;
  setPanitiaMemutuskan: React.Dispatch<React.SetStateAction<SkMemutuskan>>;
  panitiaTembusan: SkBuilderItem[];
  setPanitiaTembusan: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
}

export function useSkPanitiaBuilderState(): UseSkPanitiaBuilderStateResult {
  const [panitiaMenimbang, setPanitiaMenimbang] = useState<SkBuilderItem[]>(
    DEFAULT_PANITIA_MENIMBANG,
  );
  const [panitiaMengingat, setPanitiaMengingat] = useState<SkBuilderItem[]>(
    DEFAULT_PANITIA_MENGINGAT,
  );
  const [panitiaMemutuskan, setPanitiaMemutuskan] = useState<SkMemutuskan>(
    DEFAULT_PANITIA_MEMUTUSKAN,
  );
  const [panitiaTembusan, setPanitiaTembusan] = useState<SkBuilderItem[]>(
    DEFAULT_PANITIA_TEMBUSAN,
  );

  return {
    panitiaMenimbang,
    setPanitiaMenimbang,
    panitiaMengingat,
    setPanitiaMengingat,
    panitiaMemutuskan,
    setPanitiaMemutuskan,
    panitiaTembusan,
    setPanitiaTembusan,
  };
}
