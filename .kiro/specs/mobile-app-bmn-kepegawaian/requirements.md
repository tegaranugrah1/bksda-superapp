# Requirements Document

## Introduction

Mobile App BKSDA Kalimantan Timur SuperApp adalah aplikasi mobile resmi untuk mengakses fitur operasional internal BKSDA dari perangkat Android terlebih dahulu, dengan kesiapan desain untuk iOS pada fase berikutnya.

Aplikasi mobile ini dipakai oleh semua role yang saat ini sudah ada di aplikasi web. Hak akses fitur, data, dan aksi mengikuti role, module access, dan permission backend yang berlaku. Mobile app tidak menggantikan web dashboard sepenuhnya, tetapi menyediakan akses mobile untuk pekerjaan utama yang wajar dilakukan dari perangkat pegawai, admin, operator, dan pimpinan.

Mobile app akan memakai backend Laravel API yang sama dengan aplikasi web. Endpoint tambahan khusus mobile boleh dibuat jika endpoint web terlalu berat, terlalu table-oriented, atau membutuhkan payload yang lebih ringkas untuk pengalaman mobile.

## Product Decisions

- Target awal: Android.
- Target lanjutan: iOS.
- Mode kerja MVP: online-only.
- Auth: mengikuti auth backend saat ini melalui API/Sanctum token, disimpan aman di secure storage mobile.
- Role: semua role yang ada sekarang.
- Permission: mengikuti backend permission, bukan hanya hidden button di UI.
- Bahasa: Bahasa Indonesia.
- Dokumen BMN berat seperti BA Pemakaian, BA Serah Terima, Surat Kuasa, dan dokumen Lelang tidak masuk MVP mobile.
- Mobile app harus memakai API paginated dan response ringan untuk list besar.

## Glossary

- **Mobile_App**: Aplikasi mobile BKSDA SuperApp.
- **Backend_API**: Laravel API di `/api`.
- **User**: Akun login aplikasi.
- **Employee/Pegawai**: Data pegawai yang terhubung dengan user melalui NIP/username.
- **Role**: Role user seperti super_admin, admin, user, operator, dan role lain yang sudah berlaku.
- **Permission**: Hak akses granular backend, misalnya `bmn.view`, `bmn.asset.update`, atau permission lain yang sudah berlaku.
- **Module Access**: Akses modul seperti `bmn`, `kepegawaian`, `inventory`, `dereporting`, dan modul lain yang tersedia.
- **BMN**: Barang Milik Negara.
- **Asset/Aset**: Data aset BMN.
- **Asset_Photo**: Foto aset BMN berdasarkan slot, termasuk foto geotag dan tampak aset.
- **Surat_Tugas**: Dokumen penugasan pegawai.
- **Portal_Mobile**: Beranda mobile yang menampilkan ringkasan profil, aset, surat tugas, approval, dan informasi penting sesuai role.
- **Mobile_Dashboard_API**: Endpoint ringkas untuk home mobile, misalnya `GET /api/mobile/dashboard`.

## Scope MVP

MVP mobile app mencakup:

- Login/logout dan sesi aman.
- Portal mobile sesuai role.
- Navigasi modul sesuai permission.
- BMN asset list, search, filter, detail, foto, verifikasi, edit, peminjaman, pengembalian, dan aksi lain sesuai role.
- Surat Tugas list, detail, download, pengajuan, edit, approve/reject/status update sesuai role.
- Profil user dan pegawai.
- Error handling, loading state, pagination, dan empty state yang layak untuk mobile.

## Out of Scope MVP

Fitur berikut tidak masuk MVP mobile:

- Generator dokumen BMN: BA Pemakaian, BA Serah Terima, Surat Kuasa, BA Lelang, SK Lelang, dan dokumen sejenis.
- Import Review BMN berbasis Excel.
- Export Excel massal.
- CMS publik dan manajemen konten publik.
- Mode offline penuh.
- Push notification produksi, kecuali disiapkan struktur requirement-nya untuk fase berikutnya.
- Fitur administrasi server/deployment.

## Requirements

### Requirement 1: Authentication and Session

