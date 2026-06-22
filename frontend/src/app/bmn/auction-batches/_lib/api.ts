import { api } from "@/lib/api";

export type AuctionBatchStatus =
  | "DRAFT"
  | "DIAJUKAN"
  | "JADWAL_DITETAPKAN"
  | "LELANG_ULANG"
  | "REALISASI"
  | "BATAL";

export type AuctionDocumentReadiness = {
  asset_type: "vehicle" | "general";
  requires_document_review: boolean;
  warnings: string[];
  items: Record<string, "ok" | "warning" | "blocking" | "unknown">;
};

export type AuctionValidityWarning = {
  approval_review_window_months: number;
  approval_review_until: string | null;
  requires_revaluation_review: boolean;
  message: string | null;
};

export type AuctionAvailableTransition =
  | "DIAJUKAN"
  | "JADWAL_DITETAPKAN"
  | "LELANG_ULANG"
  | "REALISASI"
  | "BATAL";

export interface AuctionBatch {
  id: string;
  batch_number: string;
  name: string;
  status: AuctionBatchStatus;
  status_label: string;
  is_read_only: boolean;
  no_surat_persetujuan: string | null;
  tanggal_surat_persetujuan: string | null;
  no_surat_penetapan: string | null;
  tanggal_lelang: string | null;
  reauction_count: number;
  no_surat_jadwal_ulang: string | null;
  tanggal_lelang_ulang: string | null;
  reauction_notes: string | null;
  metadata: any | null;
  assets_count: number;
  nilai_taksiran_total: number;
  created_at: string;
  updated_at: string;
  metadata_schema_version: number | null;
  validity_warning: AuctionValidityWarning | null;
  available_transitions: AuctionAvailableTransition[];
  assets?: AuctionBatchAsset[];
}

export interface AuctionBatchAsset {
  id: string;
  jenis_bmn: string;
  kode_barang: string;
  nup: string;
  nup_lama: string | null;
  nama_barang: string;
  kondisi: string;
  nilai_perolehan: number;
  nilai_buku: number;
  status_penggunaan: string;
  no_polisi?: string | null;
  no_stnk?: string | null;
  no_bpkp?: string | null;
  no_mesin?: string | null;
  no_rangka?: string | null;
  henti_guna: boolean;
  pivot?: {
    lot_number: string | null;
    nilai_taksiran: number | null;
    kertas_kerja_data: any | null;
    sort_order: number;
    first_auction_is_sold: boolean | null;
    first_auction_price: number | null;
    reauction_is_sold: boolean | null;
    reauction_price: number | null;
    final_result: string | null;
    final_price: number | null;
    final_auction_date: string | null;
  };
  document_readiness: AuctionDocumentReadiness;
  requires_document_review: boolean;
  document_readiness_warnings: string[];
}

export interface AuctionCandidateAsset {
  id: string;
  jenis_bmn: string;
  kode_barang: string;
  nup: string;
  nup_lama: string | null;
  nama_barang: string;
  merk_tipe?: string | null;
  no_polisi?: string | null;
  kondisi: string;
  nilai_perolehan: number;
  nilai_buku: number;
  active_auction_batch_id: string | null;
  active_auction_batch_number: string | null;
  is_auction_eligible: boolean;
  document_readiness: AuctionDocumentReadiness;
  requires_document_review: boolean;
  document_readiness_warnings: string[];
}

export interface AuctionBatchEvent {
  id: string;
  bmn_auction_batch_id: string;
  bmn_asset_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  previous_values: any | null;
  new_values: any | null;
  notes: string | null;
  created_at: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  links?: any;
  meta?: {
    current_page: number;
    from: number;
    last_page: number;
    links: any[];
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  message: string | null;
}

export interface ChecklistResponse {
  complete: boolean;
  items: ChecklistItem[];
}

// API methods
export async function getCandidates(params?: any): Promise<PaginatedResponse<AuctionCandidateAsset>> {
  const res = await api.get("/bmn/auction-candidates", { params });
  return res.data;
}

export async function getBatches(params?: any): Promise<PaginatedResponse<AuctionBatch>> {
  const res = await api.get("/bmn/auction-batches", { params });
  return res.data;
}

export async function createBatch(data: { name: string; asset_ids?: string[] }): Promise<{ data: AuctionBatch }> {
  const res = await api.post("/bmn/auction-batches", data);
  return res.data;
}

export async function getBatch(id: string): Promise<{ data: AuctionBatch }> {
  const res = await api.get(`/bmn/auction-batches/${id}`);
  return res.data;
}

export async function getChecklist(id: string): Promise<ChecklistResponse> {
  const res = await api.get(`/bmn/auction-batches/${id}/checklist`);
  return res.data;
}

export async function addAssets(id: string, assetIds: string[]): Promise<{ data: AuctionBatch }> {
  const res = await api.post(`/bmn/auction-batches/${id}/assets`, { asset_ids: assetIds });
  return res.data;
}

export async function removeAsset(id: string, assetId: string): Promise<{ data: AuctionBatch }> {
  const res = await api.delete(`/bmn/auction-batches/${id}/assets/${assetId}`);
  return res.data;
}

export async function updateOrder(id: string, orderedAssetIds: string[]): Promise<{ message: string }> {
  const res = await api.put(`/bmn/auction-batches/${id}/assets/order`, { ordered_asset_ids: orderedAssetIds });
  return res.data;
}

export async function updateValuation(
  id: string,
  assetId: string,
  data: { lot_number?: string | null; nilai_taksiran?: number | null; kertas_kerja_data?: any | null }
): Promise<{ message: string; data: any }> {
  const res = await api.put(`/bmn/auction-batches/${id}/assets/${assetId}/valuation`, data);
  return res.data;
}

export async function transition(id: string, data: { status: AuctionAvailableTransition; [key: string]: any }): Promise<{ data: AuctionBatch }> {
  const res = await api.post(`/bmn/auction-batches/${id}/transition`, data);
  return res.data;
}

export async function recordFirstAuctionResults(
  id: string,
  assets: { bmn_asset_id: string; first_auction_is_sold: boolean; first_auction_price?: number | null }[]
): Promise<{ data: AuctionBatch }> {
  const res = await api.post(`/bmn/auction-batches/${id}/first-auction-results`, { assets });
  return res.data;
}

export async function recordReauctionResults(
  id: string,
  assets: { bmn_asset_id: string; reauction_is_sold: boolean; reauction_price?: number | null }[]
): Promise<{ data: AuctionBatch }> {
  const res = await api.post(`/bmn/auction-batches/${id}/reauction-results`, { assets });
  return res.data;
}

export async function realize(id: string): Promise<{ data: AuctionBatch }> {
  const res = await api.post(`/bmn/auction-batches/${id}/realize`);
  return res.data;
}

export async function getDocumentContext(id: string): Promise<{ data: any }> {
  const res = await api.get(`/bmn/auction-batches/${id}/documents/context`);
  return res.data;
}

export async function recordPrintEvent(id: string, documentKey: string, data?: { notes?: string }): Promise<{ message: string }> {
  const res = await api.post(`/bmn/auction-batches/${id}/documents/${documentKey}/print-event`, data);
  return res.data;
}

export async function getEvents(id: string): Promise<{ data: AuctionBatchEvent[] }> {
  const res = await api.get(`/bmn/auction-batches/${id}/events`);
  return res.data;
}
