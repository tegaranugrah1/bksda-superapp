"use client";

import { parseDocDate } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";
import type { PernyataanDocumentContent } from "../../auction-batches/_lib/document-content-defaults";
import { buildPernyataanNomor, printPernyataan } from "../_lib/print-pernyataan";
import { PernyataanDocument, PernyataanIdentity } from "./PernyataanDocument";

interface SpTugasDocumentProps {
  number: string;
  kap: string;
  date?: string;
  kepalaBalai: SkKepalaBalai;
  content?: PernyataanDocumentContent;
}

const ROOT_ID = "sp-tugas-print-root";

export function handlePrintSpTugas() {
  printPernyataan({
    rootId: ROOT_ID,
    title: "Surat Pernyataan Tidak Mengganggu Kelancaran Tugas",
    emptyMessage: "Tidak ada dokumen Surat Pernyataan Kelancaran Tugas untuk dicetak.",
  });
}

export function SpTugasDocument({ number, kap, date, kepalaBalai, content }: SpTugasDocumentProps) {
  const docDate = parseDocDate(date);
  const nomorText = buildPernyataanNomor("SM", number, kap, docDate);

  const poinList = content?.poin && content.poin.length > 0 ? content.poin : [
    {
      id: "1",
      text: "Barang Milik Negara yang akan dipindahtangankan dengan penjualan tidak mengganggu kelancaran tugas dinas operasional maupun administrasi.",
    },
  ];

  return (
    <PernyataanDocument
      rootId={ROOT_ID}
      title="SURAT PERNYATAAN"
      nomorText={nomorText}
      today={docDate}
      kepalaBalai={kepalaBalai}
    >
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        Yang bertanda tangan di bawah ini :
      </p>
      <PernyataanIdentity kepalaBalai={kepalaBalai} />
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        {content?.pembuka || "Dengan ini menyatakan bahwa dalam rangka kegiatan Penghapusan Barang Milik Negara (BMN) berupa Alat Angkutan Bermotor di lingkungan Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur, saya selaku Kepala Balai menyatakan bahwa:"}
      </p>
      <ol className="doc-list space-y-2">
        {poinList.map((item, index) => (
          <li key={item.id || index} className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
            <span className="marker">{poinList.length > 1 ? `${index + 1}.` : "-"}</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable text text-justify whitespace-pre-line">
              {item.text}
            </span>
          </li>
        ))}
      </ol>
      <p contentEditable suppressContentEditableWarning className="doc-editable whitespace-pre-line">
        {content?.penutup || "Demikian surat pernyataan ini dibuat dengan sebenarnya, untuk dapat dipergunakan sebagaimana mestinya."}
      </p>
    </PernyataanDocument>
  );
}