**User Story:** Sebagai user aplikasi, saya ingin login memakai akun yang sama dengan web, sehingga saya bisa mengakses fitur mobile sesuai hak akses saya.

#### Acceptance Criteria

1. WHEN user mengirim username/NIP dan password valid, THE Mobile_App SHALL login melalui `POST /api/login`.
2. WHEN login berhasil, THE Mobile_App SHALL menyimpan token/session auth di secure storage perangkat, bukan storage biasa.
3. WHEN app dibuka kembali dan token/session masih valid, THE Mobile_App SHALL langsung masuk ke Portal_Mobile.
4. WHEN Backend_API mengembalikan 401, THE Mobile_App SHALL menghapus sesi lokal dan mengarahkan user ke login.
5. WHEN user logout, THE Mobile_App SHALL memanggil `POST /api/logout`, menghapus sesi lokal, dan kembali ke login.
6. WHEN login gagal, THE Mobile_App SHALL menampilkan pesan error yang jelas tanpa membocorkan detail teknis.
7. WHEN device tidak memiliki koneksi internet, THE Mobile_App SHALL menampilkan pesan bahwa aplikasi membutuhkan koneksi internet.

### Requirement 2: User Profile and Permission Bootstrap

**User Story:** Sebagai user, saya ingin aplikasi mengetahui profil dan hak akses saya, sehingga menu dan aksi yang tampil sesuai role saya.

#### Acceptance Criteria

1. WHEN sesi valid, THE Mobile_App SHALL mengambil profil melalui `GET /api/me` atau endpoint profil yang setara.
2. THE Mobile_App SHALL menerima data minimal: user id, nama, username/NIP, role, access_modules, permissions, dan data pegawai jika tersedia.
3. THE Mobile_App SHALL membangun menu dan tombol aksi berdasarkan permission dari backend.
4. THE Backend_API SHALL tetap mengecek permission untuk setiap aksi, walaupun tombol disembunyikan di mobile.
5. IF user tidak terhubung dengan data pegawai, THEN THE Mobile_App SHALL tetap bisa berjalan sesuai role, dengan informasi pegawai ditampilkan kosong/terbatas.

### Requirement 3: Portal Mobile Dashboard

**User Story:** Sebagai user, saya ingin melihat ringkasan pekerjaan saya di halaman utama, sehingga saya cepat tahu aset, surat tugas, dan approval yang perlu ditangani.

#### Acceptance Criteria

1. WHEN Portal_Mobile dibuka, THE Mobile_App SHALL mengambil ringkasan melalui `GET /api/mobile/dashboard`.
2. THE Portal_Mobile SHALL menampilkan profil singkat user dan pegawai.
3. THE Portal_Mobile SHALL menampilkan summary sesuai role, termasuk jumlah aset terkait, pinjaman aktif, surat tugas aktif/pending, approval pending jika user berwenang, dan kendaraan dengan pajak mendekati jatuh tempo jika relevan.
4. THE Portal_Mobile SHALL tidak mengambil list besar di endpoint dashboard.
5. THE Portal_Mobile SHALL menyediakan pull-to-refresh.
6. WHEN dashboard gagal dimuat, THE Mobile_App SHALL menampilkan retry action.

### Requirement 4: Navigation and Role-Based Modules

**User Story:** Sebagai user, saya ingin navigasi mobile sederhana, sehingga saya bisa menemukan fitur sesuai hak akses saya tanpa merasa seperti memakai tabel desktop.

#### Acceptance Criteria

1. THE Mobile_App SHALL memakai bottom navigation atau pola navigasi mobile yang konsisten.
2. THE Mobile_App SHALL menyediakan menu utama minimal: Beranda, BMN, Surat Tugas, dan Profil jika user punya akses terkait.
3. THE Mobile_App SHALL menyembunyikan modul yang tidak dimiliki user berdasarkan `access_modules` dan `permissions`.
4. THE Mobile_App SHALL menampilkan forbidden state yang jelas jika user membuka deep link tanpa hak akses.
5. THE Mobile_App SHALL memakai touch target minimal 44pt/48dp untuk tombol dan aksi utama.

