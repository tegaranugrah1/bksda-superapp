import { apiClient } from '@/lib/api/client';
import { AssignmentFormData } from './assignmentFormSchema';
import { AssignmentDetail } from './types';

export type AssignmentFormPayload = {
  nomor_surat?: string | null;
  kode_surat?: string | null;
  tanggal_surat?: string | null;
  maksud_tujuan: string;
  dasar_hukum?: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tempat_tujuan: string;
  sumber_dana: string;
  sumber_dana_other?: string | null;
  template_type?: string | null;
  menimbang?: string[] | null;
  dasar?: string[] | null;
  tembusan?: string[] | null;
  penandatangan_nama?: string | null;
  penandatangan_nip?: string | null;
  transportasi?: string | null;
  employees: {
    id: number;
    peran?: string | null;
  }[];
};

export function toAssignmentFormPayload(data: AssignmentFormData): AssignmentFormPayload {
  return {
    nomor_surat: data.nomor_surat || null,
    kode_surat: data.kode_surat || null,
    tanggal_surat: data.tanggal_surat || null,
    maksud_tujuan: data.maksud_tujuan,
    dasar_hukum: data.dasar_hukum || null,
    tanggal_mulai: data.tanggal_mulai,
    tanggal_selesai: data.tanggal_selesai,
    tempat_tujuan: data.tempat_tujuan,
    sumber_dana: data.sumber_dana,
    sumber_dana_other: data.sumber_dana_other || null,
    template_type: data.template_type || null,
    menimbang: data.menimbang || null,
    dasar: data.dasar || null,
    tembusan: data.tembusan || null,
    penandatangan_nama: data.penandatangan_nama || null,
    penandatangan_nip: data.penandatangan_nip || null,
    transportasi: data.transport_required ? data.transportasi || null : null,
    employees: data.employees.map((employee) => ({
      id: Number(employee.id),
      peran: employee.peran || null,
    })),
  };
}

export async function createAssignment(data: AssignmentFormData): Promise<AssignmentDetail | { id: string | number }> {
  const response = await apiClient.post('/surat-tugas', toAssignmentFormPayload(data));
  return response.data.data;
}

export async function updateAssignment(
  id: string | number,
  data: AssignmentFormData
): Promise<AssignmentDetail | { id: string | number }> {
  const response = await apiClient.put(`/surat-tugas/${id}`, toAssignmentFormPayload(data));
  return response.data.data;
}
