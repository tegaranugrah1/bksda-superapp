# Issue #570 — Task: Manajemen Template Surat Tugas

> **Branch**: `development`
> **Issue**: #570
> **Dokumen terkait**: `requirements.md`, `design.md`
> **Status**: Implemented on branch `issue/570-st-template-management`; pending user review

## Implementation Status

- Backend template CRUD, pagination, API Resource, Form Request, role protection, active/default rules, duplicate, soft delete, signer snapshot, template versions, and audit middleware integration implemented.
- Built-in templates seeded and linked to the create form, including default Menimbang/Dasar and configuration for BMN/PLH.
- Surat Tugas stores `template_id`, `template_version`, and `template_snapshot` for draft/direct flows.
- Superadmin settings UI supports create/edit, signer selection, status, default, duplicate, and delete custom templates.
- Create form consumes active templates and applies default Menimbang/Dasar/signer/configuration.
- Validation passed: PHP syntax, Laravel Pint, route registration, migration dry-run, TypeScript, and frontend production build.
- PHPUnit could not be executed because the local PHPUnit binary is unavailable in `backend/vendor`.

## Phase 0 — Review dan Baseline

- [ ] Review requirement dan design bersama user.
- [ ] Konfirmasi apakah template bawaan diedit langsung atau memakai override.
- [ ] Konfirmasi scope default global versus per unit kerja.
- [ ] Catat struktur `st_templates` dan alur template pada halaman create saat ini.
- [ ] Pastikan perubahan kode lokal user tidak tertimpa.

## Phase 1 — Database dan Model

- [ ] Buat migration untuk menambah `code`, `description`, `type`, `configuration`, `is_system`, `is_active`, `is_default`, `default_signer_employee_id`, `default_signer_name`, `default_signer_nip`, `created_by`, dan `updated_by`.
- [ ] Tambahkan soft delete bila dipilih pada hasil review.
- [ ] Tambahkan unique index untuk `code`.
- [ ] Tambahkan foreign key nullable ke `kpg_employees` dengan aturan delete yang aman.
- [ ] Update `StTemplate::$fillable`.
- [ ] Update casts untuk JSON dan boolean.
- [ ] Tambahkan relasi `defaultSigner`, `creator`, dan `updater`.
- [ ] Buat `StTemplateSeeder` untuk template Default, Penghapusan BMN, Beda Hari, dan PLH.
- [ ] Pastikan seeder idempotent dan tidak menggandakan template.
- [ ] Tambahkan struktur snapshot template pada Surat Tugas saat dokumen dibuat/disimpan.

## Phase 2 — Backend Authorization dan Validation

- [ ] Buat permission atau policy khusus manajemen template.
- [ ] Pisahkan akses read template aktif dan akses read semua template untuk superadmin.
- [ ] Pindahkan validasi create ke `StoreStTemplateRequest`.
- [ ] Pindahkan validasi update ke `UpdateStTemplateRequest`.
- [ ] Validasi setiap item `menimbang` dan `dasar`.
- [ ] Validasi kode, tipe, penandatangan, konfigurasi, dan status.
- [ ] Pastikan operasi mutasi hanya dapat dilakukan superadmin/permission yang disepakati.
- [ ] Pastikan template sistem tidak dapat dihapus destruktif.
- [ ] Pastikan template yang telah dipakai tidak dapat dihapus destruktif.

## Phase 3 — Service dan API

- [ ] Buat `StTemplateService`.
- [ ] Buat `StTemplateResource`.
- [ ] Refactor `StTemplateController` agar tipis dan menggunakan service/request/resource.
- [ ] Implementasikan `GET /st-templates` dengan filter active/inactive.
- [ ] Implementasikan `GET /st-templates/{id}`.
- [ ] Implementasikan create dan update template.
- [ ] Implementasikan set default dengan database transaction.
- [ ] Implementasikan toggle active.
- [ ] Implementasikan duplicate template.
- [ ] Implementasikan penghapusan aman/soft delete template custom.
- [ ] Tambahkan aturan satu template default aktif.
- [ ] Tambahkan audit log pada setiap operasi mutasi.
- [ ] Dokumentasikan response error 401/403/404/409/422.

## Phase 4 — Halaman Manajemen Superadmin

- [ ] Refactor `settings/st-templates/page.tsx` menjadi komponen yang lebih kecil bila diperlukan.
- [ ] Tampilkan kolom tipe, status, system/custom, default, dan penandatangan.
- [ ] Tambahkan form kode dan deskripsi template.
- [ ] Tambahkan pilihan tipe template.
- [ ] Pertahankan editor dinamis Menimbang dan Dasar.
- [ ] Tambahkan `TemplateSignerPicker` memakai endpoint employee select.
- [ ] Tampilkan nama, NIP, dan jabatan penandatangan terpilih.
- [ ] Tambahkan toggle aktif/nonaktif.
- [ ] Tambahkan aksi jadikan default.
- [ ] Tambahkan aksi duplikasi.
- [ ] Bedakan aksi template sistem dan custom.
- [ ] Tambahkan dialog konfirmasi untuk aksi destruktif/perubahan penting.
- [ ] Tambahkan preview template sebelum disimpan.
- [ ] Tampilkan error validasi per field.
- [ ] Pastikan halaman tidak dapat dimutasi oleh admin/user walaupun URL dibuka langsung.

