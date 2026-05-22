"use client";

import { toast } from "sonner";
import { getSpelledDate } from "../_lib/auction-helpers";
import type { PemeriksaAnggota } from "../_lib/pemeriksa-defaults";

interface BaPemeriksaanDocumentProps {
  number: string;
  pemeriksaList: PemeriksaAnggota[];
  stNumber: string;
  stTanggal: string;
}

function buildNomorText(number: string, today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `BA.${number.trim() || "158"}/K.18/TU/KAP.06.01/${month}/${today.getFullYear()}`;
}

export function handlePrintBaPemeriksaan() {
  const printContent = document.getElementById("ba-pemeriksaan-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen Berita Acara Pemeriksaan untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Berita Acara Pemeriksaan BMN</title>
        <style>
          @page { size: A4; margin: 0 0 28mm 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0; background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.5;
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
          .pemeriksa-list { margin-top: 0.5rem; }
          .pemeriksa-item { display: grid; grid-template-columns: 8mm minmax(0, 1fr); column-gap: 0; }
          .pemeriksa-item + .pemeriksa-item { margin-top: 0.5rem; }
          .pemeriksa-row { display: grid; grid-template-columns: 28mm 5mm minmax(0, 1fr); column-gap: 0; }
          .pemeriksa-row .colon { text-align: center; }
          .doc-editable { outline: none; border-bottom: none !important; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function BaPemeriksaanDocument({
  number,
  pemeriksaList,
  stNumber,
  stTanggal,
}: BaPemeriksaanDocumentProps) {
  const today = new Date();
  const nomorText = buildNomorText(number, today);
  const { day, dateText, month, yearText } = getSpelledDate(today);

  return (
    <div id="ba-pemeriksaan-print-root" className="ba-pemeriksaan-print-root">
      <style jsx global>{`
        .ba-pemeriksaan-print-root .doc-editable { outline: none; border-bottom: 1px dashed transparent; transition: border-bottom-color 0.15s ease; }
        .ba-pemeriksaan-print-root .doc-editable:hover { border-bottom-color: #94a3b8; }
        .ba-pemeriksaan-print-root .doc-editable:focus { border-bottom-color: #64748b; }
        @media print {
          @page { size: A4; margin: 0 0 28mm 0; }
          body * { visibility: hidden; }
          .ba-pemeriksaan-print-root, .ba-pemeriksaan-print-root * { visibility: visible; }
          .ba-pemeriksaan-print-root {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.5; margin: 0; padding: 0;
          }
          .doc-page { width: 210mm; margin: 0 auto; padding: 5mm 20mm 0; box-shadow: none !important; }
          .doc-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; }
          .doc-header img { max-width: 196mm !important; }
          .doc-body { width: 166mm; margin-left: auto; margin-right: auto; }
          .doc-editable { border-bottom: none !important; }
          .pemeriksa-item { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <article
        className="doc-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.5" }}
      >
        <div className="doc-header -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-new.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="doc-title mt-2 text-center font-bold leading-snug">
          <p className="m-0">BERITA ACARA PEMERIKSAAN BARANG MILIK NEGARA</p>
          <p className="m-0">BERUPA ALAT ANGKUTAN BERMOTOR</p>
          <p className="m-0 font-normal">Nomor : {nomorText}</p>
        </div>

        <div className="doc-body doc-text-block mx-auto mt-4 w-[166mm] space-y-3 text-justify">
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Pada hari ini {day} tanggal {dateText} bulan {month} tahun {yearText}, kami yang bertanda tangan di bawah ini :
          </p>

          <div className="pemeriksa-list">
            {pemeriksaList.length === 0 ? (
              <p className="text-center text-zinc-400" style={{ color: "#94a3b8" }}>
                Belum ada pemeriksa. Silakan tambah pemeriksa.
              </p>
            ) : (
              pemeriksaList.map((p, index) => (
                <div className="pemeriksa-item grid grid-cols-[8mm_minmax(0,1fr)]" key={p.id}>
                  <span>{index + 1}.</span>
                  <div>
                    <div className="pemeriksa-row grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
                      <span>Nama</span>
                      <span className="colon text-center">:</span>
                      <span>{p.nama}</span>
                    </div>
                    <div className="pemeriksa-row grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
                      <span>NIP</span>
                      <span className="colon text-center">:</span>
                      <span>{p.nip}</span>
                    </div>
                    <div className="pemeriksa-row grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
                      <span>Jabatan</span>
                      <span className="colon text-center">:</span>
                      <span>{p.jabatan}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Telah melaksanakan tugas pemeriksaan secara administrasi, teknis tentang kondisi dan nilai taksiran Barang Milik Negara berupa Alat Angkutan Bermotor yang berada pada Balai Konservasi Sumber Daya Alam Kalimantan Timur sesuai dengan Surat Tugas Nomor : {stNumber || "____"}, tanggal {stTanggal || "____"} sebagaimana terlampir.
          </p>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Demikian Berita Acara Pemeriksaan ini dibuat dengan sebenarnya, ditandatangani oleh masing-masing pemeriksa.
          </p>
        </div>
      </article>
    </div>
  );
}
