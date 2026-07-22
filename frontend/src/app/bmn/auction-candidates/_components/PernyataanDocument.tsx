"use client";

import type { ReactNode } from "react";
import { formatDateLong } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";

interface PernyataanDocumentProps {
  /** DOM id used as both the print root id and the scoped style class. */
  rootId: string;
  /** Document title rendered in the centered heading (e.g. "SURAT PERNYATAAN"). */
  title: string;
  /** Fully-built "Nomor" string shown beneath the title. */
  nomorText: string;
  /** Date used in the signature block; defaults to now. */
  today?: Date;
  kepalaBalai: SkKepalaBalai;
  /** Document body (the paragraphs/list unique to each pernyataan). */
  children: ReactNode;
}

/**
 * Shared shell for the BMN "Surat Pernyataan" family. Renders the scoped print
 * styles, KOP header, centered title + nomor, the body, and the Kepala Balai
 * signature block. The identity block lives in {@link PernyataanIdentity}.
 */
export function PernyataanDocument({
  rootId,
  title,
  nomorText,
  today = new Date(),
  kepalaBalai,
  children,
}: PernyataanDocumentProps) {
  return (
    <div id={rootId} className={rootId}>
      <style jsx global>{`
        .${rootId} .doc-editable { outline: none; border-bottom: 1px dashed transparent; transition: border-bottom-color 0.15s ease; }
        .${rootId} .doc-editable:hover { border-bottom-color: #94a3b8; }
        .${rootId} .doc-editable:focus { border-bottom-color: #64748b; }
        @media print {
          @page { size: A4; margin: 20mm 0 28mm 0; }
          @page :first { margin-top: 0; }
          body * { visibility: hidden; }
          .${rootId}, .${rootId} * { visibility: visible; }
          .${rootId} {
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
          .signature { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <article
        className="doc-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.4" }}
      >
        <div className="doc-header -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-new.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="doc-title mt-2 text-center font-bold leading-snug">
          <p className="m-0">{title}</p>
          <p className="m-0 font-normal">Nomor : {nomorText}</p>
        </div>

        <div className="doc-body doc-text-block mx-auto mt-4 w-[166mm] space-y-3 text-justify">
          {children}
        </div>

        <div className="signature mt-6 ml-auto w-80">
          <p className="m-0">Samarinda, {formatDateLong(today)}</p>
          <p className="m-0">Kepala Balai,</p>
          <div className="ttd-placeholder mt-8 box-border h-28 pt-10 pl-[1.35cm] text-zinc-400"></div>
          <p contentEditable suppressContentEditableWarning className="doc-editable m-0">{kepalaBalai.nama}</p>
          <p contentEditable suppressContentEditableWarning className="doc-editable m-0">NIP. {kepalaBalai.nip}</p>
        </div>
      </article>
    </div>
  );
}

/**
 * The "Yang bertanda tangan di bawah ini" identity grid shared by every
 * surat-pernyataan document.
 */
export function PernyataanIdentity({ kepalaBalai }: { kepalaBalai: SkKepalaBalai }) {
  return (
    <div className="doc-identity grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
      <span>Nama</span>
      <span className="colon text-center">:</span>
      <span contentEditable suppressContentEditableWarning className="doc-editable">{kepalaBalai.nama}</span>
      <span>NIP</span>
      <span className="colon text-center">:</span>
      <span contentEditable suppressContentEditableWarning className="doc-editable">{kepalaBalai.nip}</span>
      <span>Pangkat/Gol</span>
      <span className="colon text-center">:</span>
      <span contentEditable suppressContentEditableWarning className="doc-editable">Pembina Tk.I / IV b</span>
      <span>Jabatan</span>
      <span className="colon text-center">:</span>
      <span contentEditable suppressContentEditableWarning className="doc-editable">Kepala Balai KSDA Kalimantan Timur</span>
    </div>
  );
}