## Phase 5 — Integrasi Halaman Create Surat Tugas

- [ ] Hilangkan ketergantungan daftar template dinamis yang tersebar dari sumber hardcoded.
- [ ] Ambil daftar template aktif dari API.
- [ ] Tampilkan template sistem dan custom secara konsisten.
- [ ] Terapkan Menimbang dari template ke state form.
- [ ] Terapkan Dasar dari template ke state form.
- [ ] Terapkan penandatangan default dari template.
- [ ] Terapkan konfigurasi `type` untuk Default, BMN, Beda Hari, dan PLH.
- [ ] Terapkan template default saat halaman dibuka.
- [ ] Tambahkan konfirmasi sebelum mengganti template ketika form sudah berisi data.
- [ ] Pastikan edit item pada form tidak memutasi object template master.
- [ ] Pastikan fitur save template dari halaman create mengikuti aturan superadmin.
- [ ] Pertimbangkan mengarahkan pengelolaan template ke halaman settings agar tidak ada dua alur pengelolaan yang berbeda.

## Phase 6 — Snapshot dan Integritas Dokumen

- [ ] Tentukan kolom/JSON snapshot pada data Surat Tugas.
- [ ] Simpan template ID, kode, nama, versi, Menimbang, Dasar, signer, dan configuration saat create/update Surat Tugas.
- [ ] Pastikan print/preview memakai data dokumen tersimpan, bukan selalu membaca template master.
- [ ] Pastikan perubahan pegawai tidak mengubah signer pada dokumen lama.
- [ ] Tambahkan test bahwa perubahan template tidak mengubah dokumen lama.

## Phase 7 — Testing Backend

- [ ] Guest mendapat 401 pada endpoint protected.
- [ ] User mendapat 403 saat membuat template.
- [ ] Admin mendapat 403 saat mengubah template.
- [ ] Superadmin dapat create/update template.
- [ ] Superadmin dapat mengubah template sistem.
- [ ] Template sistem tidak dapat dihapus destruktif.
- [ ] Kode template duplikat ditolak.
- [ ] Payload Menimbang/Dasar invalid ditolak.
- [ ] Penandatangan invalid ditolak.
- [ ] Set default hanya menghasilkan satu template default aktif.
- [ ] Template nonaktif tidak muncul untuk user biasa.
- [ ] Template yang telah dipakai tetap memiliki snapshot.
- [ ] Audit log tercatat.
- [ ] Jalankan PHPUnit terkait dan seluruh suite backend.

## Phase 8 — Testing Frontend dan Manual QA

- [ ] Jalankan ESLint tanpa warning.
- [ ] Jalankan TypeScript check.
- [ ] Jalankan production build frontend.
- [ ] Uji login superadmin dan buka halaman settings.
- [ ] Uji create/edit/delete/duplicate template.
- [ ] Uji set default dan toggle active.
- [ ] Uji pemilihan signer.
- [ ] Uji admin/user hanya dapat menggunakan template.
- [ ] Uji pemilihan template pada `/kepegawaian/surat-tugas/create`.
- [ ] Uji perubahan sementara Menimbang, Dasar, dan signer.
- [ ] Uji print/preview setelah template dipilih.
- [ ] Uji responsive layout desktop dan mobile.
- [ ] Uji konflik update jika versioning/optimistic locking diterapkan.

## Phase 9 — Dokumentasi dan Deployment

- [ ] Update API/backend README jika endpoint berubah.
- [ ] Update progress tracker setelah implementasi selesai.
- [ ] Catat migration dan seeder yang harus dijalankan.
- [ ] Review environment dan deployment migration.
- [ ] Jalankan migration di staging terlebih dahulu.
- [ ] Smoke test production setelah deployment.
- [ ] Pastikan rollback migration dan rollback aplikasi dipahami.

## Definition of Done

- [ ] Acceptance criteria pada `requirements.md` terpenuhi.
- [ ] Otorisasi backend teruji untuk semua role.
- [ ] Template bawaan dan custom berasal dari sumber data yang konsisten.
- [ ] Superadmin dapat mengelola default Menimbang, Dasar, dan penandatangan.
- [ ] Admin/user hanya dapat menggunakan template aktif.
- [ ] Dokumen lama tidak berubah setelah template master diedit.
- [ ] Audit log dan error handling tersedia.
- [ ] Lint, typecheck, build, PHPUnit, dan QA manual selesai.
- [ ] Dokumentasi diperbarui.
