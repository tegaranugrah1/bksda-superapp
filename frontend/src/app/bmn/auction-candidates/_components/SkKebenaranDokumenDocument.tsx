"use client";

import { toast } from "sonner";
import { printDocumentWindow, SK_KEBENARAN_PRINT_CSS } from "../_lib/print-helpers";
import type { AuctionAsset } from "../_lib/auction-helpers";
import { formatDateLong, parseDocDate, EMPTY_DOC_NUMBER_GAP } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";
import type { PernyataanDocumentContent } from "../../auction-batches/_lib/document-content-defaults";

interface SkKebenaranDokumenDocumentProps {
  number: string;
  kap: string;
  date?: string;
  assets: AuctionAsset[];
  kepalaBalai: SkKepalaBalai;
  content?: PernyataanDocumentContent;
}

function buildNomorText(number: string, kap: string, today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `KT.${number.trim() || EMPTY_DOC_NUMBER_GAP}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${month}/${today.getFullYear()}`;
}

function getOwnershipDocumentNumber(asset: AuctionAsset) {
  return asset.no_bpkp || asset.no_dokumen || asset.no_sertifikat || asset.no_identitas || "";
}

export function handlePrintSkKebenaran() {
  printDocumentWindow({
    rootId: "sk-kebenaran-print-root",
    title: "Surat Keterangan Kebenaran Fotokopi Dokumen Kepemilikan",
    emptyMessage: "Tidak ada dokumen Surat Keterangan Kebenaran Fotokopi untuk dicetak.",
    styles: SK_KEBENARAN_PRINT_CSS,
  });
}

export function SkKebenaranDokumenDocument({ number, kap, date, assets, kepalaBalai, content }: SkKebenaranDokumenDocumentProps) {
  const docDate = parseDocDate(date);
  const nomorText = buildNomorText(number, kap, docDate);

  return (
    <div id="sk-kebenaran-print-root" className="sk-kebenaran-print-root">
      <style jsx global>{`
        .sk-kebenaran-print-root .doc-editable { outline: none; border-bottom: 1px dashed transparent; transition: border-bottom-color 0.15s ease; }
        .sk-kebenaran-print-root .doc-editable:hover { border-bottom-color: #94a3b8; }
        .sk-kebenaran-print-root .doc-editable:focus { border-bottom-color: #64748b; }
        .sk-kebenaran-print-root table.kebenaran-table { border-collapse: collapse; width: 100%; font-size: 9pt; text-align: center; }
        .sk-kebenaran-print-root table.kebenaran-table th,
        .sk-kebenaran-print-root table.kebenaran-table td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
        @media print {
          @page { size: A4; margin: 20mm 0 28mm 0; }
          @page :first { margin-top: 0; }
          body * { visibility: hidden; }
          .sk-kebenaran-print-root, .sk-kebenaran-print-root * { visibility: visible; }
          .sk-kebenaran-print-root {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.4; margin: 0; padding: 0;
          }
          .doc-page { width: 210mm; margin: 0 auto; padding: 5mm 20mm 0; box-shadow: none !important; }
          .doc-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; }
          .doc-header img { max-width: 196mm !important; }
          .doc-body { width: 166mm; margin-left: auto; margin-right: auto; }
          .doc-editable { border-bottom: none !important; }
          table.kebenaran-table tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <article
        className="doc-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.4" }}
      >
        <div className="doc-header -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-paling-baru.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="doc-title mt-2 text-center font-bold leading-snug">
          <p className="m-0">SURAT KETERANGAN</p>
          <p className="m-0">KEBENARAN FOTOKOPI DOKUMEN KEPEMILIKAN ATAU DOKUMEN LAIN</p>
          <p className="m-0">YANG SETARA DENGAN BUKTI KEPEMILIKAN BARANG MILIK NEGARA</p>
          <p className="m-0">SELAIN TANAH DAN/ATAU BANGUNAN</p>
          <p className="m-0 font-normal">Nomor : {nomorText}</p>
        </div>

        <div className="doc-body doc-text-block mx-auto mt-4 w-[166mm] space-y-3 text-justify">
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Yang bertanda tangan di bawah ini :
          </p>
          <div className="doc-identity grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
            <span>Nama</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">{kepalaBalai.nama}</span>
            <span>NIP</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">{kepalaBalai.nip}</span>
            <span>Pangkat/Gol</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">Pembina Muda Tk.I / IV b</span>
            <span>Jabatan</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">Kepala Balai KSDA Kalimantan Timur</span>
          </div>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            {content?.pembuka || "Dengan ini menerangkan bahwa :"}
          </p>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Fotokopi dokumen kepemilikan Kendaraan Bermotor atau dokumen lain yang setara dengan bukti kepemilikan :
          </p>

          <table className="kebenaran-table mt-2">
            <thead>
              <tr>
                <th style={{ width: "8%" }}>No.</th>
                <th style={{ width: "20%" }}>Nomor Dokumen Kepemilikan</th>
                <th style={{ width: "20%" }}>Merk/Tipe/Jenis</th>
                <th style={{ width: "16%" }}>Nomor Mesin</th>
                <th style={{ width: "20%" }}>Nomor Rangka</th>
                <th style={{ width: "16%" }}>Nomor Polisi</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>
                    Belum ada aset terpilih.
                  </td>
                </tr>
              ) : (
                assets.map((asset, index) => (
                  <tr key={asset.id}>
                    <td>{index + 1}.</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{getOwnershipDocumentNumber(asset)}</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.merk_tipe || ""}</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.no_mesin || ""}</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.no_rangka || ""}</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.no_polisi || ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Adalah benar sesuai dengan aslinya.
          </p>
          <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
            <p contentEditable suppressContentEditableWarning className="doc-editable whitespace-pre-line">
              {content?.penutup || "Demikian keterangan ini kami buat dengan sebenar-benarnya dalam rangka permohonan Persetujuan Pemindahtanganan BMN dengan Penjualan."}
            </p>

            <div className="signature mt-4 ml-auto w-80">
          <p className="m-0">Samarinda, {formatDateLong(docDate)}</p>
          <p className="m-0">Kepala Balai,</p>
          <div className="ttd-placeholder my-2 flex h-21 items-center pt-0 pl-[1.1cm] box-border text-zinc-400">${"{ttd_pengirim}"}</div>
          <p contentEditable suppressContentEditableWarning className="doc-editable m-0 mt-2">{kepalaBalai.nama}</p>
          <p contentEditable suppressContentEditableWarning className="doc-editable m-0">NIP. {kepalaBalai.nip}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
