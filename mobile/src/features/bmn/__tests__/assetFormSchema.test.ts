import { assetFormSchema } from '../assetFormSchema';

describe('assetFormSchema', () => {
  it('validates a correct payload successfully', () => {
    const validData = {
      nama_barang: 'Kamera Canon',
      kode_barang: 'BMN-123',
      nup: '4',
      kondisi: 'Baik',
      nilai_perolehan: 12000000,
      jenis_bmn: 'Peralatan Kantor',
      merk: 'Canon',
      tipe: 'EOS R10',
      no_polisi: 'B 1234 XYZ',
      no_stnk: 'STNK-456',
      no_bpkb: 'BPKB-789',
      no_mesin: 'MESIN-111',
      no_rangka: 'RANGKA-222',
      tanggal_perolehan: '2025-01-10',
      lokasi_ruang: 'Lantai 2',
      penanggung_jawab_id: 15,
    };

    const result = assetFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nup).toBe('4');
      expect(result.data.nilai_perolehan).toBe(12000000);
      expect(result.data.penanggung_jawab_id).toBe(15);
    }
  });

  it('fails validation when required fields are missing', () => {
    const emptyData = {};
    const result = assetFormSchema.safeParse(emptyData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.nama_barang).toContain('Nama barang wajib diisi');
      expect(errors.kode_barang).toContain('Kode barang wajib diisi');
      expect(errors.nup).toContain('NUP wajib diisi');
      expect(errors.kondisi).toContain('Kondisi harus: Baik, Rusak Ringan, atau Rusak Berat');
    }
  });

  it('fails validation when required fields are empty strings', () => {
    const emptyStrings = {
      nama_barang: '',
      kode_barang: '',
      nup: '   ',
      kondisi: 'Rusak', // Invalid enum
    };
    const result = assetFormSchema.safeParse(emptyStrings);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.nama_barang).toContain('Nama barang wajib diisi');
      expect(errors.kode_barang).toContain('Kode barang wajib diisi');
      expect(errors.nup).toContain('NUP wajib diisi');
      expect(errors.kondisi).toContain('Kondisi harus: Baik, Rusak Ringan, atau Rusak Berat');
    }
  });

  it('validates and transforms numeric types and inputs correctly', () => {
    const mixedTypes = {
      nama_barang: 'Meja Rapat',
      kode_barang: 'BMN-999',
      nup: 105, // Number input for NUP
      kondisi: 'Rusak Ringan',
      nilai_perolehan: '4500000', // String input for value
      penanggung_jawab_id: '8', // String input for ID
    };

    const result = assetFormSchema.safeParse(mixedTypes);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nup).toBe('105');
      expect(result.data.nilai_perolehan).toBe(4500000);
      expect(result.data.penanggung_jawab_id).toBe(8);
    }
  });

  it('fails validation when nilai_perolehan is negative', () => {
    const invalidNegative = {
      nama_barang: 'AC Daikin',
      kode_barang: 'BMN-555',
      nup: '12',
      kondisi: 'Baik',
      nilai_perolehan: -500000,
    };

    const result = assetFormSchema.safeParse(invalidNegative);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.nilai_perolehan).toContain('Nilai perolehan tidak boleh negatif');
    }
  });

  it('fails validation when string fields exceed maximum length limits', () => {
    const longNamePayload = {
      nama_barang: 'A'.repeat(256),
      kode_barang: 'BMN-XYZ',
      nup: '1',
      kondisi: 'Baik',
    };

    const longCodePayload = {
      nama_barang: 'Kursi Lipat',
      kode_barang: 'B'.repeat(51),
      nup: '1',
      kondisi: 'Baik',
    };

    const longNupPayload = {
      nama_barang: 'Kursi Lipat',
      kode_barang: 'BMN-XYZ',
      nup: '9'.repeat(51),
      kondisi: 'Baik',
    };

    const resName = assetFormSchema.safeParse(longNamePayload);
    expect(resName.success).toBe(false);
    if (!resName.success) {
      expect(resName.error.flatten().fieldErrors.nama_barang).toContain(
        'Nama barang maksimal 255 karakter'
      );
    }

    const resCode = assetFormSchema.safeParse(longCodePayload);
    expect(resCode.success).toBe(false);
    if (!resCode.success) {
      expect(resCode.error.flatten().fieldErrors.kode_barang).toContain(
        'Kode barang maksimal 50 karakter'
      );
    }

    const resNup = assetFormSchema.safeParse(longNupPayload);
    expect(resNup.success).toBe(false);
    if (!resNup.success) {
      expect(resNup.error.flatten().fieldErrors.nup).toContain(
        'NUP maksimal 50 karakter'
      );
    }
  });

  it('handles optional fields with null/undefined values', () => {
    const sparseData = {
      nama_barang: 'Gedung Kantor',
      kode_barang: 'BMN-GDG',
      nup: '1',
      kondisi: 'Baik',
      nilai_perolehan: null,
      jenis_bmn: undefined,
      merk: '',
    };

    const result = assetFormSchema.safeParse(sparseData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nilai_perolehan).toBeNull();
      expect(result.data.jenis_bmn).toBeUndefined();
      expect(result.data.merk).toBe('');
    }
  });
});