### Requirement 5: BMN Asset List

**User Story:** Sebagai user dengan akses BMN, saya ingin melihat dan mencari aset BMN dari mobile, sehingga saya bisa bekerja tanpa membuka laptop.

#### Acceptance Criteria

1. WHEN user membuka BMN, THE Mobile_App SHALL mengambil aset dari `GET /api/bmn/assets` dengan pagination.
2. THE Mobile_App SHALL mengirim `mobile=true` atau header client mobile agar backend dapat memakai batas pagination mobile.
3. THE Mobile_App SHALL mendukung pencarian berdasarkan nama barang, kode barang, NUP, merk/tipe, no polisi, pengguna, dan lokasi jika backend mendukung.
4. THE Mobile_App SHALL mendukung filter kondisi, jenis BMN, lokasi, status, dan filter relevan lain sesuai API.
5. THE Mobile_App SHALL menampilkan list dalam bentuk card/list mobile, bukan tabel desktop.
6. THE Mobile_App SHALL memuat halaman berikutnya melalui pagination/infinite list.
7. THE Mobile_App SHALL menampilkan empty state saat tidak ada aset.
8. THE Backend_API SHALL mengirim response list yang ringan dan tidak memaksa mobile menerima seluruh kolom detail.

### Requirement 6: BMN Asset Detail

**User Story:** Sebagai user dengan akses BMN, saya ingin melihat detail aset secara lengkap, sehingga saya dapat memeriksa identitas, lokasi, dokumen, nilai, dan status aset.

#### Acceptance Criteria

1. WHEN user memilih aset, THE Mobile_App SHALL membuka detail dari `GET /api/bmn/assets/{id}`.
2. THE Mobile_App SHALL mengelompokkan detail ke bagian yang mudah dipindai: Identitas, Lokasi, Dokumen, Finansial, Organisasi, Foto, dan Riwayat jika tersedia.
3. WHEN aset adalah kendaraan, THE Mobile_App SHALL menampilkan no polisi, no mesin, no rangka, tanggal pajak, dan tanggal ganti plat jika tersedia.
4. THE Mobile_App SHALL menampilkan badge kondisi, status verifikasi, dan status penggunaan.
5. THE Mobile_App SHALL menampilkan foto aset dalam galeri mobile.
6. THE Mobile_App SHALL menampilkan aksi detail sesuai permission user.

### Requirement 7: BMN Asset Create and Edit

**User Story:** Sebagai admin/operator dengan hak akses BMN, saya ingin membuat atau mengubah data aset dari mobile jika diperlukan, sehingga pekerjaan lapangan tetap bisa dicatat.

#### Acceptance Criteria

1. IF user punya permission create asset, THEN THE Mobile_App SHALL menampilkan aksi tambah aset.
2. IF user punya permission update asset, THEN THE Mobile_App SHALL menampilkan aksi edit aset.
3. THE Mobile_App SHALL memakai form bertahap atau sectioned form agar tidak terlalu padat di layar kecil.
4. THE Mobile_App SHALL memvalidasi field wajib sebelum submit.
5. THE Backend_API SHALL tetap melakukan validasi final.
6. WHEN submit berhasil, THE Mobile_App SHALL menampilkan konfirmasi dan memperbarui list/detail.
7. WHEN submit gagal, THE Mobile_App SHALL menampilkan error per field jika tersedia.

### Requirement 8: BMN Asset Photo and Geotag

**User Story:** Sebagai user yang berwenang, saya ingin mengambil dan mengunggah foto aset dari kamera mobile, sehingga dokumentasi aset lebih lengkap dan valid.

#### Acceptance Criteria

