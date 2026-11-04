import {
  DEFAULT_MEMUTUSKAN,
  DEFAULT_MENIMBANG,
  DEFAULT_MENGINGAT,
  type SkBuilderItem,
  type SkMemutuskan,
  newSkBuilderItem,
} from "../../auction-candidates/_lib/sk-defaults";
import {
  DEFAULT_PANITIA_MEMUTUSKAN,
  DEFAULT_PANITIA_MENIMBANG,
  DEFAULT_PANITIA_MENGINGAT,
  DEFAULT_PANITIA_TEMBUSAN,
} from "../../auction-candidates/_lib/sk-panitia-defaults";
import {
  DEFAULT_TIM_PENILAI_MEMUTUSKAN,
  DEFAULT_TIM_PENILAI_MENIMBANG,
  DEFAULT_TIM_PENILAI_MENGINGAT,
  DEFAULT_TIM_PENILAI_TEMBUSAN,
} from "../../auction-candidates/_lib/sk-tim-penilai-defaults";

export interface SkDocumentContent {
  menimbang: SkBuilderItem[];
  mengingat: SkBuilderItem[];
  memutuskan: SkMemutuskan;
  tembusan: SkBuilderItem[];
}

export interface LetterDocumentContent {
  perihal: string;
  lampiran: string;
  lokasi: string;
  tujuan?: string;
  kesimpulan: string;
  tembusan?: SkBuilderItem[];
}

export interface BaPemeriksaanContent {
  hari?: string;
  lokasi?: string;
  dasarTugas?: string;
  catatanFisik?: string;
  penutup?: string;
}

export interface BaKoreksiContent {
  tempat?: string;
  alasan?: string;
  penutup?: string;
}

export interface SuratTugasContent {
  dasar?: string;
  maksud?: string;
  penutup?: string;
}

export interface PernyataanItem {
  id: string;
  text: string;
}

export interface PernyataanDocumentContent {
  pembuka?: string;
  poin: PernyataanItem[];
  penutup?: string;
}

export function newPernyataanItem(text = ""): PernyataanItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
  };
}

