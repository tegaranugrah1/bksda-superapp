# Laporan Audit Mendalam Modul BKSDA Drive (FE ↔ BE ↔ DB) & Rencana Remediasi

> **Tanggal Audit:** 13 November 2026  
> **Tanggal Remediasi & Verifikasi:** 14 November 2026  
> **Status:** ✅ Selesai Diimplementasikan & Terverifikasi (BE + FE Build + Playwright E2E)  
> **Cakupan Berkas:**
> - Backend: `backend/app/Http/Controllers/Api/DriveController.php`, `backend/app/Http/Controllers/Api/DriveShareController.php`, `backend/app/Support/Security/DriveAccess.php`, `backend/routes/api.php`, `backend/config/filesystems.php`, `backend/database/migrations/2026_10_29_*` & `2026_10_30_*`
> - Frontend: `frontend/src/app/drive/page.tsx`, `frontend/src/app/drive/_components/DriveUploadDialog.tsx`, `frontend/src/app/drive/_components/DriveShareDialog.tsx`, `frontend/src/app/drive/_components/DriveMoveDialog.tsx`, `frontend/src/app/drive/_components/DriveFileList.tsx`, `frontend/src/app/drive/s/[token]/page.tsx`

---

## Ringkasan Eksekutif

Audit ini dilakukan dalam dua tahap:
1. **Bagian A (Pipeline Upload, Kuota, Infrastruktur Storage & Fitur Transfer Ownership):** Menjawab penyebab kegagalan *bulk upload* dan memeriksa ketersediaan fitur *transfer ownership*.
2. **Bagian B (Audit Relasi Mendalam FE ↔ BE ↔ DB):** Menelusuri setiap pemanggilan API di UI hingga ke route backend, logika otorisasi (`DriveAccess`), dan *foreign key* skema database.

Sebagian temuan kritis telah dibuktikan menggunakan **tes probe PHPUnit sementara** (telah dihapus kembali setelah verifikasi) untuk memastikan akar masalah tanpa mengubah kode produksi terlebih dahulu.

### Matriks Temuan Lengkap (23 Temuan)

| # | Kategori | Tingkat | Ringkasan Masalah | Pembuktian |
|---|---|---|---|---|
| 1 | Upload | 🔴 Kritis | Upload banyak file kena rate-limit HTTP `429` | Probe: file #30 → `429` |
| 2 | Upload | 🔴 Tinggi | `completeUpload` membuat file "hantu" & record duplikat | Probe: 2× complete tanpa objek → 2 record (`201`) |
| 3 | Kuota | 🔴 Tinggi | Bypass kuota lewat klaim ukuran palsu di `initUpload` | Code review (`DriveController.php`) |
| 4 | Otorisasi | 🟠 Sedang | `unit_id` bisa dipalsukan saat upload ke folder | Code review (`DriveController.php` L370-378) |
| 5 | Upload/Kuota | 🟠 Sedang | Upload gagal meninggalkan reservasi kuota menggantung 2 jam | Code review (tidak ada endpoint `abort`) |
| 6 | Infrastruktur | 🟠 Sedang | CORS bucket `bksda-drive` (`ExposeHeaders: ETag`) tidak dikodekan | Grep: tidak ada `PutBucketCors` untuk `bksda-drive` |
| 7 | Infrastruktur | 🟡 Rendah | Ambang single PUT 100 MB berbenturan batas body Cloudflare (dan `20M` di `deploy/nginx.conf`) | Config (`filesystems` / `nginx.conf`) |
| 8 | Performa | 🟡 Rendah | `GET /api/drive` mengalami N+1 query dan tanpa paginasi | Code review (`DriveController.php` L106-112) |
| 9 | Keamanan | 🟡 Rendah | Blocklist MIME di `completeUpload` tidak efektif (`finfo` vs string blocklist) | Code review (`DriveController.php` L584) |
| 10 | Keamanan | 🟡 Rendah | Kredensial fallback `drive` & `drive_signer` hardcoded di config | Code review (`filesystems.php` L79-92) |
| 11 | Fitur | ℹ️ Tidak Ada | **Fitur Transfer Ownership belum tersedia** (dan risiko `cascadeOnDelete` user) | Grep & migrasi (`2026_10_29_180000`) |
| 12 | Relasi FE↔BE | 🔴 Kritis | **5 aksi utama UI memanggil URL jamak (`/files/`, `/folders/`), BE hanya terima tunggal** → `404` | Probe: `PUT /drive/files/{id}/star` → `404` |
| 13 | Relasi DB↔RBAC | 🔴 Kritis | **Force-delete folder terbatas membocorkan file rahasia ke root unit** | Probe: sebelum `403` → sesudah `200` (`folder_id=NULL`) |
| 14 | Relasi FE↔BE↔RBAC | 🔴 Tinggi | **Share internal tidak berfungsi** (BE abaikan `drive_shares` di folder; FE kirim `employee.id` bukan `users.id`) | Probe: shared file → `403`, `shared_with_me` → `0`, `employee.id=6` vs `users.id=1..4` |
| 15 | Relasi FE↔BE↔DB | 🟠 Sedang | **Pindah folder/berkas merusak konsistensi `unit_id` & melewati cek kuota** | Probe: moved folder `unit=2`, child tetap `unit=1`, tampil `0` |
| 16 | Relasi FE↔BE | 🟠 Sedang | UI menampilkan tombol edit/hapus pada mode *Dibagikan dengan saya* & bintang bersifat global | Code review (`DriveController.php` L161, `page.tsx` L163) |
| 17 | Relasi FE↔FE | 🟠 Sedang | Fitur *"Atur Admin Resor / Folder"* ada di `page.tsx` tapi props-nya tidak diteruskan ke `DriveFileList` | Code review (`page.tsx` L404-421) |
| 18 | Skema DB | 🟡 Rendah | `drive_shares.folder_id` tanpa FK, `drive_uploads` kurang indeks komposit | Code review (migrasi `2026_10_30_130000`) |
| 19 | Relasi FE↔FE | 🟠 Sedang | **Chip filter kategori (*Semua, Dokumen, Gambar, Video, Arsip*) mati total** | Code review (`page.tsx` L55, L384–396 vs `DriveToolbar.tsx` L38–39, L202) |
| 20 | Kuota BE | 🔴 Tinggi | **File di Sampah membebaskan kuota & `restore()` tanpa cek kuota** (bypass kuota tak terbatas) | Code review (`DriveController.php` L130, L304–314, L411; `DriveUnit.php` L37–40) |
| 21 | Relasi DB↔BE | 🟠 Sedang | **Pulihkan file yang folder induknya di Sampah membuat file "hilang/yatim"** (hilang dari Sampah & tidak tampil di root) | Code review (`DriveController.php` L91–98, L304–314) |
| 22 | FE UX & RBAC | 🟠 Sedang | **Mode Sampah mengabaikan `canWrite` & `Hapus Permanen` tanpa dialog konfirmasi** | Code review (`DriveFileList.tsx` L268–280, L390–402) |
| 23 | Relasi FE↔BE | 🟡 Rendah | **Halaman share publik `/drive/s/[token]` tidak memakai normalisasi URL `api.ts` & state `DriveShareDialog` bocor antar-file** | Code review (`s/[token]/page.tsx` L69–101; `DriveShareDialog.tsx` L86–101) |

