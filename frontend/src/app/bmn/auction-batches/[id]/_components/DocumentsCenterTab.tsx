"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDocumentContext, recordPrintEvent, AuctionBatch } from "../../_lib/api";
import { formatRupiah } from "../../../auction-candidates/_lib/auction-helpers";
import { toast } from "sonner";
import {
  Loader2,
  Printer,
  FileCheck,
  AlertTriangle,
  FileText,
  Bookmark,
  Building,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Import candidate print components directly to avoid code duplication
import { CorrectionDocument as BaKoreksiDocument } from "../../../auction-candidates/_components/BaKoreksiDocument";
import { SkPenghentianDocument } from "../../../auction-candidates/_components/SkPenghentianDocument";
import { SkPanitiaDocument } from "../../../auction-candidates/_components/SkPanitiaDocument";
import { SkTimPenilaiDocument } from "../../../auction-candidates/_components/SkTimPenilaiDocument";
import { SptjLimitDocument } from "../../../auction-candidates/_components/SptjLimitDocument";
import { SptjmDocument } from "../../../auction-candidates/_components/SptjmDocument";
import { SpTugasDocument } from "../../../auction-candidates/_components/SpTugasDocument";
import { SkKebenaranDokumenDocument as SkKebenaranDocument } from "../../../auction-candidates/_components/SkKebenaranDokumenDocument";
import { BaPemeriksaanDocument } from "../../../auction-candidates/_components/BaPemeriksaanDocument";
import { NotaDinasDocument } from "../../../auction-candidates/_components/NotaDinasDocument";
import { PermohonanKpknlDocument } from "../../../auction-candidates/_components/PermohonanKpknlDocument";

import {
  DEFAULT_MEMUTUSKAN,
  DEFAULT_MENIMBANG,
  DEFAULT_MENGINGAT,
} from "../../../auction-candidates/_lib/sk-defaults";
import {
  DEFAULT_PANITIA_MEMUTUSKAN,
  DEFAULT_PANITIA_MENIMBANG,
  DEFAULT_PANITIA_MENGINGAT,
  DEFAULT_PANITIA_TEMBUSAN,
} from "../../../auction-candidates/_lib/sk-panitia-defaults";
import {
  DEFAULT_TIM_PENILAI_MEMUTUSKAN,
  DEFAULT_TIM_PENILAI_MENIMBANG,
  DEFAULT_TIM_PENILAI_MENGINGAT,
  DEFAULT_TIM_PENILAI_TEMBUSAN,
} from "../../../auction-candidates/_lib/sk-tim-penilai-defaults";

interface DocumentsCenterTabProps {
  batch: AuctionBatch;
}

interface DocumentItem {
  key: string;
  title: string;
  category: "internal" | "sk" | "pernyataan" | "eksternal";
  description: string;
  rootId: string;
}

export function DocumentsCenterTab({ batch }: DocumentsCenterTabProps) {
  const [printingDocKey, setPrintingDocKey] = useState<string | null>(null);

  // Load document context
  const { data: contextResponse, isLoading, error } = useQuery({
    queryKey: ["bmn-auction-document-context", batch.id],
    queryFn: () => getDocumentContext(batch.id),
  });

  const context = contextResponse?.data;

  // Record print event mutation
  const logPrintMutation = useMutation({
    mutationFn: (docKey: string) => recordPrintEvent(batch.id, docKey),
  });

  const documents: DocumentItem[] = [
    {
      key: "nota_dinas",
      title: "Nota Dinas Permohonan Persetujuan Internal",
      category: "internal",
      description: "Surat usulan internal kepala balai untuk penghapusan aset BMN.",
      rootId: "nota-dinas-print-root",
    },
    {
      key: "sk_penghentian",
      title: "SK Penghentian Penggunaan Dinas (KPA)",
      category: "sk",
      description: "SK penetapan penghentian penggunaan aset BMN dari operasional dinas.",
      rootId: "sk-penghentian-print-root",
    },
    {
      key: "sk_panitia",
      title: "SK Pembentukan Panitia Penghapusan",
      category: "sk",
      description: "SK pembentukan panitia pelaksana penghapusan BMN.",
      rootId: "sk-panitia-print-root",
    },
    {
      key: "sk_tim_penilai",
      title: "SK Penunjukan Tim Penilai / Penaksir",
      category: "sk",
      description: "SK penunjukan tim penilai independen untuk taksiran harga aset.",
      rootId: "sk-tim-penilai-print-root",
    },
    {
      key: "ba_koreksi",
      title: "BA Koreksi Kondisi BMN",
      category: "internal",
      description: "Berita acara rekonsiliasi data inventaris fisik dengan sistem.",
      rootId: "ba-koreksi-print-root",
    },
    {
      key: "ba_pemeriksaan",
      title: "BA Pemeriksaan Fisik Panitia",
      category: "internal",
      description: "Laporan pemeriksaan kelayakan fisik oleh panitia penghapusan.",
      rootId: "ba-pemeriksaan-print-root",
    },
    {
      key: "sk_kebenaran",
      title: "SK KPA Kebenaran Dokumen Kepemilikan",
      category: "sk",
      description: "Surat pernyataan keabsahan dokumen kepemilikan aset BMN.",
      rootId: "sk-kebenaran-print-root",
    },
    {
      key: "sptjm",
      title: "Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)",
      category: "pernyataan",
      description: "Pernyataan tanggung jawab mutlak atas penghapusan BMN.",
      rootId: "sptjm-print-root",
    },
    {
      key: "sptj_limit",
      title: "Surat Pernyataan Tanggung Jawab Nilai Limit",
      category: "pernyataan",
      description: "Pernyataan tanggung jawab atas penetapan nilai limit lelang.",
      rootId: "sptj-limit-print-root",
    },
    {
      key: "sp_tugas",
      title: "Surat Pernyataan Kelancaran Tugas Dinas",
      category: "pernyataan",
      description: "Surat pernyataan bahwa pemindahtanganan aset tidak mengganggu dinas.",
      rootId: "sp-tugas-print-root",
    },
    {
      key: "permohonan_kpknl",
      title: "Surat Permohonan Lelang ke KPKNL",
      category: "eksternal",
      description: "Surat pengajuan lelang resmi yang ditujukan kepada KPKNL setempat.",
      rootId: "permohonan-kpknl-print-root",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-60 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-xs text-zinc-500">Memuat berkas dokumen...</p>
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="flex h-60 flex-col items-center justify-center space-y-2 text-center p-6 bg-red-50 dark:bg-red-950/10 rounded-2xl">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-50">Gagal Memuat Dokumen</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Silakan muat ulang halaman ini atau pastikan data paket lengkap.
        </p>
      </div>
    );
  }

  // Check Schema Version
  if (context.metadata_schema_version && context.metadata_schema_version !== 1) {
    return (
      <div className="flex h-60 flex-col items-center justify-center space-y-2 text-center p-6 bg-amber-50 dark:bg-amber-950/10 rounded-2xl border border-amber-200">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-50">Skema Metadata Tidak Didukung</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
          Dokumen ini dibuat menggunakan skema metadata versi {context.metadata_schema_version} yang tidak didukung oleh sistem cetak saat ini (versi 1).
        </p>
      </div>
    );
  }

  // Handle document printing
  const handlePrint = (doc: DocumentItem) => {
    setPrintingDocKey(doc.key);

    // Give DOM time to render the print component
    setTimeout(() => {
      const printElement = document.getElementById(doc.rootId);
      if (!printElement) {
        toast.error(`Dokumen ${doc.title} gagal disiapkan.`);
        setPrintingDocKey(null);
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        setPrintingDocKey(null);
        return;
      }

      // Grab styling from our document component styles or inject default print layout
      const printStyles = `
        @page { size: A4; margin: 0 0 28mm 0; }
        * { box-sizing: border-box; }
        body {
          margin: 0; padding: 0; background: white; color: black;
          font-family: 'Bookman Old Style', Georgia, serif;
          font-size: 11pt; line-height: 1.4;
        }
        p { margin: 0; padding: 0; }
        article { margin: 0; }
        .doc-page { width: 210mm; box-sizing: border-box; margin: 0 auto; padding: 5mm 20mm 0; }
        .doc-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; text-align: center; }
        .doc-header img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
        .doc-body { width: 166mm; margin-left: auto; margin-right: auto; text-align: justify; text-justify: inter-word; }
        .doc-body p { text-align: justify; text-justify: inter-word; }
        .doc-title { margin-top: 0.75rem; text-align: center; font-weight: 700; line-height: 1.3; }
        .doc-title p { margin: 0; }
        .doc-text-block { margin-top: 1rem; }
        .doc-text-block > * + * { margin-top: 0.85rem; }
        .doc-identity { display: grid; grid-template-columns: 28mm 5mm minmax(0, 1fr); row-gap: 0.2rem; column-gap: 0; }
        .doc-identity .colon { text-align: center; }
        .doc-list { padding-left: 0; margin: 0; }
        .doc-list-item { display: grid; grid-template-columns: 8mm minmax(0, 1fr); column-gap: 0; }
        .doc-list-item + .doc-list-item { margin-top: 0.5rem; }
        .doc-list-item .text { text-align: justify; }
        .signature { width: 20rem; margin-left: auto; margin-top: 1.5rem; }
        .signature p { margin: 0; padding: 0; line-height: 1.3; }
        .ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; margin-top: 2rem; margin-bottom: 2rem; }
        .doc-editable { border-bottom: none !important; }
      `;

      printWindow.document.write(`
        <html>
          <head>
            <title>${doc.title}</title>
            <style>${printStyles}</style>
          </head>
          <body>
            ${printElement.innerHTML}
          </body>
        </html>
      `);

      // Watermark injecting if batch status is DRAFT or BATAL
      let watermarkText = "";
      if (batch.status === "DRAFT") {
        watermarkText = "DRAFT - BELUM UNTUK DIKIRIM";
      } else if (batch.status === "BATAL") {
        watermarkText = "BATAL - ARSIP";
      }

      if (watermarkText) {
        const watermarkDiv = printWindow.document.createElement("div");
        watermarkDiv.innerText = watermarkText;
        watermarkDiv.style.position = "fixed";
        watermarkDiv.style.top = "50%";
        watermarkDiv.style.left = "50%";
        watermarkDiv.style.transform = "translate(-50%, -50%) rotate(-30deg)";
        watermarkDiv.style.fontSize = "36pt";
        watermarkDiv.style.color = "rgba(220, 220, 220, 0.28)";
        watermarkDiv.style.fontWeight = "bold";
        watermarkDiv.style.whiteSpace = "nowrap";
        watermarkDiv.style.pointerEvents = "none";
        watermarkDiv.style.zIndex = "9999";
        watermarkDiv.style.fontFamily = "sans-serif";
        printWindow.document.body.appendChild(watermarkDiv);
      }

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        // Log printing event in backend audit logger
        logPrintMutation.mutate(doc.key);
        setPrintingDocKey(null);
      }, 500);
    }, 100);
  };

  // Convert context data structures to fit expectations of imported candidate templates
  const mappedAssets = context.assets || [];
  const meta = context.metadata || {};

  const kepalaBalai = {
    nama: meta.signatories?.kepala_balai?.nama || "-",
    nip: meta.signatories?.kepala_balai?.nip || "",
  };

  const panitiaList = meta.committees?.panitia_penghapusan || [];
  const timPenilaiList = meta.committees?.tim_penilai || [];
  const pemeriksaList = meta.committees?.pemeriksa || [];

  const skNumber = meta.document_numbers?.sk || "____";
  const skKap = "Balai"; // or from settings

  const stNumber = meta.document_numbers?.surat_tugas || "____";
  const stTanggal = meta.document_dates?.surat_tugas || "";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          Pusat Dokumen Cetak BMN
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Unduh dan cetak seluruh Surat Keputusan (SK) dan Berita Acara (BA) resmi administrasi penghapusan aset.
        </p>
      </div>

      {/* Group listing */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => {
          const isPrintingThis = printingDocKey === doc.key;
          return (
            <div
              key={doc.key}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500">
                  {doc.category}
                </span>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 mt-1">
                  {doc.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                  {doc.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <Button
                  onClick={() => handlePrint(doc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  disabled={!!printingDocKey}
                >
                  {isPrintingThis ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  {isPrintingThis ? "Menyiapkan..." : "Cetak Dokumen"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden print templates area - rendered off-screen only when needed to save DOM weight */}
      {printingDocKey && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          {printingDocKey === "ba_koreksi" && (
            <div id="ba-koreksi-print-root">
              <BaKoreksiDocument
                assets={mappedAssets}
                baNumber={meta.document_numbers?.ba_koreksi || "____"}
                baKap="Balai"
                kepalaBalai={kepalaBalai}
              />
            </div>
          )}
          {printingDocKey === "sk_penghentian" && (
            <div id="sk-penghentian-print-root">
              <SkPenghentianDocument
                assets={mappedAssets}
                skNumber={skNumber}
                skKap={skKap}
                menimbang={meta.sk_details?.penghentian?.menimbang || DEFAULT_MENIMBANG}
                mengingat={meta.sk_details?.penghentian?.mengingat || DEFAULT_MENGINGAT}
                memutuskan={meta.sk_details?.penghentian?.memutuskan || DEFAULT_MEMUTUSKAN}
                kepalaBalai={kepalaBalai}
                tembusan={meta.sk_details?.penghentian?.tembusan || []}
              />
            </div>
          )}
          {printingDocKey === "sk_panitia" && (
            <div id="sk-panitia-print-root">
              <SkPanitiaDocument
                skNumber={skNumber}
                skKap={skKap}
                menimbang={meta.sk_details?.panitia?.menimbang || DEFAULT_PANITIA_MENIMBANG}
                mengingat={meta.sk_details?.panitia?.mengingat || DEFAULT_PANITIA_MENGINGAT}
                memutuskan={meta.sk_details?.panitia?.memutuskan || DEFAULT_PANITIA_MEMUTUSKAN}
                kepalaBalai={kepalaBalai}
                tembusan={meta.sk_details?.panitia?.tembusan || DEFAULT_PANITIA_TEMBUSAN}
                susunanPanitia={panitiaList}
              />
            </div>
          )}
          {printingDocKey === "sk_tim_penilai" && (
            <div id="sk-tim-penilai-print-root">
              <SkTimPenilaiDocument
                skNumber={skNumber}
                skKap={skKap}
                menimbang={meta.sk_details?.tim_penilai?.menimbang || DEFAULT_TIM_PENILAI_MENIMBANG}
                mengingat={meta.sk_details?.tim_penilai?.mengingat || DEFAULT_TIM_PENILAI_MENGINGAT}
                memutuskan={meta.sk_details?.tim_penilai?.memutuskan || DEFAULT_TIM_PENILAI_MEMUTUSKAN}
                kepalaBalai={kepalaBalai}
                tembusan={meta.sk_details?.tim_penilai?.tembusan || DEFAULT_TIM_PENILAI_TEMBUSAN}
                susunanTimPenilai={timPenilaiList}
              />
            </div>
          )}
          {printingDocKey === "ba_pemeriksaan" && (
            <div id="ba-pemeriksaan-print-root">
              <BaPemeriksaanDocument
                number={meta.document_numbers?.ba_pemeriksaan || "____"}
                kap="Balai"
                pemeriksaList={pemeriksaList}
                stNumber={stNumber}
                stTanggal={stTanggal}
                assets={mappedAssets}
                kepalaBalai={kepalaBalai}
              />
            </div>
          )}
          {printingDocKey === "nota_dinas" && (
            <div id="nota-dinas-print-root">
              <NotaDinasDocument
                number={meta.document_numbers?.nota_dinas || "____"}
                kap="Balai"
                assets={mappedAssets}
                kepalaBalai={kepalaBalai}
                perihal="Permohonan Persetujuan Penjualan BMN Rusak Berat"
                lampiran="1 (Satu) Berkas"
                lokasi="Samarinda"
                tembusan={[]}
                kesimpulan="Aset BMN tersebut sudah tidak dapat digunakan dan perlu dihapuskan."
                nilaiTaksiran={batch.nilai_taksiran_total || 0}
              />
            </div>
          )}
          {printingDocKey === "permohonan_kpknl" && (
            <div id="permohonan-kpknl-print-root">
              <PermohonanKpknlDocument
                number={meta.document_numbers?.permohonan_kpknl || "____"}
                kap="Balai"
                assets={mappedAssets}
                kepalaBalai={kepalaBalai}
                perihal="Permohonan Pelaksanaan Lelang Barang Milik Negara"
                lampiran="1 (Satu) Berkas"
                lokasi="Samarinda"
                tembusan={[]}
                kesimpulan="Aset BMN tersebut dalam kondisi Rusak Berat dan diusulkan untuk dilelang."
              />
            </div>
          )}
          {printingDocKey === "sk_kebenaran" && (
            <div id="sk-kebenaran-print-root">
              <SkKebenaranDocument
                number={meta.document_numbers?.sk_kebenaran || "____"}
                kap="Balai"
                assets={mappedAssets}
                kepalaBalai={kepalaBalai}
              />
            </div>
          )}
          {printingDocKey === "sptjm" && (
            <div id="sptjm-print-root">
              <SptjmDocument number="01" kap="BALAI" kepalaBalai={kepalaBalai} />
            </div>
          )}
          {printingDocKey === "sptj_limit" && (
            <div id="sptj-limit-print-root">
              <SptjLimitDocument number="01" kap="BALAI" kepalaBalai={kepalaBalai} />
            </div>
          )}
          {printingDocKey === "sp_tugas" && (
            <div id="sp-tugas-print-root">
              <SpTugasDocument number="01" kap="BALAI" kepalaBalai={kepalaBalai} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
