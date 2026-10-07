"use client";

import { parseDocDate } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";
import type { PernyataanDocumentContent } from "../../auction-batches/_lib/document-content-defaults";
import { buildPernyataanNomor, printPernyataan } from "../_lib/print-pernyataan";
import { PernyataanDocument, PernyataanIdentity } from "./PernyataanDocument";

interface SptjLimitDocumentProps {
  number: string;
  kap: string;
  date?: string;
  kepalaBalai: SkKepalaBalai;
  content?: PernyataanDocumentContent;
}

const ROOT_ID = "sptj-limit-print-root";

export function handlePrintSptjLimit() {
  printPernyataan({
    rootId: ROOT_ID,
    title: "Surat Pernyataan Tanggung Jawab Nilai Limit",
    emptyMessage: "Tidak ada dokumen Surat Pernyataan Tanggung Jawab Nilai Limit untuk dicetak.",
  });
}

export function SptjLimitDocument({ number, kap, date, kepalaBalai, content }: SptjLimitDocumentProps) {
  const docDate = parseDocDate(date);
  const nomorText = buildPernyataanNomor("SM", number, kap, docDate);

  const poinList = content?.poin && content.poin.length > 0 ? content.poin : [
    {
      id: "1",
      text: "Bertanggungjawab secara penuh atas kebenaran nilai limit yang kami ajukan dalam rangka penjualan, yang bukan merupakan nilai wajar hasil inventarisasi dan penilaian.",
    },
    {
      id: "2",
      text: "Perhitungan nilai limit sebagaimana dimaksud pada angka 1 (satu), prinsip efisien, efektif dan menghasilkan manfaat yang optimal bagi negara (antara lain penurunan nilai barang dimaksud apabila tidak dilakukan penghapusan/pemindahtanganan, potensi biaya pemeliharaan yang harus dikeluarkan, ketersediaan ruangan yang sudah tidak memadai dan sebagainya).",
    },
  ];

  return (
    <PernyataanDocument
      rootId={ROOT_ID}
      title="SURAT PERNYATAAN TANGGUNG JAWAB NILAI LIMIT"
      nomorText={nomorText}
      today={docDate}
      kepalaBalai={kepalaBalai}
    >
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        Yang bertanda tangan di bawah ini :
      </p>
      <PernyataanIdentity kepalaBalai={kepalaBalai} />
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        {content?.pembuka || "Dengan ini menyatakan sebagai berikut :"}
      </p>
      <ol className="doc-list space-y-2">
        {poinList.map((item, index) => (
          <li key={item.id || index} className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
            <span className="marker">{index + 1}.</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable text text-justify whitespace-pre-line">
              {item.text}
            </span>
          </li>
        ))}
      </ol>
      <p contentEditable suppressContentEditableWarning className="doc-editable whitespace-pre-line">
        {content?.penutup || "Demikian pernyataan ini kami buat dengan keadaan sebenarnya untuk dapat dipergunakan sebagaimana mestinya."}
      </p>
    </PernyataanDocument>
  );
}