1. WHEN user membuka foto aset, THE Mobile_App SHALL menampilkan slot foto yang berlaku, termasuk foto geotag dan tampak aset.
2. WHEN user mengambil foto, THE Mobile_App SHALL meminta izin kamera.
3. WHEN user mengambil foto geotag, THE Mobile_App SHALL meminta izin lokasi jika latitude/longitude akan dikirim.
4. THE Mobile_App SHALL mengunggah foto ke endpoint BMN photo/geotag yang berlaku dengan `photo`, `type`, dan metadata opsional `latitude`, `longitude`, `location_note`.
5. THE Backend_API SHALL mengembalikan payload berisi URL/path foto terbaru.
6. THE Mobile_App SHALL menampilkan progress upload dan success/error state.
7. THE Mobile_App SHALL tidak melakukan offline queue pada MVP; jika koneksi gagal, user diminta mencoba ulang.
8. IF user tidak punya permission upload/hapus foto, THEN THE Mobile_App SHALL menyembunyikan aksi tersebut.

### Requirement 9: BMN Asset Verification

**User Story:** Sebagai user yang berwenang, saya ingin melakukan verifikasi aset dari mobile, sehingga status pemeriksaan aset bisa dicatat langsung.

#### Acceptance Criteria

1. IF user punya permission verifikasi/update aset, THEN THE Mobile_App SHALL menampilkan tombol Verifikasi pada aset yang relevan.
2. WHEN user melakukan verifikasi, THE Mobile_App SHALL memanggil endpoint verifikasi aset yang berlaku.
3. WHEN verifikasi berhasil, THE Mobile_App SHALL memperbarui status verifikasi, waktu verifikasi, dan nama verifikator.
4. IF backend menolak akses, THEN THE Mobile_App SHALL menampilkan forbidden message.

### Requirement 10: BMN Loans and Returns

**User Story:** Sebagai user yang berwenang, saya ingin mencatat peminjaman dan pengembalian aset dari mobile, sehingga transaksi aset dapat diproses tanpa desktop.

#### Acceptance Criteria

1. IF user punya permission peminjaman, THEN THE Mobile_App SHALL menampilkan fitur pinjam/serahkan aset.
2. IF user punya permission pengembalian, THEN THE Mobile_App SHALL menampilkan fitur kembalikan aset.
3. THE Mobile_App SHALL dapat mencari pegawai peminjam melalui endpoint pegawai paginated.
4. THE Mobile_App SHALL menampilkan riwayat pinjaman aset jika user punya akses.
5. THE Mobile_App SHALL memvalidasi tanggal, pegawai, dan aset sebelum submit.
6. THE Backend_API SHALL tetap mengecek status aset dan permission sebelum membuat/mengubah transaksi.

### Requirement 11: Surat Tugas List and Detail

**User Story:** Sebagai user, saya ingin melihat surat tugas saya atau surat tugas yang boleh saya kelola, sehingga saya dapat memantau pekerjaan dan penugasan dari mobile.

#### Acceptance Criteria

1. THE Mobile_App SHALL menampilkan daftar Surat_Tugas sesuai role dan permission user.
2. Pegawai biasa SHALL dapat melihat surat tugas miliknya melalui endpoint personal jika tersedia.
3. Admin/operator yang berwenang SHALL dapat melihat daftar surat tugas sesuai permission.
4. THE Mobile_App SHALL mendukung search, filter status, dan pagination.
5. THE Mobile_App SHALL menampilkan card surat tugas berisi nomor, kegiatan/tujuan, tanggal mulai, tanggal selesai, status, dan personel ringkas.
6. WHEN user membuka detail, THE Mobile_App SHALL menampilkan isi utama surat tugas, personel, status, file, dan aksi yang tersedia.

### Requirement 12: Surat Tugas Create, Edit, and Submit

**User Story:** Sebagai user yang berwenang, saya ingin mengajukan atau membuat surat tugas dari mobile, sehingga proses penugasan dapat dimulai tanpa desktop.

#### Acceptance Criteria

1. IF user punya permission membuat/pengajuan surat tugas, THEN THE Mobile_App SHALL menampilkan aksi buat/ajukan Surat_Tugas.
2. THE Mobile_App SHALL menyediakan form mobile untuk data utama surat tugas, termasuk tujuan/kegiatan, dasar, tanggal, sumber dana, transportasi, personel, dan field lain yang diwajibkan backend.
3. THE Mobile_App SHALL memungkinkan pencarian dan pemilihan pegawai dengan API paginated.
4. THE Mobile_App SHALL menampilkan validasi field wajib sebelum submit.
5. WHEN submit berhasil, THE Mobile_App SHALL menampilkan konfirmasi dan membuka detail/riwayat surat tugas.
6. WHEN backend mengembalikan validation errors, THE Mobile_App SHALL menampilkan error pada field terkait.

