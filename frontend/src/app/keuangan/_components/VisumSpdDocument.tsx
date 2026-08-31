"use client";

import React from "react";
import { toast } from "sonner";

export interface VisumTransitItem {
  tiba_di?: string;
  tiba_tanggal?: string;
  tiba_kepala_jabatan?: string;
  tiba_kepala_nama?: string;
  tiba_kepala_nip?: string;
  tiba_id_type?: "NIP" | "NIK";
  berangkat_dari?: string;
  berangkat_ke?: string;
  berangkat_tanggal?: string;
  berangkat_kepala_jabatan?: string;
  berangkat_kepala_nama?: string;
  berangkat_kepala_nip?: string;
  berangkat_id_type?: "NIP" | "NIK";
}

export type VisumRowTransit = VisumTransitItem;

export interface VisumSpdData {
  spd_type?: "dipa" | "folu";

  // Section I: Berangkat dari tempat kedudukan
  asal_tempat: string;
  asal_tanggal: string;
  tujuan_awal: string;
  asal_jabatan_pengesah: string;
  asal_nama_pejabat: string;
  asal_nip_pejabat: string;

  // Section II: Tiba di tujuan 1 & Berangkat kembali / ke tujuan berikutnya
  tujuan_1_tempat: string;
  tujuan_1_tiba_tanggal: string;
  tujuan_1_kepala_jabatan: string;
  tujuan_1_kepala_nama: string;
  tujuan_1_kepala_nip?: string;
  tujuan_1_id_type?: "NIP" | "NIK";
  tujuan_1_berangkat_dari: string;
  tujuan_1_berangkat_ke: string;
  tujuan_1_berangkat_tanggal: string;
  tujuan_1_berangkat_kepala_jabatan?: string;
  tujuan_1_berangkat_kepala_nama?: string;
  tujuan_1_berangkat_kepala_nip?: string;
  tujuan_1_berangkat_id_type?: "NIP" | "NIK";

  // Section III, IV, V: Transit / Destinasi tambahan (default kosong)
  transit_3?: VisumRowTransit;
  transit_4?: VisumRowTransit;
  transit_5?: VisumRowTransit;

  // Section VI: Tiba kembali di tempat kedudukan & Pemeriksaan PPK
  kembali_tempat: string;
  kembali_tanggal: string;
  kembali_jabatan_pengesah: string;
  kembali_nama_pejabat: string;
  kembali_nip_pejabat: string;

  ppk_keterangan?: string;
  ppk_jabatan?: string;
  ppk_nama: string;
  ppk_nip: string;

  // Section VII: Catatan lain-lain
  catatan_lain?: string;

  // Section VIII: Perhatian
  perhatian_text?: string;
}

const BULAN_INDO_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatNip(rawNip?: string | null): string {
  if (!rawNip) return "";
  const cleaned = rawNip.replace(/\s+/g, "");
  if (cleaned.length === 18) {
    return `${cleaned.slice(0, 8)} ${cleaned.slice(8, 14)} ${cleaned.slice(14, 15)} ${cleaned.slice(15)}`;
  }
  return rawNip;
}

