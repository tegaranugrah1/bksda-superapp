# Audit Mendalam & Uji Sandbox 5-User Sistem Notifikasi Portal (BE ↔ FE ↔ E2E)

**Tanggal Audit:** 14 November 2026  
**Status:** ✅ Audit & Uji Sandbox Selesai (**Tanpa Perubahan Kode Produksi** — sesuai instruksi)  
**Cakupan:** Backend (`PortalNotificationService`, `PortalNotificationController`, `EmployeeLeaveRequestController`, `AssignmentLetterController`, `FormBuilderController`, `HealthMonitorCommand`, `User`, `channels.php`), Frontend (`NotificationBell.tsx`, `portal/page.tsx`, `MyLeaveTab.tsx`, `lib/echo.ts`, `lib/api.ts`), dan Suite Test Eksisting + Sandbox 5-User.

---

## 1. Ringkasan Eksekutif & Penjelasan Kasus "Duriawati Halim"

Saat akun **Super Admin** (atau **Admin Kepegawaian**) mengklik notifikasi *"Pengajuan Cuti Baru"* milik **Duriawati Halim** di Portal Pegawai dan muncul pesan **"Permohonan cuti tidak tersedia atau tidak dapat diakses."**, penyebab utamanya adalah **ketidakcocokan kontrak endpoint antara producer notifikasi admin dengan consumer tab Portal**:

1. **Producer (`EmployeeLeaveRequestController::myStore()`):**  
   Saat pegawai mengajukan cuti, backend memanggil [`PortalNotificationService::notifyAdmins()`](file:///e:/bksda-superapp/backend/app/Services/PortalNotificationService.php) dengan parameter `actionTab: 'cuti'` dan `referenceId: (string) $leaveReq->id` (lihat [`EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php#L299-L306)).
2. **Consumer (`NotificationBell.tsx` → `portal/page.tsx` → `MyLeaveTab.tsx`):**  
   Klik pada notifikasi mengarahkan user ke tab Portal `"cuti"` dengan `highlightId = reference_id` (`activeLeaveId`). Komponen [`MyLeaveTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/MyLeaveTab.tsx#L55-L100) otomatis memanggil `GET /api/me/leave-requests/{id}`.
3. **Otorisasi Endpoint (`EmployeeLeaveRequestController::myShow()`):**  
   Method [`myShow()`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php#L65-L79) adalah endpoint **self-service pribadi**:
   - Pertama, mencari `Employee::where('nip', $user->username)->first()` → jika tidak ada (seperti akun `super_admin` yang tidak terikat NIP pegawai), langsung mengembalikan HTTP `404` (`Data pegawai tidak ditemukan untuk akun ini`).
   - Kedua, menjalankan `EmployeeLeaveRequest::where('employee_id', $employee->id)->findOrFail($id)` → jika `admin` Kepegawaian memiliki data pegawai sendiri, ID pengajuan cuti milik Duriawati Halim tidak cocok dengan `employee_id` milik admin tersebut, sehingga Eloquent melempar `ModelNotFoundException` (HTTP `404`).
4. **Efek di UI:** `.catch()` pada [`MyLeaveTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/MyLeaveTab.tsx) menangkap `404` tersebut dan menampilkan toast error `"Permohonan cuti tidak tersedia atau tidak dapat diakses."`.

> **Catatan:** Dari sisi keamanan, `myShow()` **sudah benar** membatasi kepemilikan data (anti-IDOR antar-pegawai). Yang keliru adalah notifikasi admin (`notifyAdmins`) menautkan aksi ke tab Portal pribadi (`action_tab: 'cuti'`) alih-alih ke modul administrasi Kepegawaian (`/kepegawaian` bagian persetujuan cuti).

---

## 2. Metodologi & Hasil Pengujian Sandbox (5 User Persona)

Untuk memastikan seluruh jalur notifikasi lintas-peran teruji secara menyeluruh tanpa mengubah kode produksi, pengujian dijalankan dengan kombinasi suite eksisting + sandbox probe 5 persona:

| Persona | Role | `access_modules` / NIP | Skenario yang Diuji |
| :--- | :--- | :--- | :--- |
| **User 1 (`super_admin`)** | `super_admin` | Semua modul (`*`), tanpa `Employee` | Notifikasi cuti Duriawati Halim (`404`), notifikasi DeReporting, notifikasi HealthMonitor (`pengaturan`), toast mark-as-read |
| **User 2 (`admin`)** | `admin` | `['kepegawaian']`, NIP admin sendiri | Notifikasi cuti Duriawati Halim (`404` karena bukan pemilik `employee_id`), isolasi inbox admin per modul |
| **User 3 (`pegawai1` / Duriawati Halim)** | `user` | `[]`, NIP pegawai pemilik cuti | Notifikasi cuti sendiri (`200` + membuka detail/Surat Izin Cuti), penghapusan peserta Surat Tugas |
| **User 4 (`pegawai2`)** | `user` | `[]`, NIP pegawai lain | Uji anti-IDOR `myShow(77)` (`404`), uji anti-IDOR `markAsRead` lintas user (`404`), uji blindspot tab *"Belum Dibaca"* (8 terbaru read + 2 lama unread) |
| **User 5 (`pegawai3`)** | `user` | `['dereporting']`, NIP pegawai ke-3 | Notifikasi DeReporting (`type: 'dereporting'`, `action_tab: 'responses'`, `data.link`), filter API `?type=dereporting` |

### Ringkasan Eksekusi Tes

1. **Suite PHPUnit Notifikasi Eksisting (5 file):**
   - Perintah: `cd backend; php vendor/bin/phpunit tests/Feature/NotificationBmnLifecycleTest.php tests/Feature/NotificationHealthMonitorTest.php tests/Feature/PortalNotificationLifecycleTest.php tests/Feature/StKepegawaianNotificationQueueTest.php tests/Feature/SuratTugasApprovalAndPortalNotificationTest.php`
   - Hasil: **46/46 tests PASSED, 493 assertions (42.7s)**.
2. **Backend Sandbox Probe 5-User (sementara, dihapus setelah verifikasi agar repo tetap bersih):**
   - Hasil: **2/2 tests PASSED, 17 assertions (1.8s)**.
   - Membuktikan secara deterministik di database SQLite in-memory:
     - `super_admin` & `admin` menerima `PortalNotification` (`action_tab: 'cuti'`, `reference_id: leaveId`) dan keduanya mendapat HTTP `404` pada `GET /api/me/leave-requests/{id}` sementara `pegawai1` (Duriawati Halim) mendapat `200` dan `pegawai2` mendapat `404`.
     - `GET /api/portal/notifications?type=dereporting` mengembalikan **2 item** (semua tipe, bukan terfilter `1` item).
     - `GET /api/portal/notifications?per_page=8` saat 8 notifikasi terbaru `read` dan 2 notifikasi lama `unread` mengembalikan `meta.unread_count = 2` dengan `0` item unread di payload halaman pertama.
     - `POST /api/portal/notifications/{id}/read` milik user lain ditolak dengan HTTP `404` (anti-IDOR berfungsi baik).
3. **Playwright E2E Sandbox Probe 5-User (terhadap Next.js production build di `http://localhost:3199/portal`):**
   - Hasil: **5/5 skenario PASS (`Command exited with code 0`)**:
     - `E2E-1` (`super_admin`): klik notifikasi cuti Duriawati Halim → mereproduksi toast `"Permohonan cuti tidak tersedia atau tidak dapat diakses."`.
     - `E2E-2` (`admin` Kepegawaian): klik notifikasi cuti Duriawati Halim → mereproduksi toast `"Permohonan cuti tidak tersedia atau tidak dapat diakses."`.
     - `E2E-3` (`pegawai1` / Duriawati Halim): klik notifikasi cuti disetujui miliknya → HTTP `200` & membuka viewer `"Surat Izin Cuti Resmi (TTE Kepala Balai)"`.
     - `E2E-4` (`pegawai2`): klik tab *"Belum Dibaca"* saat `unread_count = 2` berada di posisi >= 9 → mereproduksi tampilan kosong `"Semua notifikasi sudah dibaca"` padahal badge bernilai `2`.
     - `E2E-5` (`pegawai3`): klik notifikasi DeReporting (`action_tab: 'responses'`, `data.link: '/dereporting/forms/5/responses'`) → mereproduksi navigasi gagal (tetap berada di `/portal` dashboard).

---

## 3. Daftar Temuan Masalah (BE ↔ FE ↔ E2E)

| # | Tingkat | Area | Ringkasan Masalah | Lokasi Kode |
| :-: | :--- | :--- | :--- | :--- |
| **1** | 🔴 **Tinggi** | BE ↔ FE | **Notifikasi pengajuan cuti untuk `super_admin` & `admin` selalu gagal `404` di Portal** | [`EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php#L65-L79), [L299-L306](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php#L299-L306), [`MyLeaveTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/MyLeaveTab.tsx#L55-L100) |
| **2** | 🟠 **Sedang** | BE & FE | **Notifikasi DeReporting (`type: 'dereporting'`, `action_tab: 'responses'`) rusak di filter BE dan navigasi/ikon FE** | [`FormBuilderController.php`](file:///e:/bksda-superapp/backend/app/Modules/DeReporting/Controllers/FormBuilderController.php#L770-L783), [`PortalNotificationController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/PortalNotificationController.php#L38-L40), [`portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx#L35), [`NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx#L389-L391) |
| **3** | 🟠 **Sedang** | BE ↔ FE | **Notifikasi `HealthMonitorCommand` (`action_tab: 'pengaturan'`) fallback ke tab `dashboard`** | [`HealthMonitorCommand.php`](file:///e:/bksda-superapp/backend/app/Console/Commands/HealthMonitorCommand.php#L123-L129), [`portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx#L362-L371) |
| **4** | 🟠 **Sedang** | FE | **Blindspot tab *"Belum Dibaca"* di popover `NotificationBell`** (hanya menyaring 8 item terbaru di client) | [`NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx#L414-L416), [L580-L600](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx#L580-L600) |
| **5** | 🟡 **Rendah** | FE | **Tombol *"Buka"* pada toast WebSocket tidak menandai notifikasi sebagai dibaca** (`handleMarkAsRead` terlewat) | [`NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx#L331-L336) |
| **6** | 🟡 **Rendah** | BE ↔ FE | **Notifikasi peserta dihapus dari Surat Tugas memicu toast error `404`; notifikasi pinjaman BMN tidak menyorot `reference_id`** | [`AssignmentLetterController.php`](file:///e:/bksda-superapp/backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php#L878-L893) |
| **7** | 🟡 **Rendah** | Test/CI | **4 test script notifikasi FE lama gagal `ENOENT` di Windows** karena hardcode path Linux `/frontend/...` | `frontend/tests/portal-notification-bell.cjs`, `portal-notification-callbacks.cjs`, `notification-transport.cjs`, `portal-leave-callbacks.cjs` |

### Detail Akar Masalah per Temuan

1. **Temuan #1 (Tinggi — Cuti Admin/Super Admin `404`):**  
   `EmployeeLeaveRequestController::myStore()` mengirim notifikasi ke admin via `notifyAdmins('kepegawaian', ..., 'cuti', 'cuti', (string) $leaveReq->id)`. Tidak ada `data.link` menuju halaman administrasi kepegawaian, dan `NotificationBell.tsx` tidak mendukung navigasi rute eksternal. Akibatnya admin dibawa ke tab pribadi `cuti` di `/portal` yang memanggil `/api/me/leave-requests/{id}` (`myShow()`), yang memang dirancang khusus untuk pemilik cuti.
2. **Temuan #2 (Sedang — DeReporting Tidak Terhubung):**  
   - **Backend:** `FormBuilderController.php` L770–L783 mengirim `type: 'dereporting'`, `actionTab: 'responses'`, dan `data: ['link' => "/dereporting/forms/{$form->id}/responses"]`. Namun `PortalNotificationController::index()` L38–L40 membatasi filter `$type` hanya pada `['surat_tugas', 'cuti', 'bmn', 'system']`, sehingga `?type=dereporting` diabaikan.
   - **Frontend:** `VALID_PORTAL_TABS` di `portal/page.tsx` L35 hanya berisi `["dashboard", "pinjaman", "aset", "surat_tugas", "cuti", "visum", "kalkulator_dinas"]`. Nilai `'responses'` tidak dikenal dan jatuh ke `"dashboard"`. `NotificationBell::handleItemClick()` (L389–L391) juga tidak membaca `item.data?.link` untuk melakukan `router.push()`, dan `TYPE_STYLES`/`getTypeIcon` belum memiliki varian `'dereporting'`.
3. **Temuan #3 (Sedang — HealthMonitor `pengaturan`):**  
   `HealthMonitorCommand.php` L123–L129 mengirim `actionTab: 'pengaturan'` ke `super_admin`. Karena `'pengaturan'` tidak ada di `VALID_PORTAL_TABS`, klik notifikasi hanya membuka tab `dashboard` alih-alih mengarahkan ke halaman pengaturan sistem (`/pengaturan` atau tab admin terkait).
4. **Temuan #4 (Sedang — Blindspot Popover *"Belum Dibaca"*):**  
   `fetchLatest()` mengambil 8 notifikasi terbaru (`per_page: 8`) tanpa parameter `unread_only=1`. Saat pengguna mengklik tab *"Belum Dibaca"* di popover, `displayedNotifications` (L414–L416) hanya memfilter array 8 item tersebut. Jika ada notifikasi unread di posisi ke-9 atau lebih lama, popover menampilkan `"Semua notifikasi sudah dibaca"` sementara badge lonceng dan badge tab *"Belum Dibaca"* tetap menampilkan angka `> 0`.
5. **Temuan #5 (Rendah — Toast *"Buka"* Tidak Mark-as-Read):**  
   Pada handler WebSocket `handleCreated` di `NotificationBell.tsx` L331–L336, tombol aksi `"Buka"` di toast memanggil `onSelectTab(...)` secara langsung tanpa memanggil `handleMarkAsRead(payload.id)`, berbeda dengan `handleItemClick` di daftar lonceng.
6. **Temuan #6 (Rendah — Peserta Dihapus ST & Highlight Pinjaman BMN):**  
   `AssignmentLetterController::notifyLetterEmployees()` (L878–L893) tetap mengirim `action_tab: 'surat_tugas'` dan `reference_id: $letter->id` kepada peserta yang statusnya `'removed'`/`'unavailable'`. Karena peserta sudah dihapus dari surat tugas, akses detail surat tugas tersebut memicu toast error di Portal. Sementara itu, notifikasi pinjaman BMN (`action_tab: 'pinjaman'`) hanya membuka tab tanpa menyorot `reference_id`.
7. **Temuan #7 (Rendah — Script Test FE Lama Hardcode `/frontend/...`):**  
   Keempat script test Node/Playwright lama di `frontend/tests/` mereferensikan path absolut Unix `/frontend/...` sehingga langsung gagal `ENOENT` saat dijalankan di lingkungan Windows (`e:\bksda-superapp\frontend\...`).

---

## 4. Rekomendasi Perbaikan (Belum Diterapkan)

1. **Sinkronkan Kontrak Routing Notifikasi (`data.link` + `NotificationBell` + `router.push`):**
   - Pada `NotificationBell.tsx` (`handleItemClick` dan tombol `"Buka"` pada toast), jika `item.data?.link` tersedia (dengan validasi path internal yang diawali `/` dan bukan `//`), arahkan via `router.push(item.data.link)` dan pastikan `handleMarkAsRead(item.id)` ikut dipanggil pada tombol `"Buka"` toast.
   - Pada `EmployeeLeaveRequestController::myStore()`, sertakan `data: ['link' => '/kepegawaian?tab=cuti&leave_id=' . $leaveReq->id]` pada `notifyAdmins(...)` agar admin/super_admin diarahkan ke panel persetujuan cuti Kepegawaian, bukan `/portal` pribadi.
   - Pada `HealthMonitorCommand.php`, sertakan `data: ['link' => '/pengaturan']` (atau rute panel kesehatan sistem yang sesuai).
2. **Perluas Allowlist Tipe Notifikasi di BE & FE:**
   - Tambahkan `'dereporting'` pada validasi `$type` di `PortalNotificationController::index()` dan tambahkan styling/ikon `'dereporting'` di `NotificationBell.tsx`.
3. **Perbaiki Filter *"Belum Dibaca"* di Popover:**
   - Ketika `popoverFilter === 'unread'`, fetch `/portal/notifications?unread_only=1&per_page=8` (atau dukung parameter `unread_only` di `PortalNotificationController::index()`), sehingga notifikasi unread yang lebih lama tetap muncul di popover.
4. **Hapus `reference_id` untuk Notifikasi Informasi Penghapusan Peserta ST:**
   - Pada `AssignmentLetterController::notifyLetterEmployees()`, kosongkan `action_tab`/`reference_id` (atau set `action_tab: 'surat_tugas'`, `reference_id: null`) khusus untuk status `'removed'` agar klik tidak mencoba memuat surat tugas yang sudah mencabut akses peserta.
5. **Perbaiki Path `frontend/tests/*.cjs`:**
   - Gunakan `path.resolve(__dirname, '..')` agar test notifikasi FE dapat dijalankan lintas OS (Windows & Linux).

---

## 5. Requirement Uji Tambahan & Verifikasi Live Full-Stack E2E (Playwright ↔ Laravel ↔ PostgreSQL)

> [!IMPORTANT]
> **Aturan Pelaporan Objektif:**
> - **Jangan pernah menulis `BERHASIL / PASS`** apabila tidak ada bukti eksekusi nyata yang teramati.
> - Jika pengujian terhenti/terblokir konfigurasi atau dependensi, tandai **`STOPPED / BLOCKED`** beserta penyebab spesifiknya.
> - Jika hanya sebagian skenario yang berjalan dan sebagian terblokir, status keseluruhan wajib ditandai **`SEBAGIAN BERHASIL (PARTIAL)`**.

Untuk menutup celah pengujian sandbox sebelumnya (yang masih memakai API mock `page.route()`), ditambahkan suite E2E full-stack nyata: [`frontend/tests/portal-notifications-live-e2e.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/portal-notifications-live-e2e.playwright.cjs) yang berjalan langsung terhadap `http://localhost:3000` (Next.js) ↔ `http://localhost:8000` (Laravel) ↔ PostgreSQL (dengan 5 user sandbox terisolasi yang dibersihkan otomatis di blok `finally`).

### Hasil Eksekusi Live Full-Stack (`node frontend/tests/portal-notifications-live-e2e.playwright.cjs`)

**Status Keseluruhan Suite:** **SEBAGIAN BERHASIL (`7 PASS`, `1 PARTIAL`, `1 STOPPED / BLOCKED`)**

| ID Skenario | Status | Skenario yang Diuji | Hasil Aktual yang Teramati |
| :--- | :---: | :--- | :--- |
| **E2E-LIVE-01A** | **PASS** | `super_admin` klik notifikasi cuti Duriawati Halim (live BE) | `GET /api/me/leave-requests/{id}` mengembalikan HTTP `404`; toast `"Permohonan cuti tidak tersedia atau tidak dapat diakses."` tampil. |
| **E2E-LIVE-01B** | **PASS** | `admin` Kepegawaian klik notifikasi cuti Duriawati Halim (live BE) | `GET /api/me/leave-requests/{id}` mengembalikan HTTP `404`; toast error tampil. |
| **E2E-LIVE-01C** | **PASS** | `pegawai1` (pemilik) klik notifikasi cuti sendiri (live BE) | `GET /api/me/leave-requests/{id}` mengembalikan HTTP `200`; tampilan detail cuti terbuka tanpa toast error. |
| **E2E-LIVE-02** | **PASS** | Modal Riwayat Notifikasi penuh & pagination halaman 2 | Memuat halaman `2/2` via request nyata `GET /api/portal/notifications?page=2` (`200`). |
| **E2E-LIVE-03** | **PASS** | Klik notifikasi BMN `pinjaman` + blindspot *"Belum Dibaca"* + `mark-all-read` | Tab Pinjaman terbuka (tanpa highlight `reference_id`), blindspot *"Semua notifikasi sudah dibaca"* tereproduksi, `POST /api/portal/notifications/mark-all-read` (`200`) menyimpan `unread_count = 0`. |
| **E2E-LIVE-04** | **PARTIAL** | Klik notifikasi Surat Tugas peserta berstatus `removed` | Script menangkap response `GET /api/surat-tugas/my` (`200`) alih-alih endpoint detail `/api/surat-tugas/my/{id}`, sehingga status detail `404` pada UI belum terverifikasi langsung di run ini. |
| **E2E-LIVE-05** | **PASS** | `super_admin` klik notifikasi HealthMonitor (`action_tab: 'pengaturan'`) | Tetap berada di `/portal` (fallback `dashboard`), tidak berpindah ke `/pengaturan`. |
| **E2E-LIVE-06** | **PASS** | `pegawai3` klik notifikasi DeReporting (`action_tab: 'responses'`) | Tetap berada di `/portal`, tidak berpindah ke `/dereporting/forms/5/responses`. |
| **E2E-LIVE-07** | **STOPPED / BLOCKED** | Live WebSocket Reverb (`PortalNotificationCreated` toast `"Buka"` & [`useAdminInboxLive.ts`](file:///e:/bksda-superapp/frontend/src/hooks/useAdminInboxLive.ts)) | `NEXT_PUBLIC_REVERB_APP_KEY` tidak dikonfigurasi di `frontend/.env.local`; [`getEcho()`](file:///e:/bksda-superapp/frontend/src/lib/echo.ts#L30-L33) mengembalikan `null`, sehingga jalur WebSocket live **tidak dapat diuji** tanpa mengubah env/konfigurasi. |

### Catatan Cakupan Tambahan
- [`NotificationBell`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx) saat ini **hanya terpasang di `/portal`**, tidak di navbar modul lain (`/kepegawaian`, `/bmn`, `/dereporting`, `/drive`, `/pengaturan`).
- Pembaruan live halaman admin memakai event terpisah [`AdminInboxChanged.php`](file:///e:/bksda-superapp/backend/app/Events/AdminInboxChanged.php) dan hook [`useAdminInboxLive.ts`](file:///e:/bksda-superapp/frontend/src/hooks/useAdminInboxLive.ts) (terpasang di `kepegawaian/cuti` dan `kepegawaian/surat-tugas/inbox`, belum terpasang di modul `bmn`), yang juga terblokir uji live oleh alasan `E2E-LIVE-07` di atas.

---

## 6. Audit Keamanan, Kesiapan Production, & Rencana Remediasi (`/ponytail` + `/security-audit`)

### 6.1 Evaluasi Keamanan (Security Posture)
- **Kontrol yang Sudah Kuat:**
  - **Anti-IDOR REST API:** [`PortalNotificationController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/PortalNotificationController.php#L28-L106) selalu memfilter `where('user_id', $user->id)`, membatasi `per_page` (`1..50`), dan dilindungi `auth:sanctum`, `whereNumber('id')`, serta rate limiter di [`routes/api.php`](file:///e:/bksda-superapp/backend/routes/api.php#L78-L80).
  - **Private Token-Scoped WebSocket Channels:** `/api/broadcasting/auth` dilindungi `['api', 'auth:sanctum']` ([`bootstrap/app.php`](file:///e:/bksda-superapp/backend/bootstrap/app.php#L20-L23)); [`channels.php`](file:///e:/bksda-superapp/backend/routes/channels.php#L6-L12) dan [`User.php`](file:///e:/bksda-superapp/backend/app/Models/User.php#L111-L165) memvalidasi token Sanctum aktif (`PersonalAccessToken::findToken($bearer)`), status `is_active`, serta `canAccessAdminInbox($module)`.
  - **Anti-XSS & Payload Minimal:** [`PortalNotificationService.php`](file:///e:/bksda-superapp/backend/app/Services/PortalNotificationService.php#L36-L37) menerapkan `strip_tags(trim(...))` dan [`AdminInboxChanged.php`](file:///e:/bksda-superapp/backend/app/Events/AdminInboxChanged.php#L60-L68) hanya mengirim metadata minimal (`module`, `action`, `reference_id`, `timestamp`).
- **Hardening & Masalah Production yang Harus Ditangani:**
  1. **Pencegahan Open-Redirect pada `data.link`:** Saat [`NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx) mendukung navigasi via `item.data.link`, path wajib divalidasi hanya menerima path relatif internal (`link.startsWith('/') && !link.startsWith('//') && !link.includes('\\')`).
  2. **Rute Target Valid (Anti-404 Rute Frontend):** Hasil pengecekan direktori `frontend/src/app/` membuktikan rute `/pengaturan` **tidak ada**, sedangkan `/kepegawaian/cuti` dan `/dereporting/forms/[id]/responses` tersedia. Oleh karena itu [`HealthMonitorCommand.php`](file:///e:/bksda-superapp/backend/app/Console/Commands/HealthMonitorCommand.php#L123-L129) harus memakai `actionTab: 'dashboard'` + `data: ['link' => '/']` agar tidak mengarahkan `super_admin` ke rute `404`.
  3. **Bug Konfigurasi Host/Port Reverb di [`echo.ts`](file:///e:/bksda-superapp/frontend/src/lib/echo.ts#L55-L83):** Saat ini `wsHost` dan `wsPort` dipaksa diambil dari `NEXT_PUBLIC_API_URL`. Akibatnya pada URL non-TLS `http://localhost:8000/api`, WebSocket menembak port `8000` (Laravel) alih-alih port `8080` (Reverb), dan di production tidak dapat memisahkan host/port Reverb tanpa reverse proxy pada domain yang sama. `echo.ts` perlu membaca `NEXT_PUBLIC_REVERB_HOST`, `NEXT_PUBLIC_REVERB_PORT`, dan `NEXT_PUBLIC_REVERB_SCHEME` sebelum fallback ke `NEXT_PUBLIC_API_URL`.

### 6.2 Rencana Implementasi Minimal (`/ponytail` + `/security-audit`)
1. **Backend:**
   - [`EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php#L299-L306): sertakan `['link' => '/kepegawaian/cuti']` pada `notifyAdmins(...)`.
   - [`PortalNotificationController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/PortalNotificationController.php#L38-L40): tambahkan `'dereporting'` pada allowlist filter `$type`.
   - [`HealthMonitorCommand.php`](file:///e:/bksda-superapp/backend/app/Console/Commands/HealthMonitorCommand.php#L123-L129): arahkan `actionTab: 'dashboard'` dan `data: ['link' => '/']`.
   - [`AssignmentLetterController.php`](file:///e:/bksda-superapp/backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php#L889-L891): set `referenceId = null` untuk peserta berstatus `'removed'`.
2. **Frontend:**
   - [`echo.ts`](file:///e:/bksda-superapp/frontend/src/lib/echo.ts#L50-L90): dukung `NEXT_PUBLIC_REVERB_HOST`, `NEXT_PUBLIC_REVERB_PORT`, dan `NEXT_PUBLIC_REVERB_SCHEME` sebagai prioritas di atas parsing `NEXT_PUBLIC_API_URL`.
   - [`NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx):
     - Tambah `resolveSafeInternalLink()` + navigasi `router.push()` di `handleItemClick()`.
     - Re-use `handleItemClick(item)` pada tombol `"Buka"` toast WebSocket (otomatis `handleMarkAsRead` + navigasi aman).
     - Tambah styling & ikon `'dereporting'`.
     - Kirim `unread_only` sesuai `popoverFilter` pada `fetchLatest()` agar tab *"Belum Dibaca"* di popover bebas blindspot tanpa menambah endpoint baru.
   - [`portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx#L362-L371): fallback aman untuk notifikasi cuti legacy milik `super_admin` tanpa `employeeId` agar diarahkan ke `/kepegawaian/cuti` (mencegah `404` pada notifikasi lama di DB).
3. **Verifikasi Akhir:**
   - Jalankan kembali seluruh PHPUnit suite Notifikasi + tambah assertion baru pada [`PortalNotificationLifecycleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/PortalNotificationLifecycleTest.php) / [`NotificationHealthMonitorTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/NotificationHealthMonitorTest.php).
   - Jalankan `npm run build --prefix frontend` dan perbarui [`portal-notifications-live-e2e.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/portal-notifications-live-e2e.playwright.cjs) (termasuk fix matcher `E2E-LIVE-04` dan verifikasi ulang terhadap build terbaru).

---

## 7. Hasil Implementasi & Verifikasi Pasca-Perbaikan

Perbaikan diterapkan secara minimal sesuai `/ponytail` dan `/security-audit`:

### Perubahan Kode yang Diterapkan
1. **Backend:**
   - [`EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php#L299-L307): `notifyAdmins()` kini menyertakan `['link' => '/kepegawaian/cuti', 'leave_id' => $leaveReq->id]`.
   - [`PortalNotificationController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/PortalNotificationController.php#L38-L40): allowlist `$type` kini mencakup `'dereporting'`.
   - [`HealthMonitorCommand.php`](file:///e:/bksda-superapp/backend/app/Console/Commands/HealthMonitorCommand.php#L123-L131): mengarahkan notifikasi ke `actionTab: 'dashboard'` dengan `['link' => '/']`.
2. **Frontend:**
   - [`echo.ts`](file:///e:/bksda-superapp/frontend/src/lib/echo.ts#L75-L100): mendukung `NEXT_PUBLIC_REVERB_HOST`, `NEXT_PUBLIC_REVERB_PORT`, dan `NEXT_PUBLIC_REVERB_SCHEME` sebelum fallback ke `NEXT_PUBLIC_API_URL`.
   - [`NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx):
     - Helper `resolveSafeInternalLink()` memvalidasi path internal aman (`/` tanpa `//` atau `\`) guna mencegah Open Redirect, lalu menavigasi via `router.push()`.
     - Re-use `handleItemClick()` pada tombol `"Buka"` toast WebSocket (mark-as-read otomatis) serta menekan `reference_id` bila `availability` `'unavailable'`/`'trashed'` atau `status === 'removed'`.
     - Tab *"Belum Dibaca"* di popover kini mengirim `unread_only=1` pada `fetchLatest()` dan mendukung styling `'dereporting'`.
   - [`portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx#L362-L378): fallback notifikasi cuti legacy untuk `super_admin` tanpa `employeeId` menuju `/kepegawaian/cuti`.
3. **Tes:**
   - Ditambahkan assertion baru pada [`NotificationHealthMonitorTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/NotificationHealthMonitorTest.php#L49-L52) dan `test_pn_04_admin_leave_link_and_dereporting_type_filter` pada [`PortalNotificationLifecycleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/PortalNotificationLifecycleTest.php).
   - Diperbarui [`portal-notifications-live-e2e.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/portal-notifications-live-e2e.playwright.cjs) untuk memverifikasi perilaku pasca-perbaikan termasuk uji keamanan Open Redirect (`//evil.example`).

### Hasil Verifikasi Pasca-Perbaikan
- **PHPUnit (5 Suite Notifikasi):** `47/47 tests PASSED` (`500 assertions`, `36.75s`).
- **Next.js Production Build (`npm run build --prefix frontend`):** `Compiled successfully in 12.6s`, **TypeScript 0 errors**, `86/86 static pages`.
- **Playwright Live Full-Stack E2E (`:3199` build baru ↔ Laravel `:8000` ↔ PostgreSQL):** **SEBAGIAN BERHASIL (`9 PASS`, `1 STOPPED / BLOCKED`)**
  - `E2E-LIVE-01A` (`PASS`): `super_admin` klik notifikasi cuti → redirect ke `/kepegawaian/cuti`, tanpa memukul `/api/me/leave-requests/{id}` `404`.
  - `E2E-LIVE-01B` (`PASS`): `admin` Kepegawaian klik notifikasi cuti → redirect ke `/kepegawaian/cuti`, tanpa `404`.
  - `E2E-LIVE-01C` (`PASS`): `pegawai1` (pemilik) klik notifikasi cuti sendiri → `GET /api/me/leave-requests/{id}` `200`.
  - `E2E-LIVE-02` (`PASS`): Modal Riwayat Notifikasi halaman `2/2` via API nyata (`200`).
  - `E2E-LIVE-03` (`PASS`): Klik BMN + tab *"Belum Dibaca"* memuat item lama via `unread_only=1` + `mark-all-read` (`unread_count = 0`).
  - `E2E-LIVE-04` (`PASS`): Notifikasi peserta ST `removed` membuka tab Surat Tugas tanpa menembak detail ST yang dicabut (`403/404`).
  - `E2E-LIVE-05` (`PASS`): HealthMonitor notifikasi untuk `super_admin` menavigasi ke `/`.
  - `E2E-LIVE-06A` (`PASS`): Payload berbahaya `//evil.example/phish` diblokir `resolveSafeInternalLink()`.
  - `E2E-LIVE-06B` (`PASS`): DeReporting notifikasi menavigasi ke `/dereporting/forms/5/responses`.
  - `E2E-LIVE-07` (`STOPPED / BLOCKED`): Uji WebSocket live Reverb terblokir karena `NEXT_PUBLIC_REVERB_APP_KEY` tidak dikonfigurasi di `frontend/.env.local` (serta port `8080` host sedang dipakai proses lain `iVMS-4200.Framework.S.exe`, bukan Laravel Reverb).
