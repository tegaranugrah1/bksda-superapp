import { assignmentFormSchema } from '../assignmentFormSchema';

describe('assignmentFormSchema', () => {
  const validPayload = {
    nomor_surat: 'ST.001/BKSDA/2026',
    kode_surat: 'ST',
    tanggal_surat: '2026-06-19',
    maksud_tujuan: 'Patroli kawasan konservasi',
    dasar_hukum: 'Surat permohonan patroli',
    tanggal_mulai: '2026-06-20',
    tanggal_selesai: '2026-06-21',
    tempat_tujuan: 'Samarinda',
    sumber_dana: 'dipa',
    sumber_dana_other: '',
    template_type: 'default',
    menimbang: ['Bahwa perlu dilakukan patroli'],
    dasar: ['Undang-undang konservasi'],
    tembusan: ['Kepala Balai'],
    penandatangan_nama: 'Kepala Balai',
    penandatangan_nip: '197001012000011001',
    transport_required: false,
    transportasi: '',
    employees: [
      {
        id: '12',
        peran: 'Ketua Tim',
      },
    ],
  };

  it('validates a complete Surat Tugas payload and normalizes form values', () => {
    const result = assignmentFormSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maksud_tujuan).toBe('Patroli kawasan konservasi');
      expect(result.data.sumber_dana_other).toBeNull();
      expect(result.data.transportasi).toBeNull();
      expect(result.data.employees[0].id).toBe(12);
      expect(result.data.employees[0].peran).toBe('Ketua Tim');
    }
  });

  it('fails validation with Indonesian messages when required fields are missing', () => {
    const result = assignmentFormSchema.safeParse({
      employees: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.maksud_tujuan).toContain('Maksud dan tujuan wajib diisi');
      expect(errors.tanggal_mulai).toContain('Tanggal mulai wajib diisi');
      expect(errors.tanggal_selesai).toContain('Tanggal selesai wajib diisi');
      expect(errors.tempat_tujuan).toContain('Tempat tujuan wajib diisi');
      expect(errors.sumber_dana).toContain('Sumber dana wajib dipilih');
      expect(errors.employees).toContain('Pilih minimal satu pegawai untuk Surat Tugas');
    }
  });

  it('fails validation when the activity description is too short', () => {
    const result = assignmentFormSchema.safeParse({
      ...validPayload,
      maksud_tujuan: 'Patroli',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.maksud_tujuan).toContain(
        'Maksud dan tujuan minimal 10 karakter'
      );
    }
  });

  it('fails validation when the end date is before the start date', () => {
    const result = assignmentFormSchema.safeParse({
      ...validPayload,
      tanggal_mulai: '2026-06-22',
      tanggal_selesai: '2026-06-21',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.tanggal_selesai).toContain(
        'Tanggal selesai tidak boleh sebelum tanggal mulai'
      );
    }
  });

  it('fails validation when date string format is invalid', () => {
    const invalidFormats = [
      '20-06-2026', // DD-MM-YYYY
      '2026/06/20', // YYYY/MM/DD
      '2026-6-20',   // missing leading zeros
      'invalid-date',
      '2026-06-32',  // invalid day (Date.parse is NaN)
      '2026-13-01',  // invalid month (Date.parse is NaN)
    ];

    for (const invalidDate of invalidFormats) {
      const result = assignmentFormSchema.safeParse({
        ...validPayload,
        tanggal_mulai: invalidDate,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.tanggal_mulai).toContain(
          'Tanggal harus berformat YYYY-MM-DD'
        );
      }
    }
  });

  it('requires funding detail when sumber_dana is lainnya', () => {
    const result = assignmentFormSchema.safeParse({
      ...validPayload,
      sumber_dana: 'lainnya',
      sumber_dana_other: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.sumber_dana_other).toContain(
        'Detail sumber dana wajib diisi'
      );
    }
  });

  it('requires transport when transport_required is true', () => {
    const result = assignmentFormSchema.safeParse({
      ...validPayload,
      transport_required: true,
      transportasi: '   ',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.transportasi).toContain('Transportasi wajib diisi');
    }
  });

  it('fails validation when a selected employee has no valid id', () => {
    const result = assignmentFormSchema.safeParse({
      ...validPayload,
      employees: [{ id: '', peran: 'Anggota' }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.employees?.join(' ')).toContain('Pegawai wajib dipilih');
    }
  });
});
