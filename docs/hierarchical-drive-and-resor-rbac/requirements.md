# Requirements v2: Penataan Hierarki 4 Unit BKSDA Drive, Folder Resor Terisolasi, & Pengorganisasian Subfolder Laporan DeReporting (Standar 10/10)

> **Dokumen Terkait**: [design.md](file:///e:/bksda-superapp/docs/hierarchical-drive-and-resor-rbac/design.md) | [tasks.md](file:///e:/bksda-superapp/docs/hierarchical-drive-and-resor-rbac/tasks.md)
> **Target Modul**: 
> - Backend: `backend/app/Support/Security/DriveAccess.php`, `backend/app/Http/Controllers/Api/DriveController.php`, `backend/app/Modules/DeReporting/Controllers/FormBuilderController.php`, `backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php`
> - Frontend: `frontend/src/app/drive/page.tsx`, `frontend/src/app/drive/_components/DriveFileList.tsx`, `frontend/src/app/kepegawaian/employees/[id]/page.tsx`, `frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx`, `frontend/src/app/dereporting/forms/[id]/responses/page.tsx`
> **Standar Mutu**: Bebas celah keamanan (CWE-639 IDOR, CWE-200 Info Leak, CWE-22 Path Traversal), zero over-engineering (/ponytail), dan deterministik untuk dieksekusi oleh AI level junior/flash model.

---

## 1. Keputusan Desain Terkunci (Locked Decisions v2)

| # | Aspek | Keputusan Terkunci v2 | Alasan & Justifikasi Audit |
|---|---|---|---|
| **D1** | **Topologi Unit Drive Bersama** | **Hanya 4 Unit Utama**: Balai BKSDA Kaltim (`id: 1`), SKW I Berau (`id: 2`), SKW II Tenggarong (`id: 3`), SKW III Balikpapan (`id: 4`) | Sesuai struktur eselon dan UPT BKSDA. Resor bukan unit mandiri melainkan folder di dalam SKW. Unit lama 5 s.d. 9 dipangkas bersih. |
| **D2** | **Standardisasi Kode Resor** | Gunakan **14 Kode Resor Baku (`resor_01` s.d. `resor_14`)** | Menghilangkan kerapuhan *string matching* pada nama resor panjang yang rentan typo/perbedaan tanda baca. |
| **D3** | **Zero IDOR pada Berkas (Anti-IDOR)** | Izin berkas (`canReadFile`) **wajib memeriksa folder induknya** (`folder_id`) | Mencegah staf seksi membajak berkas di dalam folder resor rahasia via direct URL download `/api/drive/files/{id}/url`. |
| **D4** | **Zero Search Leakage (Anti-Kebocoran)** | Pencarian berkas menyaring (*exclude*) berkas di dalam folder terisolasi yang tidak berhak diakses | Mencegah pembocoran nama/metadata berkas rahasia resor melalui fitur pencarian global unit. |
| **D5** | **Pewarisan Subfolder Otomatis** | Subfolder baru otomatis mewarisi `is_restricted` dan `resor_code` dari folder induk | Mencegah celah keamanan di mana subfolder di dalam resor menjadi publik/terbuka untuk staf seksi. |
| **D6** | **Reuse Tabel `drive_shares` (`/ponytail`)** | Menambahkan `folder_id` (nullable) ke tabel `drive_shares` yang sudah ada | **Tidak membuat tabel baru**. Menghindari duplikasi model, migration, dan logika sharing yang sudah ada. |
| **D7** | **Reuse Kolom `user_id` Folder (`/ponytail`)** | Kolom `drive_folders.user_id` berfungsi langsung sebagai **Admin Resor / Manager** | **Tidak menambah kolom `manager_user_id`**. Menunjuk Admin Resor cukup mengupdate `drive_folders.user_id`. |
| **D8** | **Eliminasi N+1 Query (`/ponytail`)** | Memoize objek pegawai per instance `$user` dalam 1 lifecycle HTTP request | Mengurangi beban query database dari O(N) menjadi O(1) saat me-render puluhan folder di satu halaman. |
| **D9** | **Sinkronisasi Mutasi Otomatis** | Otorisasi resor mengecek langsung kolom `employees.resor` secara dinamis | Saat penempatan pegawai diubah di Kepegawaian, hak akses folder lama **otomatis terputus** dan folder baru **otomatis terbuka** tanpa cron job. |
| **D10** | **Subfolder per Tanggapan Form** | Setiap respon form membuat subfolder khusus dengan suffix unik: `[Tanggal] - [Judul] ([Pelapor]) #[hash]` | Foto dan berkas dari puluhan responden tidak campur aduk di satu folder; terorganisir rapi per kejadian laporan. |
| **D11** | **File `Ringkasan_Laporan.txt` Otomatis** | Backend membuat file teks ringkas berisi seluruh jawaban responden di dalam subfolder (`source_id = "{$id}:summary:txt"`) | Siapa pun yang membuka folder di Drive atau mengunduh ZIP langsung dapat membaca kronologi dan identitas pelapor tanpa buka web. |
| **D12** | **Tautan Drive pada Export CSV/Excel** | File CSV/Excel rekap tanggapan menyertakan kolom URL langsung ke subfolder Drive laporan | Pimpinan (Kepala Balai/Kasi) dapat langsung mengklik link dari Excel untuk memeriksa bukti foto asli resolusi penuh. |
| **D13** | **Virtual Sharing ke Resor/Seksi** | Tombol berbagi subfolder laporan ke unit SKW/Resor terkait via `drive_shares` | Berkas fisik tetap 1 di Balai (bebas kuota ganda), tetapi otomatis muncul di tab *"Dibagikan kepada Saya"* milik petugas resor terkait. |
| **D14** | **Anti-Bulk ZIP Traversal Leakage** | Traversal rekursif `addFolderToZipStream` wajib memfilter setiap subfolder dengan `canReadFolder` | Mencegah staf seksi mengunduh ZIP seluruh SKW untuk membocorkan isi folder resor terisolasi di dalamnya. |
| **D15** | **Aktifkan Folder di "Dibagikan kepada Saya"** | Membuka filter `whereRaw('1 = 0')` di `DriveController::index` agar membaca `drive_shares.folder_id` | Menjamin folder yang dibagikan secara virtual langsung muncul di tab *"Dibagikan kepada Saya"* penerima. |
| **D16** | **Anti-Collision & Path Traversal Subfolder** | Sanitasi karakter terlarang (`\ / : * ? " < > | \r \n \t`) dan pembatasan panjang nama folder $\le 80$ karakter | Mencegah folder tertimpa saat judul sama dan mencegah kegagalan path pada filesystem S3. |
| **D17** | **Validasi Silang Satuan Kerja vs Resor** | `EmployeeRequest` mewajibkan `resor` bernilai `null` jika Balai, dan wajib valid di bawah SKW terkait | Mencegah anomali hak akses di mana pegawai kantor Balai tidak sengaja memegang hak akses resor lapangan. |

---

## 2. Kamus Standar Entitas (Standard Master Dictionary)

### A. 14 Resor Resmi BKSDA Kalimantan Timur
| Kode (`resor_code`) | Nama Tampilan Folder / Label | Unit Kerja Induk (`unit_id`) |
|---|---|---|
| `resor_01` | `Resor 01. Berau` | `2` (Seksi Konservasi Wilayah I Berau) |
| `resor_02` | `Resor 02. Pulau Semama dan Pulau Sangalaki` | `2` (Seksi Konservasi Wilayah I Berau) |
| `resor_03` | `Resor 03. Tanjung Selor` | `2` (Seksi Konservasi Wilayah I Berau) |
| `resor_04` | `Resor 04. Tarakan` | `2` (Seksi Konservasi Wilayah I Berau) |
| `resor_05` | `Resor 05. Samarinda` | `3` (Seksi Konservasi Wilayah II Tenggarong) |
| `resor_06` | `Resor 06. Padang Luway` | `3` (Seksi Konservasi Wilayah II Tenggarong) |
| `resor_07` | `Resor 07. Muara Kaman Sedulang` | `3` (Seksi Konservasi Wilayah II Tenggarong) |
| `resor_08` | `Resor 08. Sangatta` | `3` (Seksi Konservasi Wilayah II Tenggarong) |
| `resor_09` | `Resor 09. Suaka Badak Kelian` | `3` (Seksi Konservasi Wilayah II Tenggarong) |
| `resor_10` | `Resor 10. Balikpapan` | `4` (Seksi Konservasi Wilayah III Balikpapan) |
| `resor_11` | `Resor 11. Teluk Adang` | `4` (Seksi Konservasi Wilayah III Balikpapan) |
| `resor_12` | `Resor 12. Teluk Apar` | `4` (Seksi Konservasi Wilayah III Balikpapan) |
| `resor_13` | `Resor 13. Paser` | `4` (Seksi Konservasi Wilayah III Balikpapan) |
| `resor_14` | `Resor 14. Ibu Kota Nusantara (IKN)` | `4` (Seksi Konservasi Wilayah III Balikpapan) |

### B. 8 Folder Ruangan Balai BKSDA Samarinda (`unit_id: 1`)
1. `Subbagian Tata Usaha` (`room_code: 'subbag_tu'`)
2. `Urusan Perencanaan, Kerjasama & Kehumasan` (`room_code: 'perencanaan'`)
3. `Urusan Keuangan & BMN` (`room_code: 'keuangan_bmn'`)
4. `Urusan Kepegawaian & Umum` (`room_code: 'kepegawaian_umum'`)
5. `Urusan Teknis Konservasi & Perlindungan Hutan` (`room_code: 'teknis_konservasi'`)
6. `Ruang Kepala Balai` (`room_code: 'kepala_balai'`)
7. `Ruang Pelayanan Publik & Call Center` (`room_code: 'pelayanan_publik'`)
8. `Formulir DeReporting` (`room_code: 'dereporting'`)

---

## 3. Kebutuhan Fungsional (Functional Requirements)

### A. Penataan Unit & Folder BKSDA Drive
- **FR-DRV-01 (4 Unit Utama Sahaja)**: Sidebar Drive Bersama hanya menampilkan ID 1 s.d. 4. Unit ID 5 s.d. 9 dihapus dari database.
- **FR-DRV-02 (Pembuatan Folder Otomatis)**: Seeder otomatis membuat 14 folder resor di SKW I, II, dan III (`is_restricted: true`, `folder_scope: 'resor'`) serta 8 folder ruangan di Balai Samarinda.
- **FR-DRV-03 (Tampilan Folder di "Dibagikan kepada Saya")**: Tab shared with me menampilkan folder yang dibagikan melalui tabel `drive_shares` dengan `folder_id` terisi.

### B. Pengorganisasian Subfolder Laporan DeReporting
- **FR-SUB-01 (Subfolder Otomatis per Laporan)**: 
  Saat submit form di `/lapor/[slug]`, backend membuat subfolder di bawah folder form:
  `[YYYY-MM-DD] - [Judul Laporan] ([Nama Pelapor]) #[ShortHash]`.
  Berkas lampiran otomatis disimpan di dalam subfolder ini. Kolom `dr_form_responses.drive_folder_id` mencatat ID subfolder ini.
- **FR-SUB-02 (File `Ringkasan_Laporan.txt` Otomatis)**:
  Backend men-generate file ringkasan seluruh jawaban form dalam format teks rapi dan menyimpannya sebagai `DriveFile` di dalam subfolder dengan composite key `source_id = "{$response->id}:summary:txt"`.
- **FR-SUB-03 (Kolom Link Folder di Export CSV)**:
  Export tanggapan CSV memuat kolom `Link Folder Drive` dengan tautan langsung ke subfolder laporan di BKSDA Drive.
- **FR-SUB-04 (Virtual Share ke Resor/Seksi)**:
  Endpoint `POST /api/dereporting/forms/responses/{id}/share` membagikan subfolder ke unit SKW atau akun pegawai tanpa menduplikasi berkas fisik.

### C. Otorisasi Folder & Keamanan Berkas (RBAC & Security)
- **FR-SEC-01 (Isolasi Folder Resor)**: Pegawai resor hanya melihat folder miliknya di unit SKW. Pegawai kantor seksi ditolak membuka folder resor (HTTP 403) kecuali memiliki share record atau berstatus Admin Resor/Superadmin.
- **FR-SEC-02 (Anti-IDOR Berkas)**: `GET /api/drive/files/{id}/url` wajib memvalidasi hak akses folder tempat berkas berada (`folder_id`).
- **FR-SEC-03 (Anti-Kebocoran Pencarian)**: Query pencarian mengecualikan berkas di folder terisolasi yang tidak berhak diakses pengguna.
- **FR-SEC-04 (Anti-Bulk ZIP Leakage)**: Traversal `addFolderToZipStream` memvalidasi `DriveAccess::canReadFolder` pada setiap subfolder sebelum menambahkannya ke dalam file ZIP.

### D. Modul Kepegawaian & Mutasi
- **FR-KPG-01 (Dropdown Resor Penempatan)**: Halaman detail/edit pegawai menampilkan dropdown Resor yang dinamis berdasarkan Satuan Kerja yang dipilih. Jika memilih Balai, dropdown disabled dan bernilai `null`.
- **FR-KPG-02 (Validasi Silang Backend)**: `EmployeeRequest` menolak nilai `resor` jika Satuan Kerja adalah Balai, dan memastikan kode resor terdaftar di bawah SKW yang dipilih.
- **FR-KPG-03 (Auto-Revoke & Auto-Grant Instan)**: Perubahan penempatan di Kepegawaian langsung efektif pada hak akses folder BKSDA Drive seketika tanpa delay/job antrian.
- **FR-KPG-04 (Hak Akses Admin Drive)**: Menambahkan modul `drive` di `EmployeeAccessSheet.tsx` (`access_modules`).
