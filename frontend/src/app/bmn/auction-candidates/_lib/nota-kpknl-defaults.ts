// Default text and shared types for Nota Dinas KSDAE & Surat Permohonan KPKNL.

import type { SkBuilderItem } from "./sk-defaults";

const makeId = () => "id" + Math.random().toString(36).slice(2);

export interface KpknlMeta {
  perihal: string;
  lampiran: string;
  lokasi: string;
}

export const DEFAULT_NOTA_DINAS_PERIHAL =
  "Persetujuan Pemindahtanganan BMN dengan Penjualan Pada Balai KSDA Kalimantan Timur";

export const DEFAULT_KPKNL_PERIHAL =
  "Persetujuan Pemindahtanganan BMN dengan Penjualan Melalui Lelang Pada Balai KSDA Kalimantan Timur";

export const DEFAULT_LAMPIRAN = "1 (satu) berkas";

export const DEFAULT_LOKASI = "Kota Samarinda dan Kabupaten Berau";
export const DEFAULT_KPKNL_LOKASI = "Samarinda";

export const DEFAULT_NOTA_DINAS_TEMBUSAN: SkBuilderItem[] = [
  { id: makeId(), text: "Kepala Biro Umum Kementerian Kehutanan" },
];

export const DEFAULT_KPKNL_TEMBUSAN: SkBuilderItem[] = [
  { id: makeId(), text: "Sekretaris Direktorat Jenderal KSDAE" },
];

export const DEFAULT_NOTA_DINAS_KESIMPULAN =
  "Demikian kami sampaikan, atas persetujuan Bapak diucapkan terima kasih.";

export const DEFAULT_KPKNL_KESIMPULAN =
  "Demikian kami sampaikan atas perhatiannya dan kerjasamanya diucapkan terima kasih.";