### Requirement 13: Surat Tugas Approval and Status Actions

**User Story:** Sebagai pimpinan/admin/operator yang berwenang, saya ingin memproses approval atau status surat tugas dari mobile, sehingga pekerjaan approval tidak harus menunggu desktop.

#### Acceptance Criteria

1. IF user punya permission approval/status update, THEN THE Mobile_App SHALL menampilkan aksi approve/reject/update status.
2. THE Mobile_App SHALL meminta konfirmasi sebelum menjalankan aksi status penting.
3. THE Backend_API SHALL tetap mengecek permission dan status transisi.
4. WHEN aksi berhasil, THE Mobile_App SHALL memperbarui status di list dan detail.
5. WHEN aksi gagal, THE Mobile_App SHALL menampilkan alasan error dari backend.

### Requirement 14: Surat Tugas Download and Share

**User Story:** Sebagai user, saya ingin mengunduh atau membagikan file surat tugas dari mobile, sehingga saya bisa memakai dokumen saat bertugas.

#### Acceptance Criteria

1. WHEN Surat_Tugas punya file yang boleh diakses user, THE Mobile_App SHALL menampilkan aksi download.
2. THE Mobile_App SHALL mengunduh file melalui endpoint authenticated.
3. THE Mobile_App SHALL membuka file PDF/dokumen dengan viewer perangkat atau share sheet.
4. IF file tidak ditemukan, THE Mobile_App SHALL menampilkan pesan file tidak tersedia.
5. THE Backend_API SHALL mengecek permission atau kepemilikan surat sebelum mengirim file.

### Requirement 15: Employee Directory for Selectors

**User Story:** Sebagai user yang membutuhkan pemilihan pegawai, saya ingin mencari pegawai dari mobile, sehingga form BMN dan Surat Tugas dapat diisi cepat.

#### Acceptance Criteria

1. THE Mobile_App SHALL memakai endpoint pegawai paginated untuk selector.
2. THE Mobile_App SHALL mendukung search nama dan NIP.
3. THE Mobile_App SHALL tidak memuat seluruh pegawai sekaligus.
4. THE Mobile_App SHALL menampilkan nama, NIP, jabatan, dan unit kerja ringkas pada hasil pencarian.
5. THE Backend_API SHALL membatasi akses data pegawai sesuai permission.

### Requirement 16: Online-Only Behavior

**User Story:** Sebagai user, saya ingin aplikasi menjelaskan saat koneksi tidak tersedia, sehingga saya tahu bahwa fitur membutuhkan internet.

#### Acceptance Criteria

1. THE Mobile_App SHALL mendeteksi kondisi tidak ada koneksi.
2. THE Mobile_App SHALL menampilkan offline banner atau state bahwa aplikasi membutuhkan internet.
3. THE Mobile_App SHALL tidak menjanjikan penyimpanan offline penuh pada MVP.
4. THE Mobile_App SHALL tidak melakukan queue upload offline pada MVP.
5. THE Mobile_App MAY menyimpan cache ringan hanya untuk kenyamanan tampilan sementara, tetapi data tetap dianggap perlu refresh online.

### Requirement 17: API Contract and Error Handling

**User Story:** Sebagai user mobile, saya ingin error mudah dipahami, sehingga saya tahu apa yang harus dilakukan ketika request gagal.

#### Acceptance Criteria

1. THE Mobile_App SHALL membaca response standar `data`, `meta`, dan `message` jika tersedia.
2. THE Mobile_App SHALL menangani 401 dengan logout otomatis.
3. THE Mobile_App SHALL menangani 403 dengan forbidden state.
4. THE Mobile_App SHALL menangani 404 dengan not found state.
5. THE Mobile_App SHALL menangani 422 dengan field validation messages.
6. THE Mobile_App SHALL menampilkan retry action untuk error jaringan atau server.
7. THE Mobile_App SHALL tidak menampilkan stack trace atau error teknis mentah ke user.

