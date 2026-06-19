export interface AssetListItem {
  id: string | number;
  nama_barang: string;
  kode_barang?: string;
  nup?: string | number;
  merk_tipe?: string;
  kondisi?: string;
  lokasi?: string;
  pengguna?: string;
  no_polisi?: string;
  is_verified?: boolean;
}

export interface AssetDetail extends AssetListItem {
  merk?: string;
  tipe?: string;
  no_rangka?: string;
  no_mesin?: string;
  tanggal_pembelian?: string;
  nilai_perolehan?: number;
  jenis_bmn?: string;
  lokasi_ruang?: string;
  penanggung_jawab?: {
    id: number;
    nama_lengkap: string;
    nip?: string;
  } | null;
  bpkb_1?: string | null;
  bpkb_2?: string | null;
  bpkb_3?: string | null;
  bpkb_4?: string | null;
  stnk_1?: string | null;
  stnk_2?: string | null;
  tanggal_pajak_stnk?: string | null;
  allowed_actions?: {
    can_edit: boolean;
    can_upload_photo: boolean;
    can_verify: boolean;
    can_loan: boolean;
    can_return: boolean;
  };
}

export interface AssetPhotoSlot {
  type: string;
  label: string;
  url: string | null;
  is_verified?: boolean;
}

export interface BmnQueryFilters {
  page?: number;
  per_page?: number;
  search?: string;
  kondisi?: string;
  jenis_bmn?: string;
  lokasi_ruang?: string;
  employee_id?: number | string;
}
