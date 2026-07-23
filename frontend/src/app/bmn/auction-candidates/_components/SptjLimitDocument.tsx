"use client";

import { parseDocDate } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";
import { buildPernyataanNomor, printPernyataan } from "../_lib/print-pernyataan";
import { PernyataanDocument, PernyataanIdentity } from "./PernyataanDocument";

interface SptjLimitDocumentProps {
  number: string;
  kap: string;
  date?: string;
  kepalaBalai: SkKepalaBalai;
}

const ROOT_ID = "sptj-limit-print-root";

export function handlePrintSptjLimit() {
  printPernyataan({
    rootId: ROOT_ID,
    title: "Surat Pernyataan Tanggung Jawab Nilai Limit",
    emptyMessage: "Tidak ada dokumen Surat Pernyataan Tanggung Jawab Nilai Limit untuk dicetak.",
  });
}

export function SptjLimitDocument({ number, kap, date, kepalaBalai }: SptjLimitDocumentProps) {
  const docDate = parseDocDate(date);
  const nomorText = buildPernyataanNomor("SM", number, kap, docDate);

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
        Dengan ini menyatakan sebagai berikut :
      </p>
      <ol className="doc-list space-y-2">
        <li className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
          <span className="marker">1.</span>
          <span contentEditable suppressContentEditableWarning className="doc-editable text text-justify">
            Bertanggungjawab secara penuh atas kebenaran nilai limit yang kami ajukan dalam rangka penjualan, yang bukan merupakan nilai wajar hasil inventarisasi dan penilaian.
          </span>
        </li>
        <li className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
          <span className="marker">2.</span>
          <span contentEditable suppressContentEditableWarning className="doc-editable text text-justify">
            Perhitungan nilai limit sebagaimana dimaksud pada angka 1 (satu), prinsip efisien, efektif dan menghasilkan manfaat yang optimal bagi negara (antara lain penurunan nilai barang dimaksud apabila tidak dilakukan penghapusan/pemindahtanganan, potensi biaya pemeliharaan yang harus dikeluarkan, ketersediaan ruangan yang sudah tidak memadai dan sebagainya).
          </span>
        </li>
      </ol>
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        Demikian pernyataan ini kami buat dengan keadaan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PernyataanDocument>
  );
}
