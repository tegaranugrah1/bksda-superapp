"use client";

import React from "react";
import type { AuctionAsset } from "../../../auction-candidates/_lib/auction-helpers";
import type { SkKepalaBalai, SkBuilderItem, SkMemutuskan } from "../../../auction-candidates/_lib/sk-defaults";
import {
  DEFAULT_MEMUTUSKAN,
  DEFAULT_MENIMBANG,
  DEFAULT_MENGINGAT,
} from "../../../auction-candidates/_lib/sk-defaults";
import type { PanitiaAnggota } from "../../../auction-candidates/_lib/sk-panitia-defaults";
import {
  DEFAULT_PANITIA_MEMUTUSKAN,
  DEFAULT_PANITIA_MENIMBANG,
  DEFAULT_PANITIA_MENGINGAT,
  DEFAULT_PANITIA_TEMBUSAN,
} from "../../../auction-candidates/_lib/sk-panitia-defaults";
import type { PemeriksaAnggota } from "../../../auction-candidates/_lib/pemeriksa-defaults";
import type { TimPenilaiAnggota } from "../../../auction-candidates/_lib/sk-tim-penilai-defaults";
import {
  DEFAULT_TIM_PENILAI_MEMUTUSKAN,
  DEFAULT_TIM_PENILAI_MENIMBANG,
  DEFAULT_TIM_PENILAI_MENGINGAT,
  DEFAULT_TIM_PENILAI_TEMBUSAN,
} from "../../../auction-candidates/_lib/sk-tim-penilai-defaults";

import type {
  SkDocumentContent,
  LetterDocumentContent,
  BaPemeriksaanContent,
  BaKoreksiContent,
  SuratTugasContent,
  PernyataanDocumentContent,
} from "../../_lib/document-content-defaults";

// Document components
import { CorrectionDocument as BaKoreksiDocument } from "../../../auction-candidates/_components/BaKoreksiDocument";
import { SkPenghentianDocument } from "../../../auction-candidates/_components/SkPenghentianDocument";
import { SkPanitiaDocument } from "../../../auction-candidates/_components/SkPanitiaDocument";
import { SkTimPenilaiDocument } from "../../../auction-candidates/_components/SkTimPenilaiDocument";
import { SptjLimitDocument } from "../../../auction-candidates/_components/SptjLimitDocument";
import { SptjmDocument } from "../../../auction-candidates/_components/SptjmDocument";
import { SpTugasDocument } from "../../../auction-candidates/_components/SpTugasDocument";
import { SkKebenaranDokumenDocument as SkKebenaranDocument } from "../../../auction-candidates/_components/SkKebenaranDokumenDocument";
import { BaPemeriksaanDocument } from "../../../auction-candidates/_components/BaPemeriksaanDocument";
import { NotaDinasDocument } from "../../../auction-candidates/_components/NotaDinasDocument";
import { PermohonanKpknlDocument } from "../../../auction-candidates/_components/PermohonanKpknlDocument";
import { SuratTugasPemeriksaanPenilaianDocument } from "../../../auction-candidates/_components/SuratTugasPemeriksaanPenilaianDocument";

export interface AuctionDocumentRendererProps {
  docKey: string;
  assets: AuctionAsset[];
  getDocumentNumber: (key: string, suffix?: string) => string;
  getDocumentKap: (key: string) => string;
  getDocumentDate: (key: string) => string | undefined;
  kepalaBalai: SkKepalaBalai;
  content?: any;
  skDetails?: any;
  panitiaList?: PanitiaAnggota[];
  timPenilaiList?: TimPenilaiAnggota[];
  pemeriksaList?: PemeriksaAnggota[];
  stNumber?: string;
  stTanggal?: string;
  nilaiTaksiranTotal?: number;
}

/**
 * Unified renderer for all auction documents across off-screen printing
 * and live modal preview.
 */