---

## Bagian A — Masalah Upload Massal, Infrastruktur Storage & Transfer Ownership

### 1. 🔴 Kritis: Akar Masalah Gagal Upload Banyak File (Shared Rate-Limit Bucket `429`)
- **Lokasi:** `backend/routes/api.php` (L102–L103), `frontend/src/app/drive/_components/DriveUploadDialog.tsx` (L143–L166).
- **Akar Masalah:**
  - Setiap upload 1 file memanggil 2 endpoint terotentikasi: `POST /api/drive/upload/init` dan `POST /api/drive/upload/complete` (keduanya memakai `middleware('throttle:60,1')` **tanpa prefix**).
  - Pada Laravel 13 (`ThrottleRequests::handle`), throttle tanpa argumen `$prefix` menggunakan cache key `sha1($user->getAuthIdentifier())`. Artinya, **seluruh route `throttle:N,1` tanpa prefix di seluruh aplikasi berbagi satu counter per user** (termasuk `GET /api/drive`, `/api/me`, `/api/portal/notifications`, dll.).
  - Akibatnya, 30 file = 60 request → file ke-30 atau lebih awal (sekitar file 20–25 di browser nyata karena polling portal) langsung memicu HTTP `429 Too Many Requests`.
  - Di frontend, `startUploadAll()` melakukan loop berurutan tanpa jeda dan tanpa mekanisme *retry* saat menerima `429`. Begitu satu file terkena `429`, seluruh sisa antrean langsung gagal beruntun selama sisa jendela 1 menit.
- **Solusi:**
  - Beri prefix khusus pada route upload: `throttle:300,1,drive_upload`.
  - Tambahkan retry/backoff di `DriveUploadDialog.tsx` dengan membaca header `Retry-After` saat status `429` (maksimal 3× percobaan).

### 2. 🔴 Tinggi: `completeUpload` Memungkinkan File "Hantu" & Record Duplikat
- **Lokasi:** `backend/app/Http/Controllers/Api/DriveController.php` (L519–L607).
- **Akar Masalah:**
  - Tidak ada pengecekan `status === 'initiated'`, tidak ada pengecekan `expires_at`, dan tidak ada `lockForUpdate()`. Memanggil `complete` 2× (misal double-click atau network retry) menghasilkan **2 baris `DriveFile` kembar** yang menunjuk ke `s3_key` yang sama.
  - Tidak ada verifikasi wajib `Storage::disk('drive')->exists($upload->s3_key)`. Jika upload PUT ke storage gagal (misal CORS error), pemanggilan `complete` tetap sukses `201 Created` dan menciptakan record file "hantu" dengan MIME `application/octet-stream` yang rusak saat dibuka.
- **Solusi:** Gunakan `DB::transaction` + `lockForUpdate()` pada `DriveUpload`, tolak jika `status !== 'initiated'` atau `expires_at <= now()`, dan wajibkan `Storage::disk('drive')->exists($upload->s3_key)` (jika tidak ada, kembalikan `422`).

### 3. 🔴 Tinggi: Bypass Kuota via Klaim Ukuran Palsu
- **Lokasi:** `backend/app/Http/Controllers/Api/DriveController.php` (L356, L405, L419, L597).
- **Akar Masalah:** Kuota diperiksa dan disimpan berdasarkan `size` yang diklaim client saat `initUpload`. Presigned PUT URL tidak mengunci `Content-Length`, sehingga client dapat mengirim `size: 1` di `init` lalu mengunggah berkas gigabyte ke RustFS/S3.
- **Solusi:** Saat `completeUpload`, baca ukuran objek aktual dari storage (`Storage::disk('drive')->size($upload->s3_key)`). Jika melampaui kuota atau tidak sesuai toleransi reservasi, hapus objek di S3, tandai `aborted`, dan tolak `422`.

