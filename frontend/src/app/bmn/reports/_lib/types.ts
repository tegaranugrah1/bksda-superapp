import type { UsageAgreementAsset, UsageAgreementParty } from "../_components/UsageAgreementDocument";
import type { HandoverItem, HandoverParty, HandoverVariant, HandoverWitness } from "../_components/HandoverAgreementDocument";
import type { PowerOfAttorneyAsset, PowerOfAttorneyParty } from "../_components/PowerOfAttorneyDocument";
import type { CoveringLetterItem, CoveringLetterParty } from "../_components/CoveringLetterDocument";
import type { EmployeeOption } from "./report-utils";

export interface UsageAgreementHistory {
  id: string;
  document_type?: "usage_agreement";
  status?: "draft" | "published";
  number: string;
  document_date: string;
  first_party_snapshot?: UsageAgreementParty;
  second_party_snapshot?: UsageAgreementParty & { id?: number; unit?: string | null };
  assets_snapshot?: UsageAgreementAsset[];
  asset_ids?: string[];
  notes?: string | null;
  employee?: Pick<EmployeeOption, "id" | "nama_lengkap" | "nip" | "jabatan" | "pangkat_golongan">;
  generator?: { name: string };
  created_at?: string;
}

export interface BmnAssetOption extends UsageAgreementAsset {
  jenis_bmn?: string | null;
  stnk_document?: {
    path: string;
    mime: string;
    original_name: string;
    preview_path: string | null;
    url: string;
    download_url: string;
    preview_url: string | null;
    preview_urls: string[];
  } | null;
}

export interface HandoverAgreementHistory {
  id: string;
  document_type: "handover_agreement";
  status?: "draft" | "published";
  variant: HandoverVariant;
  title: string;
  number: string;
  document_date: string;
  first_party_employee_id?: number | null;
  second_party_employee_id?: number | null;
  first_party_snapshot: HandoverParty;
  second_party_snapshot: HandoverParty;
  witness_snapshot?: HandoverWitness | null;
  items_snapshot: HandoverItem[];
  asset_ids?: string[] | null;
  metadata?: {
    description?: string;
    receipt_clause?: string;
    signer_count?: 2 | 3;
    witness?: HandoverWitness;
  };
  generator?: { name: string };
}

export interface PowerOfAttorneyHistory {
  id: string;
  document_type: "power_of_attorney";
  status?: "draft" | "published";
  number: string;
  document_date: string;
  first_party_snapshot: PowerOfAttorneyParty;
  second_party_snapshot: PowerOfAttorneyParty & { id?: number };
  assets_snapshot: PowerOfAttorneyAsset[];
  asset_ids: string[];
  notes?: string | null;
  employee?: Pick<EmployeeOption, "id" | "nama_lengkap" | "nip" | "jabatan" | "pangkat_golongan">;
  generator?: { name: string };
  created_at?: string;
  ktp_path?: string | null;
  ktp_url?: string | null;
}

export interface CoveringLetterHistory {
  id: string;
  document_type: "covering_letter";
  status?: "draft" | "published";
  number: string;
  regarding: string;
  document_date: string;
  recipient_title: string;
  recipient_location: string;
  items_snapshot: CoveringLetterItem[];
  closing_phrase: string;
  received_date?: string | null;
  show_signatures?: boolean;
  sender_employee_id?: number | null;
  sender_snapshot: CoveringLetterParty;
  receiver_snapshot?: CoveringLetterParty | null;
  metadata?: any;
  notes?: string | null;
  sender_employee?: Pick<EmployeeOption, "id" | "nama_lengkap" | "nip" | "jabatan">;
  generator?: { name: string };
  created_at?: string;
}

export type DocumentHistoryType = "all" | "usage_agreement" | "handover_agreement" | "power_of_attorney" | "covering_letter";

export type DocumentHistoryItem =
  | (UsageAgreementHistory & { document_type: "usage_agreement" })
  | HandoverAgreementHistory
  | (PowerOfAttorneyHistory & { document_type: "power_of_attorney" })
  | CoveringLetterHistory;

export interface EditingDocumentState {
  id: string;
  type: "usage" | "handover" | "power_of_attorney" | "covering_letter";
  titleOrNumber: string;
  status: "draft" | "published" | string;
}

export interface PaginatedDocumentHistory {
  data: DocumentHistoryItem[];
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export const DEFAULT_FIRST_PARTY: UsageAgreementParty = {
  name: "M. Ari Wibawanto, S.Hut., M.Sc.",
  nip: "19740514 199903 1 001",
  rank: "Pembina Tingkat I (IV/b)",
  position: "Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur",
};

export const DEFAULT_POA_FIRST_PARTY: PowerOfAttorneyParty = {
  name: "HARDI PURNAMA",
  nip: "19720201 199703 1 008",
  position: "Koordinator Urusan Umum dan Perlengkapan",
  address: "Jln. Teuku Umar Samarinda",
};

export const DEFAULT_HANDOVER_FIRST_PARTY: HandoverParty = {
  name: "Dheny Mardiono, S.Hut., M.Sc.",
  nip: "19750314 199903 1 004",
  position: "Kepala Sub Bagian Tata Usaha",
  address: "Jl. Teuku Umar Samarinda.",
};

export const DEFAULT_COVERING_SENDER: CoveringLetterParty = {
  name: "Heryanto Sumanbowo, S.Hut.",
  nip: "19830528 200112 1 001",
  role: "Pengirim,\nPenjual Lelang",
};

export const DEFAULT_COVERING_RECEIVER: CoveringLetterParty = {
  name: "",
  idType: "NIP",
  nip: "",
  role: "Penerima,\nPejabat Lelang",
};

export const DEFAULT_COVERING_ITEMS: CoveringLetterItem[] = [
  {
    id: "item-1",
    title: "Dokumen Permohonan Pengajuan Lelang BMN Mini Bus (Penumpang 14 Orang Kebawah) / Toyota Kijang Super KF 83 Long dan Dokumen Pengumuman Lelang",
    quantity: "1 (satu berkas)",
    description: "Lelang Non-Eksekusi",
  },
  {
    id: "item-2",
    title: "Dokumen Permohonan Pengajuan Lelang BMN Sepeda Motor / Honda GL 160 D dan Dokumen Pengumuman Lelang",
    quantity: "1 (satu berkas)",
    description: "Lelang Non-Eksekusi",
  },
];

export const DEFAULT_HANDOVER_WITNESS: HandoverWitness = {
  name: "M. Ari Wibawanto, S.Hut., M.Sc.",
  nip: "19740514 199903 1 001",
  position: "KEPALA BALAI,",
  label: "Mengetahui,",
};

export const DEFAULT_HANDOVER_RECEIPT_CLAUSE =
  "PIHAK KEDUA telah menerima barang tersebut dalam keadaan baik dan dapat dipergunakan dengan baik, dengan diserahkan barang tersebut dari PIHAK KESATU kepada PIHAK KEDUA, maka pengelolaan barang tersebut menjadi tanggung jawab PIHAK KEDUA.";