export function getDefaultDocumentContent(docKey: string): any {
  switch (docKey) {
    case "sk_penghentian":
      return {
        menimbang: DEFAULT_MENIMBANG.map((item) => ({ ...item })),
        mengingat: DEFAULT_MENGINGAT.map((item) => ({ ...item })),
        memutuskan: { ...DEFAULT_MEMUTUSKAN },
        tembusan: [],
      } satisfies SkDocumentContent;

    case "sk_panitia":
      return {
        menimbang: DEFAULT_PANITIA_MENIMBANG.map((item) => ({ ...item })),
        mengingat: DEFAULT_PANITIA_MENGINGAT.map((item) => ({ ...item })),
        memutuskan: { ...DEFAULT_PANITIA_MEMUTUSKAN },
        tembusan: DEFAULT_PANITIA_TEMBUSAN.map((item) => ({ ...item })),
      } satisfies SkDocumentContent;

    case "sk_tim_penilai":
      return {
        menimbang: DEFAULT_TIM_PENILAI_MENIMBANG.map((item) => ({ ...item })),
        mengingat: DEFAULT_TIM_PENILAI_MENGINGAT.map((item) => ({ ...item })),
        memutuskan: { ...DEFAULT_TIM_PENILAI_MEMUTUSKAN },
        tembusan: DEFAULT_TIM_PENILAI_TEMBUSAN.map((item) => ({ ...item })),
      } satisfies SkDocumentContent;

    case "nota_dinas":
      return {
        perihal: "Permohonan Persetujuan Penjualan BMN Rusak Berat",
        lampiran: "1 (Satu) Berkas",
        lokasi: "Samarinda",
        tujuan: "Sekretaris Direktorat Jenderal KSDAE",
        kesimpulan:
          "Aset BMN tersebut sudah tidak dapat digunakan dan perlu dihapuskan melalui mekanisme penjualan secara lelang.",
        tembusan: [],
      } satisfies LetterDocumentContent;

    case "permohonan_kpknl":
      return {
        perihal: "Permohonan Pelaksanaan Lelang Barang Milik Negara",
        lampiran: "1 (Satu) Berkas",
        lokasi: "Samarinda",
        tujuan: "Kepala Kantor Pelayanan Kekayaan Negara dan Lelang (KPKNL) Samarinda",
        kesimpulan:
          "Aset BMN tersebut dalam kondisi Rusak Berat dan diusulkan untuk dilakukan penjualan secara lelang melalui perantaraan KPKNL.",
        tembusan: [],
      } satisfies LetterDocumentContent;

    case "ba_pemeriksaan":
      return {
        hari: "",
        lokasi: "Kantor Balai Konservasi Sumber Daya Alam Kalimantan Timur",
        dasarTugas:
          "Telah melaksanakan tugas pemeriksaan secara administrasi, teknis tentang kondisi dan nilai taksiran Barang Milik Negara berupa Alat Angkutan Bermotor yang berada pada Balai Konservasi Sumber Daya Alam Kalimantan Timur sesuai dengan Surat Tugas yang terlampir.",
        catatanFisik: "",
        penutup:
          "Demikian Berita Acara Pemeriksaan ini dibuat dengan sebenarnya, ditandatangani oleh masing-masing pemeriksa.",
      } satisfies BaPemeriksaanContent;

    case "ba_koreksi":
      return {
        tempat: "Kantor Balai Konservasi Sumber Daya Alam Kalimantan Timur",
        alasan:
          "Menyatakan bahwa telah dilakukan koreksi perubahan kondisi dengan cara melakukan koreksi terhadap kondisi Barang Milik Negara pada Kantor Balai Konservasi Sumber Daya Alam Kalimantan Timur berdasarkan Penilaian Barang Milik Negara dengan hasil (rincian terlampir).",
        penutup:
          "Demikian Berita Acara ini dibuat sebagai bahan koreksi perubahan kondisi Barang Milik Negara, dan apabila dikemudian hari terdapat kekeliruan akan dilakukan perbaikan sebagaimana mestinya.",
      } satisfies BaKoreksiContent;

    case "surat_tugas_pemeriksaan_penilaian":
      return {
        dasar:
          "Dalam rangka pemeriksaan fisik dan penilaian Barang Milik Negara berupa alat angkutan bermotor pada Balai Konservasi Sumber Daya Alam Kalimantan Timur, dengan ini menugaskan kepada:",
        maksud:
          "Untuk melaksanakan pemeriksaan, penelitian administrasi, dan penilaian kewajaran nilai taksiran atas objek BMN yang akan dipindahtangankan melalui penjualan secara lelang.",
        penutup:
          "Surat tugas ini berlaku sejak tanggal ditetapkan sampai dengan selesainya pelaksanaan tugas, dengan ketentuan apabila terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.",
      } satisfies SuratTugasContent;

    case "sptjm":
      return {
        pembuka: "Dengan ini menyatakan sebagai berikut :",
        poin: [
          newPernyataanItem(
            "Bertanggung jawab secara penuh atas kebenaran permohonan yang diajukan baik materiil maupun formil;",
          ),
          newPernyataanItem(
            "Bahwa Barang Milik Negara yang diusulkan pemindahtanganan dengan penjualan dalam kondisi rusak berat, tidak dapat digunakan dan dimanfaatkan lagi sehingga Barang Milik Negara dimaksud harus dilakukan penghapusan berdasarkan ketentuan perundangan yang berlaku.",
          ),
        ],
        penutup:
          "Demikian pernyataan ini kami buat dengan keadaan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
      } satisfies PernyataanDocumentContent;

    case "sptj_limit":
      return {
        pembuka: "Dengan ini menyatakan sebagai berikut :",
        poin: [
          newPernyataanItem(
            "Bertanggungjawab secara penuh atas kebenaran nilai limit yang kami ajukan dalam rangka penjualan, yang bukan merupakan nilai wajar hasil inventarisasi dan penilaian.",
          ),
          newPernyataanItem(
            "Perhitungan nilai limit sebagaimana dimaksud pada angka 1 (satu), prinsip efisien, efektif dan menghasilkan manfaat yang optimal bagi negara (antara lain penurunan nilai barang dimaksud apabila tidak dilakukan penghapusan/pemindahtanganan, potensi biaya pemeliharaan yang harus dikeluarkan, ketersediaan ruangan yang sudah tidak memadai dan sebagainya).",
          ),
        ],
        penutup:
          "Demikian pernyataan ini kami buat dengan keadaan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
      } satisfies PernyataanDocumentContent;

    case "sp_tugas":
      return {
        pembuka:
          "Dengan ini menyatakan bahwa dalam rangka kegiatan Penghapusan Barang Milik Negara (BMN) berupa Alat Angkutan Bermotor di lingkungan Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur, saya selaku Kepala Balai menyatakan bahwa:",
        poin: [
          newPernyataanItem(
            "Barang Milik Negara yang akan dipindahtangankan dengan penjualan tidak mengganggu kelancaran tugas dinas operasional maupun administrasi.",
          ),
        ],
        penutup:
          "Demikian surat pernyataan ini dibuat dengan sebenarnya, untuk dapat dipergunakan sebagaimana mestinya.",
      } satisfies PernyataanDocumentContent;

    case "sk_kebenaran":
      return {
        pembuka: "Dengan ini menerangkan bahwa :",
        poin: [
          newPernyataanItem(
            "Fotokopi dokumen kepemilikan dan bukti perolehan BMN yang dilampirkan adalah benar dan sah sesuai dokumen aslinya.",
          ),
          newPernyataanItem(
            "Fisik Barang Milik Negara yang tercantum dalam lampiran surat keterangan ini benar-benar ada dan berada dalam penguasaan Balai Konservasi Sumber Daya Alam Kalimantan Timur.",
          ),
        ],
        penutup:
          "Demikian Surat Keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
      } satisfies PernyataanDocumentContent;

    default:
      return {};
  }
}