### 4. 🟠 Sedang: Pemalsuan `unit_id` Saat Upload ke Folder
- **Lokasi:** `backend/app/Http/Controllers/Api/DriveController.php` (L370–L378).
- **Akar Masalah:** `$unitId = $validated['unit_id'] ?? $targetFolder?->unit_id;` memprioritaskan `unit_id` dari input request daripada milik `$targetFolder`. Jika user dapat menulis di folder pribadinya (`folder_id`) tetapi mengirim `unit_id` milik unit lain, pemeriksaan unit dilewati dan file tercatat menggunakan kuota unit lain.
- **Solusi:** Jika `$targetFolder` ada, paksa `$unitId = $targetFolder->unit_id`.

### 5. 🟠 Sedang: Kegagalan Upload Menyandera Kuota Selama 2 Jam
- **Lokasi:** `DriveController.php` (L412–L416), `DriveUnit.php` (L45–L51).
- **Akar Masalah:** Tidak ada endpoint `abort`. Jika proses PUT ke storage gagal atau user menutup dialog, record `drive_uploads` tetap berstatus `initiated` dan memotong `reservedStorageBytes()` hingga `expires_at` (+2 jam) atau hingga cron `drive:cleanup-uploads` berjalan.
- **Solusi:** Tambahkan endpoint `POST /api/drive/upload/{id}/abort` dan panggil dari blok `catch` di `DriveUploadDialog.tsx`.

### 6. 🟠 Sedang: CORS Bucket `bksda-drive` (`ExposeHeaders: ETag`) Tidak Dikodekan
- **Lokasi:** `backend/app/Console/Commands/StorageSetupCommand.php`, `docs/websocket-drive-mail-infrastructure/design.md` (L276).
- **Akar Masalah:** `StorageSetupCommand` hanya mengatur bucket `bksda` (public-read), belum mengatur bucket `bksda-drive` beserta aturan CORS (`PUT, GET, HEAD`, `ExposeHeaders: ['ETag']`). Tanpa `ETag` terekspos oleh browser, upload **multipart (>100 MB)** di `DriveUploadDialog.tsx` (L125) membaca `etag = ""` dan gagal di `CompleteMultipartUpload`.
- **Solusi:** Tambahkan flag `--drive` di `storage:setup` untuk membuat bucket privat `bksda-drive` dan menerapkan `putBucketCors` secara idempoten.

### 7. 🟡 Rendah: Ambang Single PUT 100 MB & Config Nginx Legacy
- **Lokasi:** `DriveController.php` (L392), `DriveUploadDialog.tsx` (L66), `deploy/nginx.conf` (L161).
- **Masalah:** Batas multipart saat ini `100 MB`, tepat pada batas maksimal body request Cloudflare Free/Pro (`100 MB`). Selain itu, `deploy/nginx.conf` masih mencatat `client_max_body_size 20M` untuk proxy storage lama.
- **Solusi:** Turunkan ambang multipart menjadi `50 MB` di frontend dan backend; pastikan Nginx produksi pada proxy storage tidak membatasi body di bawah ukuran part.

### 8. 🟡 Rendah: Performa `GET /api/drive` (N+1 Query & Tanpa Paginasi)
- **Lokasi:** `backend/app/Http/Controllers/Api/DriveController.php` (L106–L112).
- **Masalah:** Seluruh folder dan file dimuat sekaligus lalu difilter di PHP menggunakan `DriveAccess::canReadFile()`, yang memicu query berulang per item (lazy load `folder`, `unit`, `members`). Saat berkas mencapai ratusan/ribuan, response berisiko melambat atau melewati timeout axios `20s`.
- **Solusi:** Tambahkan eager-loading (`with(['folder', 'unit'])`) dan paginasi bertahap.

### 9. 🟡 Rendah: Blocklist MIME Tidak Efektif
- **Lokasi:** `backend/app/Http/Controllers/Api/DriveController.php` (L584).
- **Masalah:** Kode memblokir `application/x-msdownload` dan `application/x-sh`, padahal ekstensi `finfo` PHP untuk binary Windows/shellscript umumnya mengembalikan `application/x-dosexec` dan `text/x-shellscript`. Sementara file `.html` yang sah ikut tertolak.

### 10. 🟡 Rendah: Kredensial Fallback Hardcoded di Config
- **Lokasi:** `backend/config/filesystems.php` (L77–L99).
- **Masalah:** Disk `drive` dan `drive_signer` memiliki default literal `key` dan `secret` jika `.env` kosong. Wajib dihapus dari kode dan lakukan rotasi password RustFS jika nilai tersebut pernah digunakan di produksi.

### 11. ℹ️ Fitur: Transfer Ownership Belum Tersedia (+ Risiko `cascadeOnDelete`)
- **Kondisi Saat Ini:**
  - Fitur *transfer ownership* (pemindahan kepemilikan berkas/folder tunggal maupun massal saat pegawai mutasi/pensiun) **belum ada** di backend maupun frontend.
  - Endpoint `assign-manager` (`/drive/folders/{id}/assign-manager`) hanya mengganti `user_id` **folder itu sendiri** (isi file & subfolder di dalamnya tetap milik user lama), tidak mencabut share manager sebelumnya, dan otomatis membuat user baru (`is_active: false`) dari NIP jika belum ada akun.
  - **Risiko Database:** `drive_files.user_id` dan `drive_folders.user_id` menggunakan `cascadeOnDelete` (`2026_10_29_180000_create_bksda_drive_tables.php`). Meski `User` memakai `SoftDeletes`, aksi *force delete* pada akun user akan **menghapus seluruh catatan file miliknya** (termasuk file kolaborasi di Drive Unit) sementara objek fisik tertinggal di S3.
