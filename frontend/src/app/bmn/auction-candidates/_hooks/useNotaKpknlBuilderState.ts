"use client";

import { useState } from "react";
import {
  DEFAULT_NOTA_DINAS_PERIHAL,
  DEFAULT_KPKNL_PERIHAL,
  DEFAULT_LAMPIRAN,
  DEFAULT_LOKASI,
  DEFAULT_KPKNL_LOKASI,
  DEFAULT_NOTA_DINAS_TEMBUSAN,
  DEFAULT_KPKNL_TEMBUSAN,
  DEFAULT_NOTA_DINAS_KESIMPULAN,
  DEFAULT_KPKNL_KESIMPULAN,
} from "../_lib/nota-kpknl-defaults";
import type { SkBuilderItem } from "../_lib/sk-defaults";

export interface UseNotaKpknlBuilderResult {
  // Nota Dinas KSDAE
  ndPerihal: string;
  setNdPerihal: React.Dispatch<React.SetStateAction<string>>;
  ndLampiran: string;
  setNdLampiran: React.Dispatch<React.SetStateAction<string>>;
  ndLokasi: string;
  setNdLokasi: React.Dispatch<React.SetStateAction<string>>;
  ndTembusan: SkBuilderItem[];
  setNdTembusan: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
  ndKesimpulan: string;
  setNdKesimpulan: React.Dispatch<React.SetStateAction<string>>;
  ndNilaiTaksiran: number;
  setNdNilaiTaksiran: React.Dispatch<React.SetStateAction<number>>;
  // Permohonan KPKNL
  pkPerihal: string;
  setPkPerihal: React.Dispatch<React.SetStateAction<string>>;
  pkLampiran: string;
  setPkLampiran: React.Dispatch<React.SetStateAction<string>>;
  pkLokasi: string;
  setPkLokasi: React.Dispatch<React.SetStateAction<string>>;
  pkTembusan: SkBuilderItem[];
  setPkTembusan: React.Dispatch<React.SetStateAction<SkBuilderItem[]>>;
  pkKesimpulan: string;
  setPkKesimpulan: React.Dispatch<React.SetStateAction<string>>;
}

export function useNotaKpknlBuilderState(): UseNotaKpknlBuilderResult {
  const [ndPerihal, setNdPerihal] = useState(DEFAULT_NOTA_DINAS_PERIHAL);
  const [ndLampiran, setNdLampiran] = useState(DEFAULT_LAMPIRAN);
  const [ndLokasi, setNdLokasi] = useState(DEFAULT_LOKASI);
  const [ndTembusan, setNdTembusan] = useState<SkBuilderItem[]>(DEFAULT_NOTA_DINAS_TEMBUSAN);
  const [ndKesimpulan, setNdKesimpulan] = useState(DEFAULT_NOTA_DINAS_KESIMPULAN);
  const [ndNilaiTaksiran, setNdNilaiTaksiran] = useState(0);

  const [pkPerihal, setPkPerihal] = useState(DEFAULT_KPKNL_PERIHAL);
  const [pkLampiran, setPkLampiran] = useState("1 (satu) Berkas");
  const [pkLokasi, setPkLokasi] = useState(DEFAULT_KPKNL_LOKASI);
  const [pkTembusan, setPkTembusan] = useState<SkBuilderItem[]>(DEFAULT_KPKNL_TEMBUSAN);
  const [pkKesimpulan, setPkKesimpulan] = useState(DEFAULT_KPKNL_KESIMPULAN);

  return {
    ndPerihal, setNdPerihal,
    ndLampiran, setNdLampiran,
    ndLokasi, setNdLokasi,
    ndTembusan, setNdTembusan,
    ndKesimpulan, setNdKesimpulan,
    ndNilaiTaksiran, setNdNilaiTaksiran,
    pkPerihal, setPkPerihal,
    pkLampiran, setPkLampiran,
    pkLokasi, setPkLokasi,
    pkTembusan, setPkTembusan,
    pkKesimpulan, setPkKesimpulan,
  };
}
