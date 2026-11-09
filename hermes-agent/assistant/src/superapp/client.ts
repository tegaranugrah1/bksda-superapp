import axios, { AxiosInstance } from 'axios';

export interface EmployeeInfo {
  id: number;
  nip: string;
  nama_lengkap: string;
  jabatan?: string;
  pangkat_golongan?: string;
  satuan_kerja?: string;
  telepon?: string;
  role?: string;
}

export interface LeaveBalanceData {
  employee: {
    id: number;
    nip: string;
    nama_lengkap: string;
    satuan_kerja?: string;
  };
  year: number;
  hak_cuti_n: number;
  sisa_cuti_n0: number;
  sisa_cuti_n1: number;
  sisa_cuti_n2: number;
  total_tersedia: number;
  pending_pengajuan: number;
  sisa_dapat_diajukan: number;
  can_apply: boolean;
}

export interface LeaveRequestPayload {
  nip: string;
  jenis_cuti?: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan_cuti: string;
  alamat_menjalankan_cuti?: string;
  telepon?: string;
  idempotency_key?: string;
}

export interface DraftStPayload {
  maksud_tujuan: string;
  tempat_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  personil_nips?: string[];
  sumber_dana?: string;
}

export class SuperAppClient {
  private api: AxiosInstance;

  constructor() {
    const baseURL = process.env.SUPERAPP_API_URL || 'http://192.168.100.203';
    const internalKey = process.env.SUPERAPP_INTERNAL_KEY;
    if (!internalKey) throw new Error('SUPERAPP_INTERNAL_KEY must be configured.');

    this.api = axios.create({
      baseURL: `${baseURL}/api/agent/v1`,
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Agent-Internal-Key': internalKey,
      },
    });
  }

  async verifyPhone(phone: string): Promise<{ success: boolean; data?: EmployeeInfo; message?: string }> {
    try {
      const res = await this.api.post('/auth/verify-phone', { phone });
      return { success: true, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      return { success: false, message: msg };
    }
  }

  async getLeaveBalance(nip: string): Promise<{ success: boolean; data?: LeaveBalanceData; message?: string }> {
    try {
      const res = await this.api.get(`/employees/${nip}/leaves`);
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  async submitLeaveRequest(payload: LeaveRequestPayload): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await this.api.post('/leaves/request', payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  async getActiveSuratTugas(nip: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await this.api.get(`/employees/${nip}/surat-tugas/active`);
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  async createDraftSuratTugas(payload: DraftStPayload): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await this.api.post('/surat-tugas/draft', payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }
}