- **Usulan Desain:**
  - Endpoint `POST /api/drive/{type}/{id}/transfer` `{ new_owner_id }` (rekursif jika folder, dalam transaksi, validasi user aktif, cek kuota penerima jika ruang pribadi).
  - Endpoint admin `POST /api/drive/admin/users/{id}/transfer-all` untuk mutasi/pensiun massal.
  - Ubah FK menjadi `restrictOnDelete` pada `user_id` agar akun yang masih memiliki aset tidak dapat di-*force delete* sebelum aset dialihkan.

---

## Bagian B — Audit Relasi Mendalam (FE ↔ BE ↔ DB)

### 12. 🔴 Kritis: Ketidakcocokan Path Jamak (FE) vs Tunggal (BE) pada 5 Aksi Utama
- **Lokasi:** `frontend/src/app/drive/page.tsx` (L210–L273) vs `backend/routes/api.php` (L97–L101).
- **Akar Masalah:**
  - Backend mendefinisikan route `/drive/{type}/{id}/...` dengan `->whereIn('type', ['folder', 'file'])` (**tunggal**).
  - Frontend memanggil bentuk **jamak** (`/drive/folders/...` dan `/drive/files/...`):
    - Star: `PUT /drive/{files|folders}/{id}/star` → **404**
    - Rename: `PUT /drive/{files|folders}/{id}/rename` → **404**
    - Trash: `DELETE /drive/{files|folders}/{id}` → **404 / 405**
    - Restore: `POST /drive/{files|folders}/{id}/restore` → **404**
    - Force Delete: `DELETE /drive/{files|folders}/{id}/force` → **404**
  - Suite tes backend selama ini lolos karena seluruh tes memanggil path tunggal (`/api/drive/file/{id}`), sehingga tidak mendeteksi bug URL di frontend.
- **Solusi:** Ubah 5 endpoint di `page.tsx` ke bentuk tunggal (`folder` / `file`) dan tambahkan tes kontrak URL FE↔BE.

### 13. 🔴 Kritis: Force-Delete Folder Terbatas Membocorkan File Rahasia ke Root Unit
- **Lokasi:** `DriveController.php` (`trash`, `restore`, `forceDelete`), `PurgeDriveTrashCommand.php`, dan migrasi `2026_10_29_180000` (L47, L63).
- **Akar Masalah:**
  - Saat folder dihapus (`trash`), `drive_files` dan subfolder di dalamnya **tidak ikut** di-soft-delete.
  - Foreign key `drive_files.folder_id` dan `drive_folders.parent_id` menggunakan `nullOnDelete`.
  - Ketika folder terbatas (misal folder Resor) di-*force delete* (baik oleh admin maupun otomatis oleh `drive:purge-trash` setelah 30 hari), database mengubah `folder_id` seluruh berkas di dalamnya menjadi `NULL`. Berkas yang tetap memiliki `unit_id` tersebut **jatuh ke root Drive Unit** dan otomatis dapat dibaca oleh seluruh anggota unit (kebocoran data rahasia).
  - Selama folder masih berada di Trash, file di dalamnya tetap muncul pada hasil pencarian (`search`).
- **Solusi:** Terapkan `trash`, `restore`, dan `forceDelete` secara **rekursif** terhadap seluruh subfolder dan berkas di dalamnya (termasuk penghapusan objek S3 saat `forceDelete`). Keluarkan item yang memiliki leluhur terhapus dari hasil `search`.

### 14. 🔴 Tinggi: Share Internal Gagal Total di Backend & Frontend
- **Akar Masalah di Backend (`DriveAccess.php` L208–L264 & `DriveController.php` L106–L112):**
  - Pada `canReadFile`: jika berkas berada dalam folder (`$file->folder_id`), fungsi langsung mengembalikan hasil `canReadFolder()` dan **tidak pernah mengecek `drive_shares`** milik berkas tersebut (pengecekan share di baris 235 hanya tercapai jika berkas berada di root pribadi, dan itu pun hanya mengecek `user_id` tanpa `unit_id`).
  - Pada `canWriteFile`: tidak pernah mengecek `drive_shares` dengan `role = 'editor'`.
  - Akibatnya, file di dalam folder yang di-share ke user lain tetap menolak penerima (`403 Forbidden`) dan tab *"Dibagikan dengan saya"* selalu mengembalikan `0` item.
- **Akar Masalah di Frontend (`DriveShareDialog.tsx` L90–L98):**
  - Dropdown daftar pegawai mengambil data dari `/kepegawaian/employees?per_page=100`, memetakan `id: e.user_id || e.id` dan `name: e.name`.
  - Endpoint kepegawaian tersebut tidak menyertakan `user_id` dan memakai field `nama_lengkap` (bukan `name`), serta terproteksi oleh izin modul Kepegawaian. Akibatnya:
    1. Pegawai biasa tanpa akses modul Kepegawaian mendapat daftar kosong.
    2. Jika berhasil dimuat, nama tampil kosong/`undefined` dan ID yang dikirim ke backend adalah **ID tabel `kpg_employees`**, bukan `users.id` → akses dibagikan ke **akun user lain yang kebetulan memiliki ID numerik sama** atau error `404`.
  - Opsi share ke **Unit** (`targetType = 'unit'`) dan pilihan role **Editor/Viewer** (`internalRole`) belum memiliki elemen UI di form share.