export function getTodayIndoDate(): string {
  const now = new Date();
  const day = now.getDate();
  const month = BULAN_INDO_NAMES[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

export function getTemplateKelian(): VisumSpdData {
  const today = getTodayIndoDate();
  return {
    spd_type: "folu",
    asal_tempat: "Samarinda",
    asal_tanggal: today,
    tujuan_awal: "Kabupaten Kutai Barat",
    asal_jabatan_pengesah: "a.n. Kepala Balai\nKepala Subbagian Tata Usaha",
    asal_nama_pejabat: "Dheny Mardiono, S.Hut., MSc.",
    asal_nip_pejabat: "19750314 199903 1 004",

    tujuan_1_tempat: "Kabupaten Kutai Barat",
    tujuan_1_tiba_tanggal: today,
    tujuan_1_kepala_jabatan: "Plt. Manager Camp PT. HLKL",
    tujuan_1_kepala_nama: "Theodorus Dedi",
    tujuan_1_kepala_nip: "",
    tujuan_1_id_type: "NIP",
    tujuan_1_berangkat_dari: "Kabupaten Kutai Barat",
    tujuan_1_berangkat_ke: "Samarinda",
    tujuan_1_berangkat_tanggal: today,
    tujuan_1_berangkat_kepala_jabatan: "Plt. Manager Camp PT. HLKL",
    tujuan_1_berangkat_kepala_nama: "Theodorus Dedi",
    tujuan_1_berangkat_kepala_nip: "",
    tujuan_1_berangkat_id_type: "NIP",

    transit_3: {},
    transit_4: {},
    transit_5: {},

    kembali_tempat: "Samarinda",
    kembali_tanggal: today,
    kembali_jabatan_pengesah: "Kepala Subbagian Tata Usaha",
    kembali_nama_pejabat: "Dheny Mardiono, S.Hut., MSc.",
    kembali_nip_pejabat: "19750314 199903 1 004",

    ppk_keterangan:
      "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
    ppk_jabatan: "Pejabat Pembuat Komitmen,",
    ppk_nama: "Ahmad Hidayat, S.PKP., M.Ling",
    ppk_nip: "19820301 200012 1 001",

    catatan_lain: "",
    perhatian_text:
      "PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian dan kealphaannya.",
  };
}

export function getTemplateDipaTenggarong(): VisumSpdData {
  const today = getTodayIndoDate();
  return {
    spd_type: "dipa",
    asal_tempat: "Tenggarong, Kab. Kukar",
    asal_tanggal: today,
    tujuan_awal: "Kec. Tenggarong Seberang",
    asal_jabatan_pengesah: "Kepala Seksi Konservasi Sumber Daya Alam Wilayah II,",
    asal_nama_pejabat: "SURIAWATI HALIM, S.Hut., M.P.",
    asal_nip_pejabat: "19751127 200003 2 001",

    tujuan_1_tempat: "Kec. Tenggarong Seberang",
    tujuan_1_tiba_tanggal: today,
    tujuan_1_kepala_jabatan: "Ketua RT. 15\nDesa Suka Maju",
    tujuan_1_kepala_nama: "SUHENDRA",
    tujuan_1_kepala_nip: "",
    tujuan_1_id_type: "NIP",
    tujuan_1_berangkat_dari: "Kec. Tenggarong Seberang",
    tujuan_1_berangkat_ke: "Tenggarong, Kab. Kukar",
    tujuan_1_berangkat_tanggal: today,
    tujuan_1_berangkat_kepala_jabatan: "Ketua RT. 15\nDesa Suka Maju",
    tujuan_1_berangkat_kepala_nama: "SUHENDRA",
    tujuan_1_berangkat_kepala_nip: "",
    tujuan_1_berangkat_id_type: "NIP",

    transit_3: {},
    transit_4: {},
    transit_5: {},

    kembali_tempat: "Tenggarong, Kab. Kukar",
    kembali_tanggal: today,
    kembali_jabatan_pengesah: "Pejabat Pembuat Komitmen,",
    kembali_nama_pejabat: "RUSMANTO, S.Hut",
    kembali_nip_pejabat: "19810907 200012 1 004",

    ppk_keterangan:
      "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
    ppk_jabatan: "Pejabat Pembuat Komitmen,",
    ppk_nama: "RUSMANTO, S.Hut",
    ppk_nip: "19810907 200012 1 004",

    catatan_lain: "",
    perhatian_text:
      "PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian dan kealphaannya.",
  };
}

export function getTemplateManual(): VisumSpdData {
  return {
    asal_tempat: "",
    asal_tanggal: "",
    tujuan_awal: "",
    asal_jabatan_pengesah: "",
    asal_nama_pejabat: "",
    asal_nip_pejabat: "",

    tujuan_1_tempat: "",
    tujuan_1_tiba_tanggal: "",
    tujuan_1_kepala_jabatan: "",
    tujuan_1_kepala_nama: "",
    tujuan_1_kepala_nip: "",
    tujuan_1_id_type: "NIP",
    tujuan_1_berangkat_dari: "",
    tujuan_1_berangkat_ke: "",
    tujuan_1_berangkat_tanggal: "",
    tujuan_1_berangkat_kepala_jabatan: "",
    tujuan_1_berangkat_kepala_nama: "",
    tujuan_1_berangkat_kepala_nip: "",
    tujuan_1_berangkat_id_type: "NIP",

    transit_3: {},
    transit_4: {},
    transit_5: {},

    kembali_tempat: "",
    kembali_tanggal: "",
    kembali_jabatan_pengesah: "",
    kembali_nama_pejabat: "",
    kembali_nip_pejabat: "",

    ppk_keterangan: "",
    ppk_jabatan: "Pejabat Pembuat Komitmen,",
    ppk_nama: "",
    ppk_nip: "",

    catatan_lain: "",
    perhatian_text: "",
  };
}

export const DEFAULT_VISUM_SPD_DATA: VisumSpdData = getTemplateKelian();

const VISUM_BASE_CSS = `
  @page {
    size: A4 portrait;
    margin: 8mm 12mm 8mm 12mm;
  }
  @page :first {
    margin-top: 6mm;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    padding: 0;
    background: white;
    color: black;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.6pt;
    line-height: 1.25;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  p {
    margin: 0;
  }
  .visum-sheet {
    width: 100%;
    max-width: 186mm;
    margin: 0 auto;
    background: transparent;
    color: black;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.6pt;
    line-height: 1.25;
  }
  .visum-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 1.5px solid #000;
  }
  .visum-table.no-border {
    border-color: transparent !important;
  }
  .visum-table td {
    border: 1px solid #000;
    vertical-align: top;
    padding: 3px 5px;
    overflow: hidden;
    height: 100%;
  }
  .visum-table.no-border td {
    border-color: transparent !important;
  }
  .cell-left {
    width: 50%;
    border-right: 1px solid #000;
  }
  .cell-right {
    width: 50%;
  }

  .visum-cell-inner {
    height: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Fixed Row Heights - Optimized to fill A4 sheet cleanly */
  .row-1 {
    height: 46mm;
  }
  .row-2 {
    height: 41mm;
  }
  .row-transit {
    height: 39mm;
  }
  .row-6 {
    height: 49mm;
  }
  .row-7 {
    height: 9mm;
  }

  .visum-header-row {
    display: flex;
    align-items: flex-start;
    gap: 3px;
  }
  .rom-num {
    font-weight: 400;
    min-width: 16px;
    font-size: 8.6pt;
  }
  .rom-num-empty {
    min-width: 16px;
  }
  .visum-header-content {
    flex: 1;
    min-width: 0;
  }
  .meta-line {
    display: flex;
    align-items: flex-start;
    font-size: 8.5pt;
    line-height: 1.22;
  }
  .meta-line .lbl {
    width: 28mm;
    flex-shrink: 0;
  }
  .meta-line .col {
    width: 3.5mm;
    flex-shrink: 0;
    text-align: center;
  }
  .meta-line .val {
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }
  .meta-sub {
    font-size: 7.6pt;
    color: #222;
    margin-top: -1px;
    margin-bottom: 2px;
  }
  .visum-divider {
    border-top: 1px solid #000;
    margin: 3px -5px 3px -5px;
  }
  .visum-table.no-border .visum-divider {
    border-top-color: transparent !important;
  }

  /* Overlay / Nilai Saja Mode: Sembunyikan garis, label, titik dua (:), dan teks statis */
  .visum-table.no-border .rom-num,
  .visum-table.no-border .rom-num-empty,
  .visum-table.no-border .lbl,
  .visum-table.no-border .lbl-vii,
  .visum-table.no-border .col,
  .visum-table.no-border .meta-sub,
  .visum-table.no-border .ppk-text {
    visibility: hidden !important;
  }
  .visum-sheet.hide-skeleton .perhatian-box {
    visibility: hidden !important;
  }

  /* Fixed Signature Boxes */
  .sig-box-i {
    height: 26mm;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 1px;
  }
  .sig-box-dest {
    height: 22mm;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    text-align: center;
    padding-bottom: 2px;
    margin-top: auto;
  }
  .sig-box-vi {
    height: 28mm;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 1px;
  }
  .sig-block {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    text-align: left;
    height: 100%;
    width: 62mm;
    max-width: 62mm;
  }
  /* Khusus DIPA: Judul jabatan satu baris tanpa turun dan nama pejabat pas di tengah */
  .sig-block.sig-block-dipa {
    width: 100% !important;
    max-width: 100% !important;
    align-items: center !important;
    text-align: center !important;
  }
  .sig-block.sig-block-dipa .sig-title {
    font-size: 7.7pt !important;
    letter-spacing: -0.15px;
    white-space: nowrap !important;
    text-align: center !important;
    width: 100% !important;
  }
  .sig-block.sig-block-dipa .sig-person {
    display: inline-flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    text-align: left !important;
    width: fit-content !important;
    max-width: 100% !important;
    margin: 0 auto !important;
  }
  .sig-block.sig-block-dipa .sig-name {
    text-align: left !important;
    width: 100% !important;
    font-size: 8.6pt !important;
    white-space: nowrap !important;
  }
  .sig-block.sig-block-dipa .sig-nip {
    text-align: left !important;
    width: 100% !important;
    font-size: 8.2pt !important;
    white-space: nowrap !important;
  }
  .sig-title {
    font-size: 8.2pt;
    line-height: 1.15;
    white-space: pre-line;
    text-align: left;
    width: 100%;
  }
  .sig-person {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  .sig-box-dest .sig-person {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
  }
  .sig-name {
    font-weight: 700;
    font-size: 8.6pt;
    line-height: 1.2;
    text-align: left;
  }
  .sig-box-dest .sig-name {
    text-align: center;
  }
  .sig-nip {
    font-size: 8.2pt;
    line-height: 1.2;
    text-align: left;
  }
  .sig-box-dest .sig-nip {
    text-align: center;
  }
  .ppk-text {
    font-size: 8.1pt;
    text-align: justify;
    line-height: 1.18;
    margin-bottom: 2px;
  }
  .cell-full {
    padding: 2px 5px;
  }
  .lbl-vii {
    font-weight: 400;
    font-size: 8.5pt;
  }
  .val-vii {
    font-size: 8.2pt;
    margin-top: 1px;
    white-space: pre-line;
  }
  .perhatian-box {
    margin-top: 4px;
    font-size: 7.8pt;
    line-height: 1.25;
    text-align: justify;
    padding: 0 2px;
  }
  .perhatian-title {
    font-weight: 400;
    margin-bottom: 1px;
  }
  .perhatian-desc {
    color: #222;
  }

  /* Overlay mode: Hide skeleton text while keeping layout geometry */
  .hide-skeleton .lbl,
  .hide-skeleton .meta-sub,
  .hide-skeleton .rom-num,
  .hide-skeleton .rom-num-empty,
  .hide-skeleton .rom-num-vii,
  .hide-skeleton .lbl-vii,
  .hide-skeleton .col,
  .hide-skeleton .ppk-text,
  .hide-skeleton .perhatian-title,
  .hide-skeleton .perhatian-desc,
  .hide-skeleton .perhatian-box {
    visibility: hidden !important;
  }
`;

export function handlePrintVisumSpd(
  documentId = "visum-spd-print-root",
  showTableBorder = true
) {
  const printContent = document.getElementById(documentId);
  if (!printContent) {
    toast.error("Elemen dokumen Visum SPD tidak ditemukan.");
    return;
  }

  // Use hidden iframe to trigger in-page print dialog without opening new tab/window
  let printFrame = document.getElementById("visum-print-iframe") as HTMLIFrameElement;
  if (!printFrame) {
    printFrame = document.createElement("iframe");
    printFrame.id = "visum-print-iframe";
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.visibility = "hidden";
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
  if (!frameDoc || !printFrame.contentWindow) {
    toast.error("Gagal menyiapkan lembar cetak.");
    return;
  }

  const skeletonClass = showTableBorder ? "" : "hide-skeleton";

  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <title>Lembar Visum SPD</title>
        <style>
          ${VISUM_BASE_CSS}
        </style>
      </head>
      <body>
        <div class="visum-sheet ${skeletonClass}">
          ${printContent.innerHTML}
        </div>
      </body>
    </html>
  `);
  frameDoc.close();

  window.setTimeout(() => {
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch {
      toast.error("Gagal memanggil fungsi cetak browser.");
    }
  }, 250);
}

export function VisumSpdDocument({
  data,
  documentId = "visum-spd-print-root",
  includeBalaiData = true,
  includeDestinationData = true,
  showTableBorder = true,
}: {
  data: VisumSpdData;
  documentId?: string;
  includeBalaiData?: boolean;
  includeDestinationData?: boolean;
  showTableBorder?: boolean;
}) {
  const d = data;

  const skeletonClass = showTableBorder ? "" : "hide-skeleton";
  const tableBorderClass = showTableBorder ? "visum-table" : "visum-table no-border";

  return (
    <div id={documentId} className={`visum-sheet ${skeletonClass}`}>
      <style>{VISUM_BASE_CSS}</style>
      <table className={tableBorderClass}>
        <tbody>
          {/* ROW I: Berangkat dari tempat kedudukan */}
          <tr className="row-1">
            <td className="cell-left"></td>
            <td className="cell-right">
              <div className="visum-header-row">
                <span className="rom-num">I.</span>
                <div className="visum-header-content">
                  <div className="meta-line">
                    <span className="lbl">Berangkat dari</span>
                    <span className="col">:</span>
                    <span className="val">{includeBalaiData ? d.asal_tempat || "" : ""}</span>
                  </div>
                  <div className="meta-sub">(Tempat Kedudukan )</div>
                  <div className="meta-line">
                    <span className="lbl">Pada Tanggal</span>
                    <span className="col">:</span>
                    <span className="val">{includeBalaiData ? d.asal_tanggal || "" : ""}</span>
                  </div>
                  <div className="meta-line">
                    <span className="lbl">Ke</span>
                    <span className="col">:</span>
                    <span className="val">{includeBalaiData ? d.tujuan_awal || "" : ""}</span>
                  </div>
                </div>
              </div>

              <div className="visum-divider"></div>

              <div className="sig-box-i">
                {includeBalaiData && (
                  (() => {
                    const isDipa = (d.spd_type || "").toLowerCase() === "dipa";
                    const cleanDepartPosition = isDipa
                      ? (d.asal_jabatan_pengesah || "")
                          .replace(/^a\.n\.\s*Kepala\s+Balai\s*\n?/i, "")
                          .replace(/^a\.n\.\s*Kepala\s+Balai,?\s*/i, "")
                          .replace(/\n+/g, " ")
                          .trim()
                      : d.asal_jabatan_pengesah || "";

                    return (
                      <div className={`sig-block ${isDipa ? "sig-block-dipa" : ""}`}>
                        <div className="sig-title" title={cleanDepartPosition}>
                          {cleanDepartPosition}
                        </div>
                        <div className="sig-person">
                          <div className="sig-name">{d.asal_nama_pejabat || ""}</div>
                          {d.asal_nip_pejabat && (
                            <div className="sig-nip">
                              {d.asal_nip_pejabat.startsWith("NIP")
                                ? d.asal_nip_pejabat
                                : `NIP. ${d.asal_nip_pejabat}`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </td>
          </tr>

          {/* ROW II: Tiba di tujuan & Berangkat kembali */}
          <tr className="row-2">
            {/* II. Kiri: Tiba di */}
            <td className="cell-left">
              <div className="visum-cell-inner">
                <div className="visum-header-row">
                  <span className="rom-num">II.</span>
                  <div className="visum-header-content">
                    <div className="meta-line">
                      <span className="lbl">Tiba di</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.tujuan_1_tempat || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Pada Tanggal</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.tujuan_1_tiba_tanggal || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Kepala</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.tujuan_1_kepala_jabatan || "" : ""}</span>
                    </div>
                    <div className="meta-line" style={{ visibility: "hidden" }} aria-hidden="true">
                      <span className="lbl">&nbsp;</span>
                      <span className="col">&nbsp;</span>
                      <span className="val">&nbsp;</span>
                    </div>
                  </div>
                </div>

                <div className="sig-box-dest">
                  {includeDestinationData && (
                    <div className="sig-person">
                      <div className="sig-name">{d.tujuan_1_kepala_nama || ""}</div>
                      {d.tujuan_1_kepala_nip ? (
                        <div className="sig-nip">
                          {d.tujuan_1_kepala_nip.startsWith("NIP") || d.tujuan_1_kepala_nip.startsWith("NIK")
                            ? d.tujuan_1_kepala_nip
                            : `${d.tujuan_1_id_type || "NIP"}. ${d.tujuan_1_kepala_nip}`}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </td>

            {/* II. Kanan: Berangkat dari */}
            <td className="cell-right">
              <div className="visum-cell-inner">
                <div className="visum-header-row">
                  <span className="rom-num-empty"></span>
                  <div className="visum-header-content">
                    <div className="meta-line">
                      <span className="lbl">Berangkat Dari</span>
                      <span className="col">:</span>
                      <span className="val">
                        {includeDestinationData ? d.tujuan_1_berangkat_dari || "" : ""}
                      </span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Ke</span>
                      <span className="col">:</span>
                      <span className="val">
                        {includeDestinationData ? d.tujuan_1_berangkat_ke || "" : ""}
                      </span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Pada Tanggal</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.tujuan_1_berangkat_tanggal || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Kepala</span>
                      <span className="col">:</span>
                      <span className="val">
                        {includeDestinationData ? d.tujuan_1_berangkat_kepala_jabatan || "" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sig-box-dest">
                  {includeDestinationData && (
                    <div className="sig-person">
                      <div className="sig-name">
                        {d.tujuan_1_berangkat_kepala_nama || ""}
                      </div>
                      {d.tujuan_1_berangkat_kepala_nip ? (
                        <div className="sig-nip">
                          {(() => {
                            const val = d.tujuan_1_berangkat_kepala_nip;
                            if (val.startsWith("NIP") || val.startsWith("NIK")) return val;
                            const prefix = d.tujuan_1_berangkat_id_type || "NIP";
                            return `${prefix}. ${val}`;
                          })()}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>

          {/* ROW III: Transit / Destinasi 2 */}
          <tr className="row-transit">
            <td className="cell-left">
              <div className="visum-cell-inner">
                <div className="visum-header-row">
                  <span className="rom-num">III.</span>
                  <div className="visum-header-content">
                    <div className="meta-line">
                      <span className="lbl">Tiba di</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_3?.tiba_di || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Pada Tanggal</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_3?.tiba_tanggal || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Kepala</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_3?.tiba_kepala_jabatan || "" : ""}</span>
                    </div>
                    <div className="meta-line" style={{ visibility: "hidden" }} aria-hidden="true">
                      <span className="lbl">&nbsp;</span>
                      <span className="col">&nbsp;</span>
                      <span className="val">&nbsp;</span>
                    </div>
                  </div>
                </div>
                <div className="sig-box-dest">
                  {includeDestinationData && d.transit_3?.tiba_kepala_nama && (
                    <div className="sig-person">
                      <div className="sig-name">{d.transit_3.tiba_kepala_nama}</div>
                      {d.transit_3.tiba_kepala_nip ? (
                        <div className="sig-nip">
                          {d.transit_3.tiba_kepala_nip.startsWith("NIP") || d.transit_3.tiba_kepala_nip.startsWith("NIK")
                            ? d.transit_3.tiba_kepala_nip
                            : `${d.transit_3.tiba_id_type || "NIP"}. ${d.transit_3.tiba_kepala_nip}`}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="cell-right">
              <div className="visum-cell-inner">
                <div className="visum-header-row">
                  <span className="rom-num-empty"></span>
                  <div className="visum-header-content">
                    <div className="meta-line">
                      <span className="lbl">Berangkat Dari</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_3?.berangkat_dari || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Ke</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_3?.berangkat_ke || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Pada Tanggal</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_3?.berangkat_tanggal || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Kepala</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_3?.berangkat_kepala_jabatan || "" : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="sig-box-dest">
                  {includeDestinationData && d.transit_3?.berangkat_kepala_nama && (
                    <div className="sig-person">
                      <div className="sig-name">{d.transit_3.berangkat_kepala_nama}</div>
                      {d.transit_3.berangkat_kepala_nip ? (
                        <div className="sig-nip">
                          {d.transit_3.berangkat_kepala_nip.startsWith("NIP") || d.transit_3.berangkat_kepala_nip.startsWith("NIK")
                            ? d.transit_3.berangkat_kepala_nip
                            : `${d.transit_3.berangkat_id_type || "NIP"}. ${d.transit_3.berangkat_kepala_nip}`}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>

          {/* ROW IV: Transit / Destinasi 3 */}
          <tr className="row-transit">
            <td className="cell-left">
              <div className="visum-cell-inner">
                <div className="visum-header-row">
                  <span className="rom-num">IV.</span>
                  <div className="visum-header-content">
                    <div className="meta-line">
                      <span className="lbl">Tiba di</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_4?.tiba_di || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Pada Tanggal</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_4?.tiba_tanggal || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Kepala</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_4?.tiba_kepala_jabatan || "" : ""}</span>
                    </div>
                    <div className="meta-line" style={{ visibility: "hidden" }} aria-hidden="true">
                      <span className="lbl">&nbsp;</span>
                      <span className="col">&nbsp;</span>
                      <span className="val">&nbsp;</span>
                    </div>
                  </div>
                </div>
                <div className="sig-box-dest">
                  {includeDestinationData && d.transit_4?.tiba_kepala_nama && (
                    <div className="sig-person">
                      <div className="sig-name">{d.transit_4.tiba_kepala_nama}</div>
                      {d.transit_4.tiba_kepala_nip ? (
                        <div className="sig-nip">
                          {d.transit_4.tiba_kepala_nip.startsWith("NIP") || d.transit_4.tiba_kepala_nip.startsWith("NIK")
                            ? d.transit_4.tiba_kepala_nip
                            : `${d.transit_4.tiba_id_type || "NIP"}. ${d.transit_4.tiba_kepala_nip}`}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="cell-right">
              <div className="visum-cell-inner">
                <div className="visum-header-row">
                  <span className="rom-num-empty"></span>
                  <div className="visum-header-content">
                    <div className="meta-line">
                      <span className="lbl">Berangkat Dari</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_4?.berangkat_dari || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Ke</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_4?.berangkat_ke || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Pada Tanggal</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_4?.berangkat_tanggal || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Kepala</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_4?.berangkat_kepala_jabatan || "" : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="sig-box-dest">
                  {includeDestinationData && d.transit_4?.berangkat_kepala_nama && (
                    <div className="sig-person">
                      <div className="sig-name">{d.transit_4.berangkat_kepala_nama}</div>
                      {d.transit_4.berangkat_kepala_nip ? (
                        <div className="sig-nip">
                          {d.transit_4.berangkat_kepala_nip.startsWith("NIP") || d.transit_4.berangkat_kepala_nip.startsWith("NIK")
                            ? d.transit_4.berangkat_kepala_nip
                            : `${d.transit_4.berangkat_id_type || "NIP"}. ${d.transit_4.berangkat_kepala_nip}`}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>

          {/* ROW V: Transit / Destinasi 4 */}
          <tr className="row-transit">
            <td className="cell-left">
              <div className="visum-cell-inner">
                <div className="visum-header-row">
                  <span className="rom-num">V.</span>
                  <div className="visum-header-content">
                    <div className="meta-line">
                      <span className="lbl">Tiba di</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_5?.tiba_di || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Pada Tanggal</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_5?.tiba_tanggal || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Kepala</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_5?.tiba_kepala_jabatan || "" : ""}</span>
                    </div>
                    <div className="meta-line" style={{ visibility: "hidden" }} aria-hidden="true">
                      <span className="lbl">&nbsp;</span>
                      <span className="col">&nbsp;</span>
                      <span className="val">&nbsp;</span>
                    </div>
                  </div>
                </div>
                <div className="sig-box-dest">
                  {includeDestinationData && d.transit_5?.tiba_kepala_nama && (
                    <div className="sig-person">
                      <div className="sig-name">{d.transit_5.tiba_kepala_nama}</div>
                      {d.transit_5.tiba_kepala_nip ? (
                        <div className="sig-nip">
                          {d.transit_5.tiba_kepala_nip.startsWith("NIP") || d.transit_5.tiba_kepala_nip.startsWith("NIK")
                            ? d.transit_5.tiba_kepala_nip
                            : `${d.transit_5.tiba_id_type || "NIP"}. ${d.transit_5.tiba_kepala_nip}`}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="cell-right">
              <div className="visum-cell-inner">
                <div className="visum-header-row">
                  <span className="rom-num-empty"></span>
                  <div className="visum-header-content">
                    <div className="meta-line">
                      <span className="lbl">Berangkat Dari</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_5?.berangkat_dari || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Ke</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_5?.berangkat_ke || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Pada Tanggal</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_5?.berangkat_tanggal || "" : ""}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Kepala</span>
                      <span className="col">:</span>
                      <span className="val">{includeDestinationData ? d.transit_5?.berangkat_kepala_jabatan || "" : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="sig-box-dest">
                  {includeDestinationData && d.transit_5?.berangkat_kepala_nama && (
                    <div className="sig-person">
                      <div className="sig-name">{d.transit_5.berangkat_kepala_nama}</div>
                      {d.transit_5.berangkat_kepala_nip ? (
                        <div className="sig-nip">
                          {d.transit_5.berangkat_kepala_nip.startsWith("NIP") || d.transit_5.berangkat_kepala_nip.startsWith("NIK")
                            ? d.transit_5.berangkat_kepala_nip
                            : `${d.transit_5.berangkat_id_type || "NIP"}. ${d.transit_5.berangkat_kepala_nip}`}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>

          {/* ROW VI: Tiba kembali di tempat kedudukan & Pengesahan PPK */}
          <tr className="row-6">
            {/* VI. Kiri: Tiba kembali */}
            <td className="cell-left">
              <div className="visum-header-row">
                <span className="rom-num">VI.</span>
                <div className="visum-header-content">
                  <div className="meta-line">
                    <span className="lbl">Tiba di</span>
                    <span className="col">:</span>
                    <span className="val">{includeBalaiData ? d.kembali_tempat || "" : ""}</span>
                  </div>
                  <div className="meta-sub">(Tempat kedudukan)</div>
                  <div className="meta-line">
                    <span className="lbl">Pada tanggal</span>
                    <span className="col">:</span>
                    <span className="val">{includeBalaiData ? d.kembali_tanggal || "" : ""}</span>
                  </div>
                </div>
              </div>

              <div className="sig-box-vi">
                {includeBalaiData && (
                  <div className="sig-block">
                    <div className="sig-title">
                      {d.kembali_jabatan_pengesah || ""}
                    </div>
                    <div className="sig-person">
                      <div className="sig-name">{d.kembali_nama_pejabat || ""}</div>
                      {d.kembali_nip_pejabat && (
                        <div className="sig-nip">
                          {d.kembali_nip_pejabat.startsWith("NIP")
                            ? d.kembali_nip_pejabat
                            : `NIP. ${d.kembali_nip_pejabat}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </td>

            {/* VI. Kanan: Pengesahan PPK */}
            <td className="cell-right">
              <div className="ppk-text">
                {d.ppk_keterangan ||
                  "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya."}
              </div>

              <div className="sig-box-vi">
                {includeBalaiData && (
                  <div className="sig-block">
                    <div className="sig-title ppk-title">
                      {d.ppk_jabatan || "Pejabat Pembuat Komitmen,"}
                    </div>
                    <div className="sig-person">
                      <div className="sig-name">{d.ppk_nama || ""}</div>
                      {d.ppk_nip && (
                        <div className="sig-nip">
                          {d.ppk_nip.startsWith("NIP") ? d.ppk_nip : `NIP. ${d.ppk_nip}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </td>
          </tr>

          {/* ROW VII: Catatan lain-lain */}
          <tr className="row-7">
            <td colSpan={2} className="cell-full">
              <div className="visum-header-row">
                <span className="rom-num rom-num-vii">VII.</span>
                <div className="visum-header-content">
                  <span className="lbl-vii">Catatan lain-lain</span>
                  <div className="val-vii">{d.catatan_lain || ""}</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ROW VIII: Perhatian */}
      <div className="perhatian-box">
        <div className="perhatian-title">VIII. Perhatian</div>
        <div className="perhatian-desc">
          {d.perhatian_text ||
            "PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian dan kealphaannya."}
        </div>
      </div>
    </div>
  );
}
