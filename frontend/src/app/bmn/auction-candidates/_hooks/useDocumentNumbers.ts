"use client";

import { useState } from "react";
import { formatDateLong } from "../_lib/auction-helpers";

export interface UseDocumentNumbersResult {
  baNumber: string;
  setBaNumber: React.Dispatch<React.SetStateAction<string>>;
  baKap: string;
  setBaKap: React.Dispatch<React.SetStateAction<string>>;
  skNumber: string;
  setSkNumber: React.Dispatch<React.SetStateAction<string>>;
  skKap: string;
  setSkKap: React.Dispatch<React.SetStateAction<string>>;
  skPanitiaNumber: string;
  setSkPanitiaNumber: React.Dispatch<React.SetStateAction<string>>;
  skPanitiaKap: string;
  setSkPanitiaKap: React.Dispatch<React.SetStateAction<string>>;
  skTimPenilaiNumber: string;
  setSkTimPenilaiNumber: React.Dispatch<React.SetStateAction<string>>;
  skTimPenilaiKap: string;
  setSkTimPenilaiKap: React.Dispatch<React.SetStateAction<string>>;
  sptjLimitNumber: string;
  setSptjLimitNumber: React.Dispatch<React.SetStateAction<string>>;
  sptjLimitKap: string;
  setSptjLimitKap: React.Dispatch<React.SetStateAction<string>>;
  sptjmNumber: string;
  setSptjmNumber: React.Dispatch<React.SetStateAction<string>>;
  sptjmKap: string;
  setSptjmKap: React.Dispatch<React.SetStateAction<string>>;
  spTugasNumber: string;
  setSpTugasNumber: React.Dispatch<React.SetStateAction<string>>;
  spTugasKap: string;
  setSpTugasKap: React.Dispatch<React.SetStateAction<string>>;
  skKebenaranNumber: string;
  setSkKebenaranNumber: React.Dispatch<React.SetStateAction<string>>;
  skKebenaranKap: string;
  setSkKebenaranKap: React.Dispatch<React.SetStateAction<string>>;
  baPemeriksaanNumber: string;
  setBaPemeriksaanNumber: React.Dispatch<React.SetStateAction<string>>;
  baPemeriksaanKap: string;
  setBaPemeriksaanKap: React.Dispatch<React.SetStateAction<string>>;
  notaDinasNumber: string;
  setNotaDinasNumber: React.Dispatch<React.SetStateAction<string>>;
  notaDinasKap: string;
  setNotaDinasKap: React.Dispatch<React.SetStateAction<string>>;
  permohonanKpknlNumber: string;
  setPermohonanKpknlNumber: React.Dispatch<React.SetStateAction<string>>;
  permohonanKpknlKap: string;
  setPermohonanKpknlKap: React.Dispatch<React.SetStateAction<string>>;
  stNumber: string;
  setStNumber: React.Dispatch<React.SetStateAction<string>>;
  stTanggal: string;
  setStTanggal: React.Dispatch<React.SetStateAction<string>>;
}

const DEFAULT_KAP = "KAP.06.01";
const DEFAULT_SK_KAP = "KAP.05.01";

export function useDocumentNumbers(): UseDocumentNumbersResult {
  const [baNumber, setBaNumber] = useState("");
  const [baKap, setBaKap] = useState(DEFAULT_KAP);
  const [skNumber, setSkNumber] = useState("");
  const [skKap, setSkKap] = useState(DEFAULT_SK_KAP);
  const [skPanitiaNumber, setSkPanitiaNumber] = useState("");
  const [skPanitiaKap, setSkPanitiaKap] = useState(DEFAULT_SK_KAP);
  const [skTimPenilaiNumber, setSkTimPenilaiNumber] = useState("");
  const [skTimPenilaiKap, setSkTimPenilaiKap] = useState(DEFAULT_KAP);
  const [sptjLimitNumber, setSptjLimitNumber] = useState("");
  const [sptjLimitKap, setSptjLimitKap] = useState(DEFAULT_KAP);
  const [sptjmNumber, setSptjmNumber] = useState("");
  const [sptjmKap, setSptjmKap] = useState(DEFAULT_KAP);
  const [spTugasNumber, setSpTugasNumber] = useState("");
  const [spTugasKap, setSpTugasKap] = useState(DEFAULT_KAP);
  const [skKebenaranNumber, setSkKebenaranNumber] = useState("");
  const [skKebenaranKap, setSkKebenaranKap] = useState(DEFAULT_KAP);
  const [baPemeriksaanNumber, setBaPemeriksaanNumber] = useState("");
  const [baPemeriksaanKap, setBaPemeriksaanKap] = useState(DEFAULT_KAP);
  const [notaDinasNumber, setNotaDinasNumber] = useState("");
  const [notaDinasKap, setNotaDinasKap] = useState(DEFAULT_KAP);
  const [permohonanKpknlNumber, setPermohonanKpknlNumber] = useState("");
  const [permohonanKpknlKap, setPermohonanKpknlKap] = useState(DEFAULT_KAP);
  const [stNumber, setStNumber] = useState("");
  const [stTanggal, setStTanggal] = useState(formatDateLong(new Date()));

  return {
    baNumber,
    setBaNumber,
    baKap,
    setBaKap,
    skNumber,
    setSkNumber,
    skKap,
    setSkKap,
    skPanitiaNumber,
    setSkPanitiaNumber,
    skPanitiaKap,
    setSkPanitiaKap,
    skTimPenilaiNumber,
    setSkTimPenilaiNumber,
    skTimPenilaiKap,
    setSkTimPenilaiKap,
    sptjLimitNumber,
    setSptjLimitNumber,
    sptjLimitKap,
    setSptjLimitKap,
    sptjmNumber,
    setSptjmNumber,
    sptjmKap,
    setSptjmKap,
    spTugasNumber,
    setSpTugasNumber,
    spTugasKap,
    setSpTugasKap,
    skKebenaranNumber,
    setSkKebenaranNumber,
    skKebenaranKap,
    setSkKebenaranKap,
    baPemeriksaanNumber,
    setBaPemeriksaanNumber,
    baPemeriksaanKap,
    setBaPemeriksaanKap,
    notaDinasNumber,
    setNotaDinasNumber,
    notaDinasKap,
    setNotaDinasKap,
    permohonanKpknlNumber,
    setPermohonanKpknlNumber,
    permohonanKpknlKap,
    setPermohonanKpknlKap,
    stNumber,
    setStNumber,
    stTanggal,
    setStTanggal,
  };
}