- **Solusi:**
  - Perbaiki `canReadFile()` / `canWriteFile()` agar mengecek `drive_shares` (baik `user_id` maupun `unit_id`) sebelum atau sejajar dengan pengecekan folder.
  - Sediakan endpoint kandidat penerima khusus Drive (misal `GET /api/drive/shares/candidates`) yang mengembalikan `users.id`, `name`, dan `nip`.
  - Lengkapi UI `DriveShareDialog.tsx` dengan pemilih target (`Pegawai` / `Unit`) dan role (`Viewer` / `Editor`).

### 15. 🟠 Sedang: Pindah Folder/Berkas Merusak Konsistensi `unit_id` & Bypass Kuota
- **Lokasi:** `DriveController.php` (`moveFile` L782–L832, `moveFolder` L838–L887), `DriveMoveDialog.tsx` (L39–L42).
- **Akar Masalah:**
  - `moveFolder` hanya memperbarui `unit_id` pada folder itu sendiri; seluruh subfolder dan berkas di dalamnya tetap menyimpan `unit_id` lama sehingga **tidak tampil** di unit tujuan.
  - `moveFile` dan `moveFolder` lintas ruang (pribadi ↔ unit atau antar-unit) **tidak memeriksa kuota ruang tujuan**.
  - Memindahkan file dari Drive Unit ke root pribadi (`destination_folder_id: null, destination_unit_id: null`) membuat `unit_id = null` tetapi membiarkan `user_id` tetap milik pengunggah asli, bukan pemindah (berkas masuk ke Drive pribadi pengunggah).
  - Di UI, `DriveMoveDialog` hanya menampilkan daftar folder pada direktori yang sedang aktif dibuka.

### 16. 🟠 Sedang: UI Menampilkan Tombol Aksi Tanpa Izin Per-Item & Status Bintang Global
- **Lokasi:** `DriveController.php` (L161), `page.tsx` (L163, L409).
- **Masalah:** `index()` mengembalikan satu nilai global `can_write: true` pada mode `space=my`, termasuk saat `filter=shared_with_me`. Akibatnya UI menampilkan tombol *Ganti Nama*, *Pindah*, dan *Hapus* pada berkas milik orang lain yang hanya di-share sebagai *Viewer* (berujung error `403` saat diklik). Selain itu, `is_starred` masih disimpan sebagai kolom boolean di baris file/folder (bersifat global untuk semua user di Drive Unit).

### 17. 🟠 Sedang: Fitur *"Atur Admin Resor / Folder"* Terputus di Frontend
- **Lokasi:** `frontend/src/app/drive/page.tsx` (L404–L421).
- **Masalah:** `page.tsx` sudah menyiapkan state `assignManagerFolder` dan modal dialognya (L449–L502), namun lupa mengoper props `isDriveAdmin={isDriveAdmin}` dan `onAssignManager={setAssignManagerFolder}` ke `<DriveFileList />`. Akibatnya menu *"Atur Admin Resor"* tidak pernah tampil di UI.

### 18. 🟡 Rendah: Integritas Skema & Indeks Database
- **Lokasi:** Migrasi `2026_10_30_130000_restructure_drive_units_and_folder_rbac.php` (L26) & `2026_10_29_180000`.
- **Masalah:** Kolom `drive_shares.folder_id` ditambahkan tanpa constraint *foreign key*, dan `drive_uploads` belum memiliki indeks komposit `(user_id, status)` / `(unit_id, status)` untuk query perhitungan kuota.

### 19. 🟠 Sedang: Chip Filter Kategori di Toolbar Mati Total (Props Tidak Terhubung)
- **Lokasi:** `frontend/src/app/drive/page.tsx` (L55, L384–396), `frontend/src/app/drive/_components/DriveToolbar.tsx` (L38–39, L54–55, L202).
- **Akar Masalah:**
  - `page.tsx` sudah mendeklarasikan state `categoryFilter` (`useState<string>("all")`) dan `filteredFiles`, sementara `DriveToolbar.tsx` sudah merender 5 tombol filter kategori (*Semua, Dokumen, Gambar, Video, Arsip*) yang memanggil `onCategoryFilterChange?.(chip.id)`.
  - Namun `<DriveToolbar>` di `page.tsx` (L384–396) **tidak menerima props `categoryFilter` maupun `onCategoryFilterChange`**. Karena opsional (`?.`), seluruh klik chip kategori tidak memicu aksi apa pun.
- **Solusi:** Teruskan `categoryFilter={categoryFilter}` dan `onCategoryFilterChange={setCategoryFilter}` ke `<DriveToolbar>` di `page.tsx`.

### 20. 🔴 Tinggi: File di Sampah Membebaskan Kuota + `restore()` Tanpa Cek Kuota (Bypass Kuota Tak Terbatas)
- **Lokasi:** `backend/app/Http/Controllers/Api/DriveController.php` (L130, L304–314, L411), `backend/app/Models/DriveUnit.php` (L37–40).
- **Akar Masalah:**
  - Baik perhitungan kuota pribadi di `index()` / `initUpload()` (`->whereNull('deleted_at')`) maupun `DriveUnit::usedStorageBytes()` (`$this->files()->whereNull('deleted_at')->sum('size_bytes')`) **tidak menghitung file yang berada di Sampah**, padahal objek fisiknya tetap tersimpan di bucket RustFS selama 30 hari hingga dibersihkan `PurgeDriveTrashCommand`.
  - Di sisi lain, `restore()` (L304–314) langsung memanggil `$model->restore()` **tanpa memeriksa sisa kuota**.
  - Akibatnya, user dapat mengunggah 5 GB → memindahkan ke Sampah (kuota terhitung kembali menjadi 0 GB) → mengunggah 5 GB lagi → memulihkan file dari Sampah → total penyimpanan aktual di bucket menjadi 10 GB atau tidak terbatas.
