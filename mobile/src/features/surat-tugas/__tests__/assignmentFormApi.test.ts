import {
  createAssignment,
  toAssignmentFormPayload,
  updateAssignment,
} from '../assignmentFormApi';
import { apiClient } from '@/lib/api/client';
import { AssignmentFormData } from '../assignmentFormSchema';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));

describe('assignmentFormApi', () => {
  const formData: AssignmentFormData = {
    nomor_surat: 'ST.001/BKSDA/2026',
    kode_surat: 'ST',
    tanggal_surat: '2026-06-19',
    maksud_tujuan: 'Patroli kawasan konservasi',
    dasar_hukum: 'Dasar hukum',
    tanggal_mulai: '2026-06-20',
    tanggal_selesai: '2026-06-21',
    tempat_tujuan: 'Samarinda',
    sumber_dana: 'lainnya',
    sumber_dana_other: 'Mitra',
    template_type: 'default',
    menimbang: ['Menimbang satu'],
    dasar: ['Dasar satu'],
    tembusan: ['Tembusan satu'],
    penandatangan_nama: 'Kepala Balai',
    penandatangan_nip: '197001012000011001',
    transport_required: true,
    transportasi: 'Kendaraan dinas',
    employees: [
      { id: 12, peran: 'Ketua Tim' },
      { id: '13' as any, peran: '' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps form data to backend payload', () => {
    expect(toAssignmentFormPayload(formData)).toEqual({
      nomor_surat: 'ST.001/BKSDA/2026',
      kode_surat: 'ST',
      tanggal_surat: '2026-06-19',
      maksud_tujuan: 'Patroli kawasan konservasi',
      dasar_hukum: 'Dasar hukum',
      tanggal_mulai: '2026-06-20',
      tanggal_selesai: '2026-06-21',
      tempat_tujuan: 'Samarinda',
      sumber_dana: 'lainnya',
      sumber_dana_other: 'Mitra',
      template_type: 'default',
      menimbang: ['Menimbang satu'],
      dasar: ['Dasar satu'],
      tembusan: ['Tembusan satu'],
      penandatangan_nama: 'Kepala Balai',
      penandatangan_nip: '197001012000011001',
      transportasi: 'Kendaraan dinas',
      employees: [
        { id: 12, peran: 'Ketua Tim' },
        { id: 13, peran: null },
      ],
    });
  });

  it('omits transport when transport is not required', () => {
    expect(
      toAssignmentFormPayload({
        ...formData,
        transport_required: false,
        transportasi: 'Kendaraan dinas',
      }).transportasi
    ).toBeNull();
  });

  it('posts create payload to the Surat Tugas endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { data: { id: 'st-new' } },
    });

    const result = await createAssignment(formData);

    expect(apiClient.post).toHaveBeenCalledWith('/surat-tugas', expect.objectContaining({
      maksud_tujuan: 'Patroli kawasan konservasi',
      employees: expect.arrayContaining([{ id: 12, peran: 'Ketua Tim' }]),
    }));
    expect(result).toEqual({ id: 'st-new' });
  });

  it('puts update payload to the Surat Tugas endpoint', async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { data: { id: 'st-1' } },
    });

    const result = await updateAssignment('st-1', formData);

    expect(apiClient.put).toHaveBeenCalledWith('/surat-tugas/st-1', expect.objectContaining({
      maksud_tujuan: 'Patroli kawasan konservasi',
    }));
    expect(result).toEqual({ id: 'st-1' });
  });
});
