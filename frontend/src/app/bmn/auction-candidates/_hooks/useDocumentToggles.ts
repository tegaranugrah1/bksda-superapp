"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface UseDocumentTogglesResult {
  showDocument: boolean;
  showSkDocument: boolean;
  showSkPanitia: boolean;
  showSkTimPenilai: boolean;
  showSptjLimit: boolean;
  showSptjm: boolean;
  showSpTugas: boolean;
  showSkKebenaran: boolean;
  showBaPemeriksaan: boolean;
  setShowDocument: React.Dispatch<React.SetStateAction<boolean>>;
  resetAllShows: () => void;
  handleProcess: () => void;
  handleProcessSk: () => void;
  handleProcessSkPanitia: () => void;
  handleProcessSkTimPenilai: () => void;
  handleProcessSptjLimit: () => void;
  handleProcessSptjm: () => void;
  handleProcessSpTugas: () => void;
  handleProcessSkKebenaran: () => void;
  handleProcessBaPemeriksaan: () => void;
}

const scrollIntoPreview = (id: string) => {
  setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
};

export function useDocumentToggles(orderedIdsLength: number): UseDocumentTogglesResult {
  const [showDocument, setShowDocument] = useState(false);
  const [showSkDocument, setShowSkDocument] = useState(false);
  const [showSkPanitia, setShowSkPanitia] = useState(false);
  const [showSkTimPenilai, setShowSkTimPenilai] = useState(false);
  const [showSptjLimit, setShowSptjLimit] = useState(false);
  const [showSptjm, setShowSptjm] = useState(false);
  const [showSpTugas, setShowSpTugas] = useState(false);
  const [showSkKebenaran, setShowSkKebenaran] = useState(false);
  const [showBaPemeriksaan, setShowBaPemeriksaan] = useState(false);

  const resetAllShows = useCallback(() => {
    setShowDocument(false);
    setShowSkDocument(false);
    setShowSkPanitia(false);
    setShowSkTimPenilai(false);
    setShowSptjLimit(false);
    setShowSptjm(false);
    setShowSpTugas(false);
    setShowSkKebenaran(false);
    setShowBaPemeriksaan(false);
  }, []);

  const handleProcess = useCallback(() => {
    if (orderedIdsLength === 0) {
      toast.error("Pilih minimal satu aset untuk diproses.");
      return;
    }
    resetAllShows();
    setShowDocument(true);
    scrollIntoPreview("ba-koreksi-preview");
  }, [orderedIdsLength, resetAllShows]);

  const handleProcessSk = useCallback(() => {
    if (orderedIdsLength === 0) {
      toast.error("Pilih minimal satu aset untuk diproses.");
      return;
    }
    resetAllShows();
    setShowSkDocument(true);
    scrollIntoPreview("sk-penghentian-preview");
  }, [orderedIdsLength, resetAllShows]);

  const handleProcessSkPanitia = useCallback(() => {
    if (orderedIdsLength === 0) {
      toast.error("Pilih minimal satu aset untuk diproses.");
      return;
    }
    resetAllShows();
    setShowSkPanitia(true);
    scrollIntoPreview("sk-panitia-preview");
  }, [orderedIdsLength, resetAllShows]);

  const handleProcessSkTimPenilai = useCallback(() => {
    if (orderedIdsLength === 0) {
      toast.error("Pilih minimal satu aset untuk diproses.");
      return;
    }
    resetAllShows();
    setShowSkTimPenilai(true);
    scrollIntoPreview("sk-tim-penilai-preview");
  }, [orderedIdsLength, resetAllShows]);

  const handleProcessSptjLimit = useCallback(() => {
    resetAllShows();
    setShowSptjLimit(true);
    scrollIntoPreview("sptj-limit-preview");
  }, [resetAllShows]);

  const handleProcessSptjm = useCallback(() => {
    resetAllShows();
    setShowSptjm(true);
    scrollIntoPreview("sptjm-preview");
  }, [resetAllShows]);

  const handleProcessSpTugas = useCallback(() => {
    resetAllShows();
    setShowSpTugas(true);
    scrollIntoPreview("sp-tugas-preview");
  }, [resetAllShows]);

  const handleProcessSkKebenaran = useCallback(() => {
    if (orderedIdsLength === 0) {
      toast.error("Pilih minimal satu aset untuk membuat tabel dokumen kepemilikan.");
      return;
    }
    resetAllShows();
    setShowSkKebenaran(true);
    scrollIntoPreview("sk-kebenaran-preview");
  }, [orderedIdsLength, resetAllShows]);

  const handleProcessBaPemeriksaan = useCallback(() => {
    if (orderedIdsLength === 0) {
      toast.error("Pilih minimal satu aset untuk lampiran BA Pemeriksaan.");
      return;
    }
    resetAllShows();
    setShowBaPemeriksaan(true);
    scrollIntoPreview("ba-pemeriksaan-preview");
  }, [orderedIdsLength, resetAllShows]);

  return {
    showDocument,
    showSkDocument,
    showSkPanitia,
    showSkTimPenilai,
    showSptjLimit,
    showSptjm,
    showSpTugas,
    showSkKebenaran,
    showBaPemeriksaan,
    setShowDocument,
    resetAllShows,
    handleProcess,
    handleProcessSk,
    handleProcessSkPanitia,
    handleProcessSkTimPenilai,
    handleProcessSptjLimit,
    handleProcessSptjm,
    handleProcessSpTugas,
    handleProcessSkKebenaran,
    handleProcessBaPemeriksaan,
  };
}
