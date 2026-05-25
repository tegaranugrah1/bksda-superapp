"use client";

import { useState } from "react";
import {
  DEFAULT_KEPALA_BALAI,
  DEFAULT_MEMUTUSKAN,
  DEFAULT_MENGINGAT,
  DEFAULT_MENIMBANG,
  DEFAULT_TEMBUSAN,
  type SkBuilderItem,
  type SkKepalaBalai,
  type SkMemutuskan,
} from "../_lib/sk-defaults";

export interface UseSkBuilderStateResult {
  menimbang: SkBuilderItem[];
  setMenimbang: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
  mengingat: SkBuilderItem[];
  setMengingat: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
  memutuskan: SkMemutuskan;
  setMemutuskan: React.Dispatch<React.SetStateAction<SkMemutuskan>>;
  kepalaBalai: SkKepalaBalai;
  setKepalaBalai: React.Dispatch<React.SetStateAction<SkKepalaBalai>>;
  tembusan: SkBuilderItem[];
  setTembusan: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
}

export function useSkBuilderState(): UseSkBuilderStateResult {
  const [menimbang, setMenimbang] = useState<SkBuilderItem[]>(DEFAULT_MENIMBANG);
  const [mengingat, setMengingat] = useState<SkBuilderItem[]>(DEFAULT_MENGINGAT);
  const [memutuskan, setMemutuskan] = useState<SkMemutuskan>(DEFAULT_MEMUTUSKAN);
  const [kepalaBalai, setKepalaBalai] = useState<SkKepalaBalai>(DEFAULT_KEPALA_BALAI);
  const [tembusan, setTembusan] = useState<SkBuilderItem[]>(DEFAULT_TEMBUSAN);

  return {
    menimbang,
    setMenimbang,
    mengingat,
    setMengingat,
    memutuskan,
    setMemutuskan,
    kepalaBalai,
    setKepalaBalai,
    tembusan,
    setTembusan,
  };
}
