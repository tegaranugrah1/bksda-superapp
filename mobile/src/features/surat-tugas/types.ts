export type AssignmentStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | (string & {});

export type AssignmentListMode = 'personal' | 'management';

export interface AssignmentAllowedActions {
  can_view: boolean;
  can_download?: boolean;
  can_update?: boolean;
  can_approve?: boolean;
  can_delete?: boolean;
  can_reject?: boolean;
  can_complete?: boolean;
}

export interface AssignmentFileState {
  available: boolean;
  download_url?: string | null;
  filename?: string | null;
  mime_type?: string | null;
}

export interface AssignmentPersonel {
  id: string | number;
  name: string;
  nip?: string | null;
  jabatan?: string | null;
  unit_kerja?: string | null;
  peran?: string | null;
}

export interface AssignmentListItem {
  id: string | number;
  nomor?: string | null;
  kegiatan?: string | null;
  tujuan?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  tanggal_surat?: string | null;
  status?: AssignmentStatus | null;
  personel_summary?: string | null;
  personel_count?: number;
  has_file?: boolean;
  allowed_actions?: AssignmentAllowedActions;
}

export interface AssignmentDetail extends AssignmentListItem {
  kode_surat?: string | null;
  dasar_hukum?: string | null;
  sumber_dana?: string | null;
  template_type?: string | null;
  personel: AssignmentPersonel[];
  file: AssignmentFileState;
  allowed_actions: AssignmentAllowedActions;
}

export interface AssignmentQueryFilters {
  mode?: AssignmentListMode;
  page?: number;
  per_page?: number;
  search?: string;
  status?: AssignmentStatus;
  employee_id?: string | number;
}

export interface AssignmentStatusActionPayload {
  status: AssignmentStatus;
  nomor_surat?: string | null;
  reason?: string | null;
}
