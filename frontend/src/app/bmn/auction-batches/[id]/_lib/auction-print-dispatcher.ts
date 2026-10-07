import { handlePrintBa as handlePrintBaKoreksi } from "../../../auction-candidates/_components/BaKoreksiDocument";
import { handlePrintSk as handlePrintSkPenghentian } from "../../../auction-candidates/_components/SkPenghentianDocument";
import { handlePrintSkPanitia } from "../../../auction-candidates/_components/SkPanitiaDocument";
import { handlePrintSkTimPenilai } from "../../../auction-candidates/_components/SkTimPenilaiDocument";
import { handlePrintSptjLimit } from "../../../auction-candidates/_components/SptjLimitDocument";
import { handlePrintSptjm } from "../../../auction-candidates/_components/SptjmDocument";
import { handlePrintSpTugas } from "../../../auction-candidates/_components/SpTugasDocument";
import { handlePrintSkKebenaran } from "../../../auction-candidates/_components/SkKebenaranDokumenDocument";
import { handlePrintBaPemeriksaan } from "../../../auction-candidates/_components/BaPemeriksaanDocument";
import { handlePrintNotaDinas } from "../../../auction-candidates/_components/NotaDinasDocument";
import { handlePrintPermohonanKpknl } from "../../../auction-candidates/_components/PermohonanKpknlDocument";

export interface AuctionPrintContext {
  assets: any[];
  getDocumentNumber: (key: string) => string;
}

const AUCTION_DOC_PRINTERS: Record<string, (ctx: AuctionPrintContext) => void> = {
  ba_koreksi: (ctx) => handlePrintBaKoreksi(ctx.assets),
  sk_penghentian: (ctx) => handlePrintSkPenghentian(ctx.assets, ctx.getDocumentNumber("sk_penghentian")),
  sk_panitia: () => handlePrintSkPanitia(),
  sk_tim_penilai: () => handlePrintSkTimPenilai(),
  ba_pemeriksaan: () => handlePrintBaPemeriksaan(),
  nota_dinas: () => handlePrintNotaDinas(),
  permohonan_kpknl: () => handlePrintPermohonanKpknl(),
  sk_kebenaran: () => handlePrintSkKebenaran(),
  sptjm: () => handlePrintSptjm(),
  sptj_limit: () => handlePrintSptjLimit(),
  sp_tugas: () => handlePrintSpTugas(),
};

export function printAuctionDocument(docKey: string, ctx: AuctionPrintContext): boolean {
  const printer = AUCTION_DOC_PRINTERS[docKey];
  if (printer) {
    printer(ctx);
    return true;
  }
  return false;
}
