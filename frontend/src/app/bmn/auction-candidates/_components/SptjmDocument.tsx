"use client";

import { parseDocDate } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";
import type { PernyataanDocumentContent } from "../../auction-batches/_lib/document-content-defaults";
import { buildPernyataanNomor, printPernyataan } from "../_lib/print-pernyataan";
import { PernyataanDocument, PernyataanIdentity } from "./PernyataanDocument";

interface SptjmDocumentProps {
  number: string;
  kap: string;
  date?: string;
  kepalaBalai: SkKepalaBalai;
  content?: PernyataanDocumentContent;
}

const ROOT_ID = "sptjm-print-root";

export function handlePrintSptjm() {
  printPernyataan({
    rootId: ROOT_ID,
    title: "Surat Pernyataan Tanggung Jawab Mutlak",
    emptyMessage: "Tidak ada dokumen SPTJM untuk dicetak.",
  });
}

export function SptjmDocument({ number, kap, date, kepalaBalai, content }: SptjmDocumentProps) {
  const docDate = parseDocDate(date);
  const nomorText = buildPernyataanNomor("SPTJM", number, kap, docDate);

  const poinList = content?.poin && content.poin.length > 0 ? content.poin : [
    {
      id: "1",
      text: "Bertanggung jawab secara penuh atas kebenaran permohonan yang diajukan baik materiil maupun formil;",
    },
    {
      id: "2",
      text: "Bahwa Barang Milik Negara yang diusulkan pemindahtanganan dengan penjualan dalam kondisi rusak berat, tidak dapat digunakan dan dimanfaatkan lagi sehingga Barang Milik Negara dimaksud harus dilakukan penghapusan berdasarkan ketentuan perundangan yang berlaku.",
    },
  ];

  return (
    <PernyataanDocument
      rootId={ROOT_ID}
      title="SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK"
      nomorText={nomorText}
      today={docDate}
      kepalaBalai={kepalaBalai}
    >
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        Yang bertanda tangan dibawah ini :
      </p>
      <PernyataanIdentity kepalaBalai={kepalaBalai} />
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        {content?.pembuka || "Dengan ini menyatakan sebagai berikut :"}
      </p>
      <ol className="doc-list space-y-2">
        {poinList.map((item, index) => (
          <li key={item.id || index} className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
            <span>{index + 1}.</span>
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
