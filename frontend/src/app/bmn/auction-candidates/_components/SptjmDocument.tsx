"use client";

import { parseDocDate } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";
import { buildPernyataanNomor, printPernyataan } from "../_lib/print-pernyataan";
import { PernyataanDocument, PernyataanIdentity } from "./PernyataanDocument";

interface SptjmDocumentProps {
  number: string;
  kap: string;
  date?: string;
  kepalaBalai: SkKepalaBalai;
}

const ROOT_ID = "sptjm-print-root";

export function handlePrintSptjm() {
  printPernyataan({
    rootId: ROOT_ID,
    title: "Surat Pernyataan Tanggung Jawab Mutlak",
    emptyMessage: "Tidak ada dokumen SPTJM untuk dicetak.",
  });
}

export function SptjmDocument({ number, kap, date, kepalaBalai }: SptjmDocumentProps) {
  const docDate = parseDocDate(date);
  const nomorText = buildPernyataanNomor("SPTJM", number, kap, docDate);

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
        Dengan ini menyatakan sebagai berikut :
      </p>
      <ol className="doc-list space-y-2">
        <li className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
          <span>1.</span>
          <span contentEditable suppressContentEditableWarning className="doc-editable text text-justify">
            Bertanggung jawab secara penuh atas kebenaran permohonan yang diajukan baik materiil maupun formil;
          </span>
        </li>
        <li className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
          <span>2.</span>
          <span contentEditable suppressContentEditableWarning className="doc-editable text text-justify">
            Bahwa Barang Milik Negara yang diusulkan pemindahtanganan dengan penjualan dalam kondisi rusak berat, tidak dapat digunakan dan dimanfaatkan lagi sehingga Barang Milik Negara dimaksud harus dilakukan penghapusan berdasarkan ketentuan perundangan yang berlaku.
          </span>
        </li>
      </ol>
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        Demikian pernyataan ini kami buat dengan keadaan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PernyataanDocument>
  );
}
