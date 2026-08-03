import { z } from 'zod';

export const kondisiEnum = ['Baik', 'Rusak Ringan', 'Rusak Berat'] as const;

export const assetFormSchema = z.object({
  nama_barang: z.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val)),
    z.string().trim().min(1, 'Nama barang wajib diisi').max(255, 'Nama barang maksimal 255 karakter')
  ),

  kode_barang: z.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val)),
    z.string().trim().min(1, 'Kode barang wajib diisi').max(50, 'Kode barang maksimal 50 karakter')
  ),

  nup: z.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val)),
    z.string().trim().min(1, 'NUP wajib diisi').max(50, 'NUP maksimal 50 karakter')
  ),

  kondisi: z.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val)),
    z.string().refine((val) => kondisiEnum.includes(val as any), {
      message: 'Kondisi harus: Baik, Rusak Ringan, atau Rusak Berat',
    })
  ),

  nilai_perolehan: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const digitsOnly = String(val).replace(/\D/g, '');
      if (!digitsOnly) return null;
      const num = Number(digitsOnly);
      return isNaN(num) ? null : num;
    },
    z.number().min(0, 'Nilai perolehan tidak boleh negatif').nullable()
  ).optional().nullable(),

  nilai_penyusutan: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const digitsOnly = String(val).replace(/\D/g, '');
      if (!digitsOnly) return null;
      const num = Number(digitsOnly);
      return isNaN(num) ? null : num;
    },
    z.number().min(0, 'Nilai penyusutan tidak boleh negatif').nullable()
  ).optional().nullable(),

  nilai_buku: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const digitsOnly = String(val).replace(/\D/g, '');
      if (!digitsOnly) return null;
      const num = Number(digitsOnly);
      return isNaN(num) ? null : num;
    },
    z.number().min(0, 'Nilai buku tidak boleh negatif').nullable()
  ).optional().nullable(),

  jenis_bmn: z.string().optional().nullable(),
  merk: z.string().optional().nullable(),
  tipe: z.string().optional().nullable(),
  no_polisi: z.string().optional().nullable(),
  no_stnk: z.string().optional().nullable(),
  no_bpkb: z.string().optional().nullable(),
  no_mesin: z.string().optional().nullable(),
  no_rangka: z.string().optional().nullable(),
  tanggal_perolehan: z.string().optional().nullable(),
  tanggal_pajak_stnk: z.string().optional().nullable(),
  tanggal_ganti_plat: z.string().optional().nullable(),
  lokasi_ruang: z.string().optional().nullable(),
  pengguna: z.string().optional().nullable(),
  penanggung_jawab_id: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().nullable()
  ).optional().nullable(),
});

export type AssetFormData = z.infer<typeof assetFormSchema>;