export function AuctionDocumentRenderer({
  docKey,
  assets,
  getDocumentNumber,
  getDocumentKap,
  getDocumentDate,
  kepalaBalai,
  content,
  skDetails,
  panitiaList = [],
  timPenilaiList = [],
  pemeriksaList = [],
  stNumber = "",
  stTanggal = "",
  nilaiTaksiranTotal = 0,
}: AuctionDocumentRendererProps) {
  switch (docKey) {
    case "ba_koreksi":
      return (
        <BaKoreksiDocument
          assets={assets}
          baNumber={getDocumentNumber("ba_koreksi")}
          baKap={getDocumentKap("ba_koreksi")}
          date={getDocumentDate("ba_koreksi")}
          kepalaBalai={kepalaBalai}
          content={content as BaKoreksiContent}
        />
      );

    case "sk_penghentian":
      return (
        <SkPenghentianDocument
          assets={assets}
          skNumber={getDocumentNumber("sk_penghentian")}
          skKap={getDocumentKap("sk_penghentian")}
          date={getDocumentDate("sk_penghentian")}
          menimbang={content?.menimbang || skDetails?.penghentian?.menimbang || DEFAULT_MENIMBANG}
          mengingat={content?.mengingat || skDetails?.penghentian?.mengingat || DEFAULT_MENGINGAT}
          memutuskan={content?.memutuskan || skDetails?.penghentian?.memutuskan || DEFAULT_MEMUTUSKAN}
          kepalaBalai={kepalaBalai}
          tembusan={content?.tembusan || skDetails?.penghentian?.tembusan || []}
        />
      );

    case "sk_panitia":
      return (
        <SkPanitiaDocument
          skNumber={getDocumentNumber("sk_panitia")}
          skKap={getDocumentKap("sk_panitia")}
          date={getDocumentDate("sk_panitia_penghapusan") || getDocumentDate("sk_panitia")}
          menimbang={content?.menimbang || skDetails?.panitia?.menimbang || DEFAULT_PANITIA_MENIMBANG}
          mengingat={content?.mengingat || skDetails?.panitia?.mengingat || DEFAULT_PANITIA_MENGINGAT}
          memutuskan={content?.memutuskan || skDetails?.panitia?.memutuskan || DEFAULT_PANITIA_MEMUTUSKAN}
          kepalaBalai={kepalaBalai}
          tembusan={content?.tembusan || skDetails?.panitia?.tembusan || DEFAULT_PANITIA_TEMBUSAN}
          susunanPanitia={panitiaList}
        />
      );

    case "sk_tim_penilai":
      return (
        <SkTimPenilaiDocument
          skNumber={getDocumentNumber("sk_tim_penilai")}
          skKap={getDocumentKap("sk_tim_penilai")}
          date={getDocumentDate("sk_panitia_penaksir_harga") || getDocumentDate("sk_tim_penilai")}
          menimbang={content?.menimbang || skDetails?.tim_penilai?.menimbang || DEFAULT_TIM_PENILAI_MENIMBANG}
          mengingat={content?.mengingat || skDetails?.tim_penilai?.mengingat || DEFAULT_TIM_PENILAI_MENGINGAT}
          memutuskan={{
            menetapkan: content?.memutuskan?.menetapkan || skDetails?.tim_penilai?.memutuskan?.menetapkan || "",
            kesatu: content?.memutuskan?.kesatu || skDetails?.tim_penilai?.memutuskan?.kesatu || "",
            kedua: content?.memutuskan?.kedua || skDetails?.tim_penilai?.memutuskan?.kedua || "",
            ketiga: content?.memutuskan?.ketiga || skDetails?.tim_penilai?.memutuskan?.ketiga || "",
            keempat: content?.memutuskan?.keempat || skDetails?.tim_penilai?.memutuskan?.keempat || DEFAULT_TIM_PENILAI_MEMUTUSKAN.keempat,
          }}
          kepalaBalai={kepalaBalai}
          tembusan={content?.tembusan || skDetails?.tim_penilai?.tembusan || DEFAULT_TIM_PENILAI_TEMBUSAN}
          susunanTimPenilai={timPenilaiList}
        />
      );

    case "ba_pemeriksaan":
      return (
        <BaPemeriksaanDocument
          number={getDocumentNumber("ba_pemeriksaan")}
          kap={getDocumentKap("ba_pemeriksaan")}
          date={getDocumentDate("ba_pemeriksaan")}
          pemeriksaList={pemeriksaList}
          stNumber={stNumber}
          stTanggal={stTanggal}
          assets={assets}
          kepalaBalai={kepalaBalai}
          content={content as BaPemeriksaanContent}
        />
      );

    case "surat_tugas_pemeriksaan_penilaian":
      return (
        <div id="surat-tugas-pemeriksaan-penilaian-print-root">
          <SuratTugasPemeriksaanPenilaianDocument
            number={getDocumentNumber("surat_tugas_pemeriksaan_penilaian")}
            kap={getDocumentKap("surat_tugas_pemeriksaan_penilaian")}
            date={getDocumentDate("surat_tugas_pemeriksaan_penilaian")}
            assets={assets}
            kepalaBalai={kepalaBalai}
            timPenilai={timPenilaiList}
            pemeriksa={pemeriksaList}
            content={content as SuratTugasContent}
          />
        </div>
      );

    case "nota_dinas":
      return (
        <NotaDinasDocument
          number={getDocumentNumber("nota_dinas")}
          kap={getDocumentKap("nota_dinas")}
          date={getDocumentDate("nota_dinas_ksdae") || getDocumentDate("nota_dinas")}
          assets={assets}
          kepalaBalai={kepalaBalai}
          perihal={content?.perihal || "Permohonan Persetujuan Penjualan BMN Rusak Berat"}
          lampiran={content?.lampiran || "1 (Satu) Berkas"}
          lokasi={content?.lokasi || "Samarinda"}
          tembusan={content?.tembusan || []}
          kesimpulan={content?.kesimpulan || "Aset BMN tersebut sudah tidak dapat digunakan dan perlu dihapuskan."}
          nilaiTaksiran={nilaiTaksiranTotal}
        />
      );

    case "permohonan_kpknl":
      return (
        <PermohonanKpknlDocument
          number={getDocumentNumber("permohonan_kpknl")}
          kap={getDocumentKap("permohonan_kpknl")}
          date={getDocumentDate("permohonan_kpknl")}
          assets={assets}
          kepalaBalai={kepalaBalai}
          perihal={content?.perihal || "Permohonan Pelaksanaan Lelang Barang Milik Negara"}
          lampiran={content?.lampiran || "1 (Satu) Berkas"}
          lokasi={content?.lokasi || "Samarinda"}
          tembusan={content?.tembusan || []}
          kesimpulan={content?.kesimpulan || "Aset BMN tersebut dalam kondisi Rusak Berat dan diusulkan untuk dilelang."}
        />
      );

    case "sk_kebenaran":
      return (
        <SkKebenaranDocument
          number={getDocumentNumber("sk_kebenaran")}
          kap={getDocumentKap("sk_kebenaran")}
          date={getDocumentDate("sk_kebenaran")}
          assets={assets}
          kepalaBalai={kepalaBalai}
          content={content as PernyataanDocumentContent}
        />
      );

    case "sptjm":
      return (
        <SptjmDocument
          number={getDocumentNumber("sptjm", "01")}
          kap={getDocumentKap("sptjm")}
          date={getDocumentDate("sptjm")}
          kepalaBalai={kepalaBalai}
          content={content as PernyataanDocumentContent}
        />
      );

    case "sptj_limit":
      return (
        <SptjLimitDocument
          number={getDocumentNumber("sptj_limit", "01")}
          kap={getDocumentKap("sptj_limit")}
          date={getDocumentDate("sptj_limit")}
          kepalaBalai={kepalaBalai}
          content={content as PernyataanDocumentContent}
        />
      );

    case "sp_tugas":
      return (
        <SpTugasDocument
          number={getDocumentNumber("sp_tugas", "01")}
          kap={getDocumentKap("sp_tugas")}
          date={getDocumentDate("sp_kelancaran_tugas") || getDocumentDate("sp_tugas")}
          kepalaBalai={kepalaBalai}
          content={content as PernyataanDocumentContent}
        />
      );

    default:
      return null;
  }
}