### Requirement 18: Performance and Pagination

**User Story:** Sebagai user, saya ingin list dan pencarian terasa cepat, sehingga aplikasi mobile nyaman dipakai walaupun data besar.

#### Acceptance Criteria

1. THE Mobile_App SHALL memakai pagination untuk list aset, pegawai, surat tugas, pinjaman, dan riwayat besar.
2. THE Mobile_App SHALL memakai debounce pada search input.
3. THE Mobile_App SHALL memakai skeleton/loading state untuk request lebih dari 1 detik.
4. THE Mobile_App SHALL memakai virtualized list untuk data panjang.
5. THE Mobile_App SHALL tidak mengambil export massal atau seluruh dataset untuk tampilan mobile.

### Requirement 19: Security and Privacy

**User Story:** Sebagai organisasi, saya ingin mobile app tetap aman, sehingga data internal BMN dan kepegawaian tidak bocor.

#### Acceptance Criteria

1. THE Mobile_App SHALL menyimpan token/session di secure storage perangkat.
2. THE Mobile_App SHALL tidak menyimpan password.
3. THE Mobile_App SHALL mengirim request melalui HTTPS di production.
4. THE Mobile_App SHALL tidak menampilkan data atau aksi yang tidak sesuai permission.
5. THE Backend_API SHALL tetap menjadi enforcement layer untuk semua permission.
6. THE Mobile_App SHALL tidak menulis token, password, atau dokumen sensitif ke log.
7. THE Mobile_App SHALL membersihkan sesi lokal saat logout atau 401.

### Requirement 20: Mobile UI/UX Standards

**User Story:** Sebagai user mobile, saya ingin aplikasi mudah disentuh, dibaca, dan digunakan, sehingga pekerjaan lapangan tidak terganggu oleh UI yang terlalu padat.

#### Acceptance Criteria

1. THE Mobile_App SHALL memakai pola mobile-native, bukan memindahkan tabel web mentah ke layar kecil.
2. THE Mobile_App SHALL memakai ukuran teks body minimal 16sp/pt sejauh memungkinkan.
3. THE Mobile_App SHALL memakai target sentuh minimal 44pt/48dp.
4. THE Mobile_App SHALL memakai empty state, loading state, error state, dan success feedback yang konsisten.
5. THE Mobile_App SHALL mendukung Bahasa Indonesia untuk seluruh label utama.
6. THE Mobile_App SHALL mempertahankan kontras teks minimal sesuai WCAG AA.

## Future Requirements

Fitur berikut dapat masuk fase setelah MVP:

- iOS release.
- Push notification Surat Tugas, approval, dan STNK reminder.
- Biometric unlock setelah login.
- Widget/shortcut mobile untuk tugas penting.
- QR scanning untuk verifikasi dokumen atau aset.
- Dokumen BMN generator mobile jika UX-nya sudah matang.
- Offline mode terbatas untuk wilayah minim sinyal jika nanti benar-benar dibutuhkan.

## Open Questions

Hal yang perlu diputuskan saat masuk `design.md`:

1. Apakah mobile app akan memakai Expo managed workflow atau React Native bare workflow.
2. Apakah auth mobile tetap memakai token Sanctum dari `POST /api/login` atau perlu endpoint/device token khusus.
3. Apa daftar permission final yang akan dipakai untuk setiap tombol mobile.
4. Modul selain BMN dan Surat Tugas apa yang masuk setelah MVP.
5. Apakah upload foto wajib mengirim latitude/longitude untuk semua slot atau hanya foto geotag.
6. Apakah mobile perlu preview PDF internal atau cukup buka viewer perangkat.

## Definition of Done for Requirements

Requirement dianggap siap lanjut ke `design.md` jika:

- Scope MVP disetujui.
- Out of scope MVP disetujui.
- Role dan permission mengikuti backend disetujui.
- Online-only disetujui.
- API readiness plan tetap menjadi prasyarat teknis.
- Tidak ada requirement yang bertentangan dengan aplikasi web saat ini.