- **Solusi:** Hitung seluruh `DriveFile` termasuk yang di Sampah (`withTrashed()`) dalam kalkulasi kuota aktif (seperti standar Google Drive/Nextcloud), atau wajibkan pengecekan kuota pada `restore()` sebelum memulihkan file/folder.

### 21. 🟠 Sedang: Memulihkan File dari Folder Terhapus Menghasilkan File "Yatim / Tak Terlihat"
- **Lokasi:** `backend/app/Http/Controllers/Api/DriveController.php` (L91–98, L304–314).
- **Akar Masalah:**
  - Pada mode normal (`$search === '' && $filter === 'all'`), `index()` menampilkan isi root dengan `whereNull('folder_id')` atau isi folder aktif dengan `where('folder_id', $folderId)`.
  - Jika user menghapus folder (`trash`), lalu masuk ke Sampah dan memulihkan **hanya file anaknya** sementara folder induk (`folder_id`) masih berstatus terhapus (`deleted_at IS NOT NULL`), maka file tersebut hilang dari daftar Sampah (karena `deleted_at = null`), tetapi juga **tidak pernah tampil di root** dan folder induknya tidak bisa dibuka. File menjadi tersembunyi permanen kecuali dicari manual lewat kolom *Search*.
- **Solusi:** Saat memulihkan item yang memiliki `folder_id` ke folder berstatus *soft-deleted*, kembalikan `folder_id = null` (pindahkan ke root ruang terkait) atau pulihkan rantai folder induknya secara eksplisit.

### 22. 🟠 Sedang: Mode Sampah Mengabaikan `canWrite` & `Hapus Permanen` Tanpa Konfirmasi
- **Lokasi:** `frontend/src/app/drive/_components/DriveFileList.tsx` (L268–280 untuk folder, L390–402 untuk berkas).
- **Akar Masalah:**
  - Pada blok `isTrash`, menu dropdown merender tombol `Pulihkan` dan `Hapus Permanen` secara unconditional **tanpa memeriksa `canWrite`**. User berstatus `viewer` di Drive Unit tetap melihat kedua tombol tersebut dan mendapat error `403` saat diklik.
  - Aksi `onForceDelete("folder" | "file", id)` langsung mengeksekusi `DELETE /api/drive/.../force` pada klik pertama **tanpa dialog konfirmasi**, berisiko menghapus data dan objek S3 secara permanen akibat salah klik.
- **Solusi:** Batasi rendering tombol Sampah dengan `canWrite` dan tampilkan dialog konfirmasi sebelum memanggil `onForceDelete`.

### 23. 🟡 Rendah: Halaman Share Publik `/drive/s/[token]` Bypass Normalisasi `api.ts` & Stale State di `DriveShareDialog`
- **Lokasi:** `frontend/src/app/drive/s/[token]/page.tsx` (L69–75, L101), `frontend/src/app/drive/_components/DriveShareDialog.tsx` (L86–101).
- **Akar Masalah:**
  - Halaman publik `s/[token]/page.tsx` memanggil `axios.get(`${apiUrl}/drive/s/${token}`)` langsung menggunakan `process.env.NEXT_PUBLIC_API_URL || "https://bksdakaltim.web.id/api"`, melewati helper normalisasi `api.ts` (berisiko gagal di lingkungan lokal/staging bila `NEXT_PUBLIC_API_URL` berakhiran `/` atau belum menyertakan `/api`).
  - Di `DriveShareDialog.tsx`, `useEffect([open, file])` tidak mereset state `password`, `targetId`, `internalRole`, `copied`, maupun `tab` ketika user menutup dialog lalu membuka dialog share pada file lain.

---

## Rencana & Urutan Perbaikan Terstruktur

| Fase | Target Item | Fokus Perubahan |
|---|---|---|
| **Fase 1 (P0 — Kritis & Darurat)** | **#1, #2, #3, #4, #12, #13, #20** | 1. Perbaiki 5 path FE jamak → tunggal (`page.tsx`) + tes kontrak URL.<br>2. Pisahkan bucket throttle (`throttle:300,1,drive_upload`) + auto-retry `429` di `DriveUploadDialog.tsx`.<br>3. Hardening `completeUpload` (lock, status, `exists()`, cek ukuran S3 aktual) + paksa `unit_id` dari folder induk + hitung file Sampah dalam kuota (`withTrashed()`).<br>4. Rekursif `trash` / `restore` / `forceDelete` folder (termasuk cegah file yatim #21) & kecualikan item di dalam folder terhapus dari `search`. |
| **Fase 2 (P1 — Fitur & RBAC Inti)** | **#5, #6, #7, #11, #14, #15, #16, #19, #21, #22** | 1. Perbaiki `DriveAccess` untuk share file (`user` & `unit`, `viewer` & `editor`), endpoint kandidat penerima valid (`users.id`), dan lengkapi UI `DriveShareDialog`.<br>2. Rekursif `moveFolder` + cek kuota pada `moveFile`/`moveFolder`.<br>3. Endpoint `abort` upload, `storage:setup --drive` (CORS `ETag`), dan turunkan ambang multipart ke `50 MB`.<br>4. Implementasi fitur **Transfer Ownership** (tunggal/folder rekursif & massal admin) + ubah `user_id` FK ke `restrictOnDelete`.<br>5. Kirim `can_write` per item di `index()`, sambungkan chip `categoryFilter` (#19), jaga `canWrite` & tambah konfirmasi `Hapus Permanen` di Sampah (#22). |
| **Fase 3 (P2 — Polishing & Hardening)** | **#8, #9, #10, #17, #18, #23** | 1. Sambungkan props `isDriveAdmin` & `onAssignManager` di `page.tsx`.<br>2. Eager-loading & paginasi `GET /api/drive`.<br>3. Normalisasi URL di `s/[token]/page.tsx` & reset state `DriveShareDialog` (#23).<br>4. Pembersihan fallback kredensial di `filesystems.php`, perbaikan daftar MIME, serta migrasi FK `drive_shares.folder_id` & indeks `drive_uploads`. |

