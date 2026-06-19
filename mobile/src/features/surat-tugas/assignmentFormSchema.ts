import { z } from 'zod';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const toTrimmedString = (value: unknown) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
};

const requiredString = (message: string, max?: number) => {
  const schema = z.preprocess(
    toTrimmedString,
    z.string().min(1, message)
  );

  return max ? schema.pipe(z.string().max(max, `Maksimal ${max} karakter`)) : schema;
};

const optionalString = (max?: number) => {
  const schema = z.preprocess((value) => {
    const text = toTrimmedString(value);
    return text === '' ? null : text;
  }, z.string().nullable());

  return max ? schema.pipe(z.string().max(max, `Maksimal ${max} karakter`).nullable()) : schema;
};

const requiredDateString = (message: string) =>
  requiredString(message).refine((value) => datePattern.test(value) && !Number.isNaN(Date.parse(value)), {
    message: 'Tanggal harus berformat YYYY-MM-DD',
  });

const employeeIdSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}, z.custom<number>((value) => typeof value === 'number' && value > 0, 'Pegawai wajib dipilih'));

export const assignmentEmployeeSchema = z.object({
  id: employeeIdSchema,
  peran: optionalString(100).optional().nullable(),
});

export const assignmentFormSchema = z
  .object({
    nomor_surat: optionalString().optional().nullable(),
    kode_surat: optionalString().optional().nullable(),
    tanggal_surat: optionalString().optional().nullable(),
    maksud_tujuan: z.preprocess(
      toTrimmedString,
      z
        .string()
        .min(1, 'Maksud dan tujuan wajib diisi')
        .min(10, 'Maksud dan tujuan minimal 10 karakter')
    ),
    dasar_hukum: optionalString().optional().nullable(),
    tanggal_mulai: requiredDateString('Tanggal mulai wajib diisi'),
    tanggal_selesai: requiredDateString('Tanggal selesai wajib diisi'),
    tempat_tujuan: requiredString('Tempat tujuan wajib diisi', 255),
    sumber_dana: requiredString('Sumber dana wajib dipilih'),
    sumber_dana_other: optionalString().optional().nullable(),
    template_type: optionalString(50).optional().nullable(),
    menimbang: z.array(z.string()).optional().nullable(),
    dasar: z.array(z.string()).optional().nullable(),
    tembusan: z.array(z.string()).optional().nullable(),
    penandatangan_nama: optionalString(255).optional().nullable(),
    penandatangan_nip: optionalString(50).optional().nullable(),
    transport_required: z.boolean().optional().default(false),
    transportasi: optionalString(100).optional().nullable(),
    employees: z
      .array(assignmentEmployeeSchema)
      .min(1, 'Pilih minimal satu pegawai untuk Surat Tugas'),
  })
  .superRefine((value, context) => {
    if (Date.parse(value.tanggal_selesai) < Date.parse(value.tanggal_mulai)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tanggal_selesai'],
        message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
      });
    }

    const requiresOtherFunding = ['lainnya', 'other'].includes(value.sumber_dana.toLowerCase());
    if (requiresOtherFunding && !value.sumber_dana_other) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sumber_dana_other'],
        message: 'Detail sumber dana wajib diisi',
      });
    }

    if (value.transport_required && !value.transportasi) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transportasi'],
        message: 'Transportasi wajib diisi',
      });
    }
  });

export type AssignmentEmployeeFormData = z.infer<typeof assignmentEmployeeSchema>;
export type AssignmentFormData = z.infer<typeof assignmentFormSchema>;
