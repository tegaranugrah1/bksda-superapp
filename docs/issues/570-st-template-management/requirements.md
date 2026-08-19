# Issue #570 — Manajemen Template Surat Tugas oleh Superadmin

> **Type**: `feature` / `security` / `database`
> **Branch**: `development`
> **GitHub**: https://github.com/tegaranugrah1/bksda-superapp/issues/570
> **Priority**: High
> **Status**: Draft untuk review

## 1. Latar Belakang

Halaman `/kepegawaian/surat-tugas/create` saat ini sudah mendukung pilihan template seperti Default, Penghapusan BMN, Beda Hari, PLH, dan template dinamis. Project juga sudah memiliki fondasi `st_templates` dan halaman manajemen template.

Namun, konfigurasi template belum sepenuhnya terpusat. Saat ini template terutama menyimpan nama, Menimbang, dan Dasar. Default penandatangan, status template, template bawaan, template default, serta aturan perubahan template masih perlu disempurnakan.

## 2. Tujuan

Membangun sumber data template Surat Tugas yang dikelola terpusat sehingga:

1. Superadmin dapat membuat, mengubah, mengaktifkan/nonaktifkan, dan mengatur template.
2. Superadmin dapat mengubah default Menimbang dan Dasar.
3. Superadmin dapat mengatur penandatangan default untuk setiap template.
4. Template bawaan dan template custom menggunakan mekanisme yang konsisten.
5. Admin dan user hanya dapat melihat dan menggunakan template aktif.
6. Perubahan pada form Surat Tugas tidak mengubah template master.
7. Surat Tugas yang sudah disimpan tetap memiliki snapshot konfigurasi yang digunakan.

## 3. Aktor dan Hak Akses

### Superadmin

- Melihat semua template, termasuk template nonaktif.
- Membuat template custom.
- Mengubah template custom dan template sistem.
- Mengubah Menimbang, Dasar, konfigurasi, dan penandatangan default.
- Mengaktifkan/nonaktifkan template.
- Menetapkan satu template aktif sebagai default.
- Menggandakan template.
- Menghapus template custom jika belum digunakan; template sistem tidak boleh dihapus destruktif.

### Admin

- Melihat template aktif.
- Menggunakan template saat membuat Surat Tugas.
- Mengubah hasil salinan template pada form Surat Tugas.
- Tidak dapat membuat, mengubah, menghapus, atau menetapkan template master.

### User

- Memiliki akses yang sama dengan admin untuk penggunaan template sesuai permission modulnya.
- Tidak dapat mengubah template master.

Semua pembatasan wajib ditegakkan di backend. Penyembunyian tombol di frontend hanya untuk pengalaman pengguna.

## 4. Kebutuhan Fungsional

### FR-01 — Daftar Template

Sistem menyediakan daftar template dengan informasi:

- Nama
- Kode unik
- Tipe template
- Status aktif/nonaktif
- Penanda template sistem/custom
- Penanda template default
- Penandatangan default
- Waktu dan pengguna terakhir mengubah

### FR-02 — Membuat Template

Superadmin dapat membuat template dengan minimal:

- Nama template
- Kode template
- Tipe template
- Daftar Menimbang
- Daftar Dasar
- Penandatangan default opsional
- Konfigurasi tambahan opsional

### FR-03 — Mengubah Template

Superadmin dapat mengubah template tanpa mengubah Surat Tugas lama yang sudah tersimpan.

### FR-04 — Mengubah Template Bawaan

Template bawaan seperti Default, Penghapusan BMN, Beda Hari, dan PLH dikelola melalui database. Template sistem boleh diedit dan dinonaktifkan, tetapi tidak boleh dihapus secara destruktif.

### FR-05 — Default Menimbang dan Dasar

Saat template dipilih pada halaman create, sistem mengisi daftar Menimbang dan Dasar dari template terpilih. Pengguna tetap dapat mengubah salinan tersebut untuk dokumen yang sedang dibuat.

### FR-06 — Penandatangan Default

Superadmin dapat memilih pegawai sebagai penandatangan default. Sistem menyimpan employee ID serta snapshot nama dan NIP untuk menjaga konsistensi dokumen.

### FR-07 — Template Default

Superadmin dapat menetapkan satu template aktif sebagai default. Template tersebut otomatis terpilih saat halaman create dibuka, kecuali terdapat template yang ditentukan melalui URL atau alur khusus.

### FR-08 — Status Aktif

Template nonaktif tidak ditampilkan pada pilihan template admin/user dan tidak dapat digunakan untuk dokumen baru. Template lama yang sudah digunakan tetap dapat dibaca dari snapshot-nya.

### FR-09 — Duplikasi Template

Superadmin dapat menggandakan template untuk membuat template baru tanpa mengubah template sumber.

### FR-10 — Snapshot Surat Tugas

Saat Surat Tugas disimpan, sistem menyimpan referensi dan snapshot minimal:

- Template ID/kode/nama
- Versi template
- Menimbang
- Dasar
- Penandatangan nama/NIP/employee ID
- Konfigurasi yang diterapkan

### FR-11 — Audit

Perubahan penting dicatat dalam audit log:

- Membuat template
- Mengubah template
- Menetapkan default
- Mengubah status aktif
- Mengubah penandatangan
- Menghapus atau mengarsipkan template

## 5. Kebutuhan Nonfungsional

- Otorisasi dilakukan di backend menggunakan middleware/policy/permission yang konsisten.
- Validasi payload dilakukan melalui Laravel Form Request.
- Operasi penetapan default menggunakan transaction.
- Kode template harus unik.
- Error API tidak membocorkan stack trace atau data sensitif.
- Perubahan template tidak boleh mengubah isi dokumen lama.
- UI tetap dapat digunakan pada desktop dan layar kecil.
- Operasi simpan, ubah, dan hapus menampilkan status loading serta feedback yang jelas.

## 6. Acceptance Criteria

- [ ] Superadmin dapat membuat template baru.
- [ ] Superadmin dapat mengubah Menimbang dan Dasar template.
- [ ] Superadmin dapat mengubah penandatangan default.
- [ ] Superadmin dapat mengubah template bawaan.
- [ ] Superadmin dapat menetapkan satu template aktif sebagai default.
- [ ] Admin dan user dapat memilih template aktif di halaman create.
- [ ] Admin dan user tidak dapat memutasi template melalui API.
- [ ] Template nonaktif tidak muncul untuk admin/user.
- [ ] Perubahan pada form Surat Tugas tidak mengubah template master.
- [ ] Surat Tugas menyimpan snapshot template dan penandatangan.
- [ ] Template sistem tidak dapat dihapus secara destruktif.
- [ ] Perubahan penting masuk audit log.
- [ ] Backend authorization, validation, frontend typecheck/lint, dan test terkait berhasil.
