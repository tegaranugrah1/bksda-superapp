import {
  DEFAULT_TASK_TYPES, detectDeparture, personalAssignmentEntries,
  validateAssignmentFile, validatePortalAssignment, type PortalAssignmentDraft,
} from '../assignmentPortalForm';

const employee = { id: 1, name: 'Budi', nip: '0001', department: 'Kantor Balai' };
const draft = (patch: Partial<PortalAssignmentDraft> = {}): PortalAssignmentDraft => ({
  employees: [employee], taskType: DEFAULT_TASK_TYPES[0], kotaAsal: 'Samarinda', kotaTujuan: 'Berau',
  namaKegiatanText: 'patroli satwa liar', tempatSpesifik: 'Hutan Lindung',
  tanggalMulai: '2026-11-20', tanggalSelesai: '2026-11-23', sumberDana: 'DIPA', sumberDanaOther: '',
  keterangan: '', namaPlh: '', tandaSetuju: '', bedaHari: false, employeeDates: {}, jumlahBuruh: 0,
  ...patch,
});

describe('personal Surat Tugas portal parity', () => {
  it('validates the minimal public submission and never sends approval or letter-number overrides', () => {
    expect(validatePortalAssignment(draft())).toBeNull();
    const payload = Object.fromEntries(personalAssignmentEntries(draft()));
    expect(payload['employees[0][id]']).toBe('1');
    expect(payload.template_type).toBe('standard');
    expect(payload.maksud_tujuan).toContain('dari Samarinda ke Berau');
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('nomor_surat');
  });

  it.each([
    { employees: [] }, { namaKegiatanText: 'abc' }, { kotaAsal: '' },
    { tanggalMulai: '2026-02-30' }, { tanggalSelesai: '2026-11-19' },
    { sumberDana: '' }, { sumberDana: 'other', sumberDanaOther: '' },
    { jumlahBuruh: 101 }, { jumlahBuruh: 1.5 },
  ])('rejects invalid input %j', patch => {
    expect(validatePortalAssignment(draft(patch))).not.toBeNull();
  });

  it('detects section III before II/I and supports mixed departure cities and backend flags', () => {
    expect(detectDeparture([{ ...employee, department: 'SKW III Balikpapan' }])).toBe('Balikpapan');
    expect(detectDeparture([{ ...employee, seksi_wilayah: 'II' }])).toBe('Tenggarong');
    expect(detectDeparture([{ ...employee, seksi_wilayah: 'I' }, { ...employee, id: 2, seksi_wilayah: 'III' }])).toBe('Berau dan Balikpapan');
  });

  it('requires section agreement and PLH only for the relevant participants', () => {
    const special = { ...employee, is_seksi: true, position: 'Kepala Seksi Wilayah III' };
    expect(validatePortalAssignment(draft({ employees: [special] }))).toContain('PLH');
    expect(validatePortalAssignment(draft({ employees: [special], namaPlh: 'Ayu' }))).toContain('Kepala Seksi');
    expect(validatePortalAssignment(draft({ employees: [special], namaPlh: 'Ayu', tandaSetuju: 'sudah' }))).toBeNull();
    const plain = Object.fromEntries(personalAssignmentEntries(draft({ namaPlh: 'Stale PLH', tandaSetuju: 'sudah' })));
    expect(plain).not.toHaveProperty('nama_plh');
    expect(plain).not.toHaveProperty('tanda_setuju');
  });

  it('supports per-employee dates, PM count, configured task ID/report flag and funding details', () => {
    const data = draft({
      employees: [employee, { ...employee, id: 2, name: 'Ayu' }], bedaHari: true, jumlahBuruh: 2,
      employeeDates: { '1': { mulai: '2026-11-20', selesai: '2026-11-21' }, '2': { mulai: '2026-11-22', selesai: '2026-11-23' } },
      taskType: { ...DEFAULT_TASK_TYPES[0], id: 11, default_sertakan_laporan: false },
      sumberDana: 'other', sumberDanaOther: 'Dana Mitra', keterangan: 'Koordinasi lapangan.',
    });
    expect(validatePortalAssignment(data)).toBeNull();
    const payload = Object.fromEntries(personalAssignmentEntries(data));
    expect(payload.template_type).toBe('beda-hari');
    expect(payload['employees[1][tanggal_mulai]']).toBe('2026-11-22');
    expect(payload['template_snapshot[configuration][show_departure_column]']).toBe('0');
    expect(payload.keterangan).toContain('[Jadwal Personel Berbeda Hari]');
    expect(payload.keterangan).toContain('3. PM:');
    expect(payload.sumber_dana_other).toBe('Dana Mitra');
    expect(payload.task_type_id).toBe('11');
    expect(payload.sertakan_laporan).toBe('0');
    expect(payload.jumlah_buruh).toBe('2');
  });

  it('rejects incomplete/out-of-period personal schedules and multi-day single-day tasks', () => {
    expect(validatePortalAssignment(draft({ bedaHari: true }))).toContain('Lengkapi jadwal');
    expect(validatePortalAssignment(draft({ bedaHari: true, employeeDates: { '1': { mulai: '2026-11-19', selesai: '2026-11-23' } } }))).toContain('periode');
    expect(validatePortalAssignment(draft({ taskType: DEFAULT_TASK_TYPES[2] }))).toContain('satu hari');
  });

  it('accepts supported 10MB attachments and rejects wrong extensions/MIME/oversize', () => {
    expect(validateAssignmentFile({ name: 'dasar.PDF', mimeType: 'application/pdf', size: 10 * 1024 * 1024 })).toBeNull();
    expect(validateAssignmentFile({ name: 'foto.png', mimeType: 'image/png', size: 1024 })).toBeNull();
    expect(validateAssignmentFile({ name: 'berkas.pdf.exe', mimeType: 'application/pdf' })).not.toBeNull();
    expect(validateAssignmentFile({ name: 'berkas.pdf', mimeType: 'text/html' })).not.toBeNull();
    expect(validateAssignmentFile({ name: 'besar.pdf', size: 10 * 1024 * 1024 + 1 })).toContain('10 MB');
  });
});