---

## Rencana Suite Pengujian Pembuktian Keamanan & Relasi Drive

Untuk membuktikan secara objektif bahwa modul BKSDA Drive aman, konsisten antara FE ↔ BE ↔ DB ↔ Storage, dan tahan terhadap penyalahgunaan setelah perbaikan diterapkan, suite pengujian harus mencakup 4 lapis berikut:

### Lapis 1 — Backend PHPUnit Security, Quota, Lifecycle & RBAC Suite
File target: `backend/tests/Feature/DriveSecurityAndIntegrityTest.php` (memperluas cakupan dari `DriveHierarchyAndResorRbacTest.php` yang ada) menggunakan `Storage::fake('drive')` dan `Storage::fake('drive_signer')`.
1. **Bulk Upload & Rate-Limit Isolation (#1):**
   - Simulasikan 35 siklus `POST /api/drive/upload/init` + `complete` secara beruntun dalam 1 menit + request ke `/api/me` di antaranya. Wajib semuanya sukses (`201`) tanpa `429`, membuktikan bucket `drive_upload` terpisah dari route API umum.
2. **Upload Integrity, Idempotency & S3 Reality Check (#2, #3, #4, #5):**
   - `completeUpload` saat objek tidak ada di `Storage::disk('drive')` → wajib ditolak `422` (tidak membuat `DriveFile`).
   - `completeUpload` dipanggil 2× untuk `upload_id` yang sama → panggilan ke-2 wajib ditolak `409`/`422`, hanya 1 `DriveFile` tercipta.
   - `initUpload` dengan `size: 100` tetapi ukuran file aktual di S3 melebihi sisa kuota → `completeUpload` wajib menolak `422` dan menghapus objek S3 tersebut.
   - `initUpload` dengan `folder_id` milik pribadi dan `unit_id` milik unit lain → `unit_id` hasil akhir wajib mengikuti folder induk (`null`), atau ditolak `403`.
   - `POST /api/drive/upload/{id}/abort` → status berubah `aborted` dan `reservedStorageBytes()` langsung turun.
3. **Quota & Soft-Delete Lifecycle (#20, #21):**
   - Upload 4.5 GB (batas 5 GB) → `trash` file → coba upload 1 GB lagi → wajib ditolak `422` (kuota tidak bebas hanya karena masuk Sampah), atau jika diizinkan bersyarat, `restore()` wajib menolak `422` jika total melebihi kuota.
   - `trash` folder berisi file → `restore` hanya file anak → file wajib dipulihkan ke root (atau folder induk ikut dipulihkan) dan **muncul di `GET /api/drive`**, tidak menjadi yatim.
4. **Folder Deletion Anti-Leak & Search Isolation (#13):**
   - Buat folder unit `is_restricted = true` (hanya manager), unggah file rahasia ke dalamnya, lalu `forceDelete` folder sebagai admin → pastikan file di dalamnya ikut terhapus permanen (DB + S3), **tidak pernah** muncul di root unit (`folder_id = null`) dan user unit biasa tetap mendapat `403`/tidak melihat file tersebut.
   - Folder di-`trash` → `GET /api/drive?search=<nama_file_dalam_folder>` wajib mengembalikan `0` hasil.
5. **Internal Sharing & DriveAccess Matrix (#14, #16):**
   - Share file di dalam folder pribadi ke User B (`viewer`) dan ke Unit lain (`editor`):
     - User B (`viewer`): bisa `GET /api/drive?filter=shared_with_me`, bisa `downloadUrl`, menerima `can_write: false`, dan **ditolak `403`** saat `rename`, `move`, `trash`, atau `createShare`.
     - Anggota Unit tujuan (`editor`): bisa membaca dan mengganti nama file, tetapi tidak bisa memindah/hapus jika bukan pemilik.
     - Pastikan `GET /api/drive/shares/candidates` mengembalikan `users.id` (bukan `kpg_employees.id`) dan dapat diakses oleh pegawai biasa tanpa role Kepegawaian.
6. **Cross-Space Move & Transfer Ownership (#11, #15):**
   - `moveFolder` lintas unit memindahkan seluruh subfolder dan file di dalamnya ke `unit_id` tujuan secara rekursif, dan menolak `422` bila melebihi kuota unit tujuan.
   - Transfer ownership file/folder rekursif dari User A ke User B memindahkan `user_id`, memperbarui `used_bytes` User A dan User B secara akurat, menolak transfer oleh non-owner/non-admin (`403`), serta menguji penghapusan akun user yang masih memiliki file terblokir (`restrictOnDelete`).

### Lapis 2 — FE ↔ BE Contract & Route Consistency Check
1. **Route Singular/Plural & Payload Contract (#12, #14, #23):**
   - Verifikasi otomatis (script/test FE atau PHPUnit route test) bahwa seluruh pemanggilan `api.put`/`api.post`/`api.delete` di `frontend/src/app/drive/**` cocok 1:1 dengan `php artisan route:list --path=api/drive` (tidak ada `/drive/files/` atau `/drive/folders/` yang `404`).
   - Verifikasi `/drive/s/[token]` mendukung share publik dengan password (benar `200`, salah `403`) dan expired (`410`).

### Lapis 3 — Playwright End-to-End Browser Verification
File target: perluasan `frontend/tests/drive-security-ui.playwright.cjs` terhadap backend + frontend terhubung:
1. **Bulk Upload 35 File Nyata (#1):** Pilih 35 file di `DriveUploadDialog` (dengan intercept mock presigned PUT S3 lokal), pastikan seluruh 35 file berstatus selesai (`completed`) tanpa kegagalan beruntun `429`.
2. **Aksi File & Folder via UI (#12, #17, #19, #22):**
   - Klik Bintang, Ganti Nama, Pindah, Buang ke Sampah, Pulihkan, dan Hapus Permanen pada file & folder melalui UI → pastikan tidak ada respons jaringan `404` atau `500`.
   - Klik chip filter kategori (*Dokumen*, *Gambar*, dll.) → daftar file tersaring secara nyata.
   - Pada Sampah, klik *Hapus Permanen* → dialog konfirmasi muncul; dan login sebagai `viewer` unit → tombol *Pulihkan* / *Hapus Permanen* tidak dirender.
   - Login sebagai Drive Admin → menu *"Atur Admin Resor / Folder"* tampil dan menyimpan manager.
3. **Share & XSS Guard (#14, #23):**
   - Buka `DriveShareDialog`, cari kandidat pegawai (memastikan `users.id` tampil benar, bukan `undefined`), pilih target Unit & role Viewer/Editor, buat tautan publik ber-password, buka di halaman incognito `/drive/s/[token]` dan verifikasi unduhan sukses.
   - Unggah/rename file dengan nama `<img src=x onerror=window.__xss=1>` → pastikan dirender sebagai teks aman tanpa eksekusi skrip.

### Lapis 4 — Live Storage (RustFS) & Proxy Infrastructure Smoke Test
1. Jalankan `php artisan storage:setup --drive` pada bucket uji RustFS dan verifikasi `GetBucketCors` mengembalikan `ExposeHeaders: ["ETag"]` untuk origin aplikasi.
2. Uji **Multipart Upload > 50 MB** (misal 60 MB) langsung dari browser ke presigned URL RustFS melalui proxy produksi/staging untuk memastikan `ETag` terbaca oleh browser dan `CompleteMultipartUpload` berhasil tanpa terpotong batas body `client_max_body_size` Nginx atau batas `100 MB` Cloudflare.
3. Verifikasi header respons unduhan presigned URL menyertakan `Content-Disposition: attachment` untuk file berisiko (`.html`, `.svg`) agar tidak tereksekusi inline di origin storage.

---

## Catatan Pelaksanaan & Hasil Verifikasi Aktual (14 November 2026)

### Masalah yang Ditemukan Selama Pengerjaan
1. **Memori PHPUnit pada Mock File 60 MB (`DriveRootConcurrencyAndMultipartTest`):** Setelah `completeUpload()` membaca ukuran objek aktual dari storage (`Storage::disk('drive')->size()`), tes lama yang mengunggah string `'PDF DUMMY BYTES'` (15 byte) untuk klaim 60 MB gagal, dan alokasi `str_repeat('0', 62914560)` memicu `Allowed memory size exhausted` (128 MB). Diperbaiki dengan `tmpfile()` + `ftruncate($tmpStream, $size)` tanpa alokasi RAM besar.
2. **Test DeReporting Terpisah (`DeReportingDriveIntegrationTest`):** 3/4 tes lulus; 1 tes (`test_public_submit_saves_files_to_drive_disk_and_does_not_consume_creator_personal_quota`) gagal pada asersi notifikasi `PortalNotification` (`assertNotNull($notification)`), di luar modul Drive.
3. **Kontrak & Interface FE (`DriveFileList.tsx` & `DriveShareDialog.tsx`):** Penambahan `can_write` per item dan prop `units` terverifikasi penuh melalui `next build` TypeScript check.

### Hasil Pengujian Akhir
- **Backend PHPUnit (8 Suite Drive):** `67/67 tests PASSED` (`356 assertions`, `7.56s`) termasuk [`DriveSecurityAndIntegrityTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/DriveSecurityAndIntegrityTest.php).
- **Frontend Next.js Production Build:** `npm run build --prefix frontend` → **Compiled + TypeScript 0 errors, 86/86 static pages**.
- **Playwright E2E Security UI (`drive-security-ui.playwright.cjs`):** **12/12 suites, 30 assertions PASS**.
- **Playwright Agentic Root (`drive-agentic-root.playwright.cjs`):** **10/10 suites, 22 assertions PASS**.
- **Catatan Lingkungan Produksi (Perlu Eksekusi di Server):** `php artisan migrate` (untuk indeks `drive_uploads` & FK `drive_shares.folder_id`/`restrictOnDelete`) dan `php artisan storage:setup --drive` (untuk CORS `ExposeHeaders: ETag` pada bucket `bksda-drive`).
