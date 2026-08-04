"use client";

import { parseDocDate } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";
import { buildPernyataanNomor, printPernyataan } from "../_lib/print-pernyataan";
import { PernyataanDocument, PernyataanIdentity } from "./PernyataanDocument";

interface SpTugasDocumentProps {
  number: string;
  kap: string;
  date?: string;
  kepalaBalai: SkKepalaBalai;
}

const ROOT_ID = "sp-tugas-print-root";

export function handlePrintSpTugas() {
  printPernyataan({
    rootId: ROOT_ID,
    title: "Surat Pernyataan Tidak Mengganggu Kelancaran Tugas",
    emptyMessage: "Tidak ada dokumen Surat Pernyataan Kelancaran Tugas untuk dicetak.",
  });
}

export function SpTugasDocument({ number, kap, date, kepalaBalai }: SpTugasDocumentProps) {
  const docDate = parseDocDate(date);
  const nomorText = buildPernyataanNomor("SM", number, kap, docDate);

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
        Dengan ini menyatakan bahwa dalam rangka kegiatan Penghapusan Barang Milik Negara (BMN) berupa Alat Angkutan Bermotor di lingkungan Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur, saya selaku Kepala Balai menyatakan bahwa Barang Milik Negara yang akan dipindahtangankan dengan penjualan tidak mengganggu kelancaran tugas dinas.
      </p>
      <p contentEditable suppressContentEditableWarning className="doc-editable">
        Demikian surat pernyataan ini dibuat dengan sebenarnya, untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PernyataanDocument>
  );
}
