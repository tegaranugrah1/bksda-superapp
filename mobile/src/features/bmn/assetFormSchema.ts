import { z } from 'zod';

export const kondisiEnum = ['Baik', 'Rusak Ringan', 'Rusak Berat'] as const;

export const assetFormSchema = z.object({
  nama_barang: z
    .preprocess((val) => (val === undefined || val === null ? '' : String(val)), z.string())
    .refine((val) => val.trim().length > 0, { message: 'Nama barang wajib diisi' })
    .refine((val) => val.length <= 255, { message: 'Nama barang maksimal 255 karakter' }),

  kode_barang: z
    .preprocess((val) => (val === undefined || val === null ? '' : String(val)), z.string())
    .refine((val) => val.trim().length > 0, { message: 'Kode barang wajib diisi' })
    .refine((val) => val.length <= 50, { message: 'Kode barang maksimal 50 karakter' }),

  nup: z
    .preprocess((val) => (val === undefined || val === null ? '' : String(val)), z.string())
    .refine((val) => val.trim().length > 0, { message: 'NUP wajib diisi' })
    .refine((val) => val.length <= 50, { message: 'NUP maksimal 50 karakter' }),

  kondisi: z
    .preprocess((val) => (val === undefined || val === null ? '' : String(val)), z.string())
    .refine((val) => kondisiEnum.includes(val as any), {
      message: 'Kondisi harus: Baik, Rusak Ringan, atau Rusak Berat',
    }),

  nilai_perolehan: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().nullable())
    .optional()
    .nullable()
    .refine((val) => val === null || val >= 0, { message: 'Nilai perolehan tidak boleh negatif' }),

  jenis_bmn: z.string().optional().nullable(),
  merk: z.string().optional().nullable(),
  tipe: z.string().optional().nullable(),
  no_polisi: z.string().optional().nullable(),
  no_stnk: z.string().optional().nullable(),
  no_bpkb: z.string().optional().nullable(),
  no_mesin: z.string().optional().nullable(),
  no_rangka: z.string().optional().nullable(),
  tanggal_perolehan: z.string().optional().nullable(),
  lokasi_ruang: z.string().optional().nullable(),
  penanggung_jawab_id: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().nullable())
    .optional()
    .nullable(),
});

export type AssetFormData = z.infer<typeof assetFormSchema>;
