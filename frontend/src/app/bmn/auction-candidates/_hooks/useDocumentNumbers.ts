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
  skPanitiaNumber: string;
  setSkPanitiaNumber: React.Dispatch<React.SetStateAction<string>>;
  skTimPenilaiNumber: string;
  setSkTimPenilaiNumber: React.Dispatch<React.SetStateAction<string>>;
  sptjLimitNumber: string;
  setSptjLimitNumber: React.Dispatch<React.SetStateAction<string>>;
  sptjmNumber: string;
  setSptjmNumber: React.Dispatch<React.SetStateAction<string>>;
  spTugasNumber: string;
  setSpTugasNumber: React.Dispatch<React.SetStateAction<string>>;
  skKebenaranNumber: string;
  setSkKebenaranNumber: React.Dispatch<React.SetStateAction<string>>;
  baPemeriksaanNumber: string;
  setBaPemeriksaanNumber: React.Dispatch<React.SetStateAction<string>>;
  notaDinasNumber: string;
  setNotaDinasNumber: React.Dispatch<React.SetStateAction<string>>;
  permohonanKpknlNumber: string;
  setPermohonanKpknlNumber: React.Dispatch<React.SetStateAction<string>>;
  stNumber: string;
  setStNumber: React.Dispatch<React.SetStateAction<string>>;
  stTanggal: string;
  setStTanggal: React.Dispatch<React.SetStateAction<string>>;
}

export function useDocumentNumbers(): UseDocumentNumbersResult {
  const [baNumber, setBaNumber] = useState("");
  const [baKap, setBaKap] = useState("KAP.06.01");
  const [skNumber, setSkNumber] = useState("");
  const [skPanitiaNumber, setSkPanitiaNumber] = useState("");
  const [skTimPenilaiNumber, setSkTimPenilaiNumber] = useState("107");
  const [sptjLimitNumber, setSptjLimitNumber] = useState("41");
  const [sptjmNumber, setSptjmNumber] = useState("202");
  const [spTugasNumber, setSpTugasNumber] = useState("40");
  const [skKebenaranNumber, setSkKebenaranNumber] = useState("200");
  const [baPemeriksaanNumber, setBaPemeriksaanNumber] = useState("158");
  const [notaDinasNumber, setNotaDinasNumber] = useState("270");
  const [permohonanKpknlNumber, setPermohonanKpknlNumber] = useState("331");
  const [stNumber, setStNumber] = useState("");
  const [stTanggal, setStTanggal] = useState(formatDateLong(new Date()));

  return {
    baNumber,
    setBaNumber,
    baKap,
    setBaKap,
    skNumber,
    setSkNumber,
    skPanitiaNumber,
    setSkPanitiaNumber,
    skTimPenilaiNumber,
    setSkTimPenilaiNumber,
    sptjLimitNumber,
    setSptjLimitNumber,
    sptjmNumber,
    setSptjmNumber,
    spTugasNumber,
    setSpTugasNumber,
    skKebenaranNumber,
    setSkKebenaranNumber,
    baPemeriksaanNumber,
    setBaPemeriksaanNumber,
    notaDinasNumber,
    setNotaDinasNumber,
    permohonanKpknlNumber,
    setPermohonanKpknlNumber,
    stNumber,
    setStNumber,
    stTanggal,
    setStTanggal,
  };
}
