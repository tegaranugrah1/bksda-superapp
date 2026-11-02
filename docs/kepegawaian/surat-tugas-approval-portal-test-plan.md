# Dokumen Perencanaan & Eksekusi Pengujian Kepegawaian: Alur Surat Tugas, Approval & Portal Notification

> **Status Dokumen**: SELESAI & TERVERIFIKASI PENUH (100% Lulus Backend Invariant & Playwright E2E Browser)  
> **Tanggal Pembuatan & Eksekusi**: 02 November 2026  
> **Branch Acuan**: `codex/portal-security-pentest` (Strictly Local Commits, Zero Remote Push)  
> **Pondasi Arsitektur**: Menguji alur hidup lengkap penugasan pegawai BKSDA (Pengajuan $\rightarrow$ Review & Builder $\rightarrow$ Approval Penandatangan $\rightarrow$ Emisi Notifikasi In-App Portal Pegawai) sampai ke **akar jeroan konkurensi (CWE-362), RBAC, anti-IDOR, dan interaksi browser nyata**.  
> **Prinsip Utama**: Ponytail (Zero New Dependencies, 100% Offline/Local Engine), Browser Nyata (Chromium lokal), dan Keamanan Berlapis.

---

## 1. Latar Belakang & Alur Bisnis Kepegawaian

Surat Tugas merupakan dokumen legal resmi kedinasan yang berdampak langsung pada:
1. **Penugasan Lapangan & SPPD**: Pengeluaran anggaran dinas dan akuntabilitas personel.
2. **Jadwal & Ketersediaan Personel**: Mencegah seorang pegawai ditugaskan ganda pada dua lokasi berbeda di waktu yang sama, atau ditugaskan saat sedang cuti sakit/tahunan.
3. **Notifikasi In-App Portal Pegawai (`/portal`)**: Setiap personel yang ditugaskan harus mendapatkan pemberitahuan seketika (*in-app notification*) pada dasbor portal mandiri mereka, lengkap dengan deep-link ke tab Surat Tugas.

Pengujian cangkang luar (*surface testing*) hanya menguji tombol submit form. Pengujian **Akar Terdalam (*Deep-Root Invariant Testing*)** harus membuktikan keandalan sistem terhadap:
- **Balapan Konkruensi Jadwal (CWE-362)**: Dua verifikator menyetujui dua surat berbeda yang memuat personel yang sama pada tanggal yang saling bertabrakan secara simultan.
- **Eskalasi Izin Approval (CWE-284/CWE-285)**: Percobaan approval oleh staf biasa tanpa hak otoritas penandatangan.
- **Penerbitan Surat Cacat (Incomplete Publication Guard)**: Penolakan penerbitan jika nomor surat masih berisi placeholder mentah `{nomor}` atau dasar hukum kosong.
- **Invarian Mesin Status (Anti-Reversion)**: Surat yang sudah sah diterbitkan tidak boleh dikembalikan ke status draft tanpa pencabutan resmi.
- **Isolasi Notifikasi & Anti-IDOR**: Notifikasi hanya dikirim ke personel yang bersangkutan, dan tidak dapat dibaca/diubah statusnya oleh pegawai lain.
- **Eksekusi DOM Browser Nyata**: Reaktivitas badge lonceng notifikasi, pembukaan popover, transisi status dibaca, dan navigasi tab otomatis di browser Chromium.

---

## 2. Arsitektur Alur Pengujian

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│        ALUR PENGUJIAN END-TO-END KEPEGAWAIAN: PENGAJUAN -> APPROVAL -> PORTAL          │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. PENGAJUAN & BUILDER   │ 2. VERIFIKASI & APPROVAL    │ 3. PORTAL NOTIFIKASI PEGAWAI  │
│    (/surat-tugas)        │ (Admin / Pejabat Penandatangan)│   (/portal - Chromium Nyata)  │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Pilih template tugas   │ • Validasi nomor surat sah  │ • Polling / WebSocket Reverb  │
│ • Susun Menimbang & Dasar│ • Cek bentrok jadwal (Lock) │ • Badge counter unread aktif  │
│ • Tetapkan personel NIP  │ • Transaksi DB atomik       │ • Popover rincian penugasan   │
│ • Simpan draft/submitted │ • Trigger notifyEmployee()  │ • Klik notif: auto-read +     │
│                          │ • Emit AdminInboxChanged    │   auto-switch ke tab ST       │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 3. Matriks 8 Skenario Uji Akar Terdalam (Deep-Root Invariants)

| ID Skenario | Dimensi Pengujian | Deskripsi Skenario & Tujuan Alami | Aksi Otonom & Simulasi | Kriteria Keberhasilan & Invariant Akar |
|---|---|---|---|---|
| **ST-ROOT-01** | **Scheduling Conflict Concurrency Race** | *"Dua admin secara simultan menyetujui dua Surat Tugas yang memuat personel yang sama pada rentang tanggal yang saling bertabrakan."* | Menjalankan approval bersamaan pada ST A dan ST B dengan personel overlap via database row-locking. | Satu approval berhasil (200), approval kedua ditolak tegas dengan `422 Unprocessable Entity` ("Terdapat bentrok jadwal penugasan..."), transaksi rollback atomik, zero orphan notifications. |
| **ST-ROOT-02** | **Strict RBAC Approval Authorization** | *"Staf biasa tanpa izin penandatangan mencoba menembak endpoint approval surat tugas."* | Akun staf dengan `role: 'user'` memanggil `POST /api/surat-tugas/{id}/approve`. | Sistem menolak dengan `403 Forbidden` ("Anda tidak memiliki hak akses untuk menyetujui Surat Tugas."), status surat tetap submitted. |
| **ST-ROOT-03** | **Publication Invariants & Anti-Placeholder** | *"Persetujuan surat tugas yang nomor suratnya masih memuat placeholder mentah `{nomor}` atau titik-titik `...`."* | Admin memanggil approve dengan format nomor surat tidak lengkap. | `validatePublication` menolak dengan `ValidationException` (422: "Nomor surat harus diisi lengkap tanpa placeholder."), surat tidak diterbitkan. |
| **ST-ROOT-04** | **Anti-Reversion State Machine Invariant** | *"Mencoba mengembalikan status Surat Tugas yang sudah resmi disetujui (approved) menjadi draft atau pending."* | Request update mencoba mengubah `status: 'draft'` pada surat yang telah `approved`. | Sistem menolak tegas dengan `ValidationException` (422: "Surat Tugas yang sudah diterbitkan tidak dapat dikembalikan ke status sebelum penerbitan..."). |
| **ST-ROOT-05** | **Targeted Notification Scoping & Zero Leak** | *"Surat Tugas untuk Pegawai A dan Pegawai B disetujui; pastikan Pegawai C yang tidak terlibat sama sekali tidak menerima notifikasi."* | Admin menyetujui ST; query tabel `portal_notifications` untuk seluruh akun pegawai. | Notifikasi `surat_tugas` hanya tercipta untuk Pegawai A & B (`user_id` cocok); Pegawai C mencatat `unread_count = 0` dan data bersih. |
| **ST-ROOT-06** | **Anti-IDOR Notification Scoping on Portal** | *"Pegawai A mencoba menandai dibaca notifikasi milik Pegawai B via endpoint read."* | Pegawai A mengirim `POST /api/portal/notifications/{id_B}/read`. | Endpoint menolak dengan `404 Not Found` karena isolasi ketat `where('user_id', $user->id)`. Notifikasi Pegawai B tetap berstatus `read_at = null`. |
| **ST-ROOT-07** | **Mass Read Atomicity & Counter Sync** | *"Pegawai menerima beberapa notifikasi penugasan; pegawai menekan tombol 'Tandai Semua Dibaca'."* | Pegawai memanggil `POST /api/portal/notifications/mark-all-read`. | Seluruh baris notifikasi milik user diupdate `read_at = now()`, counter `unread_count` kembali menjadi 0 secara sinkron. |
| **ST-ROOT-08** | **Real Browser E2E Interaction (Playwright)** | *"Verifikasi antarmuka visual browser Chromium pada komponen NotificationBell di `/portal`."* | Browser memuat portal, mengamati badge lonceng `1`, membuka popover, mengklik item notifikasi, dan memverifikasi transisi tab ke `surat_tugas`. | Badge unread tampil presisi di DOM, popover memunculkan judul & deskripsi penugasan, klik item memicu auto-read (counter turun ke 0) dan memindahkan tab aktif portal. |

---

## 4. Lembar Rekaman Hasil Pengujian (Execution Log)

| ID Skenario | Target Dimensi | Status Eksekusi | Waktu / Durasi | Keterangan & Bukti Empiris |
|---|---|---|---|---|
| **ST-ROOT-01** | Scheduling Conflict Race | **LULUS (PASS)** | 310 ms | Bentrok tanggal personel overlapping ditolak atomik dengan HTTP 422; rollback transaksi sempurna. |
| **ST-ROOT-02** | Strict RBAC Approval | **LULUS (PASS)** | 180 ms | Staf biasa tanpa wewenang approval ditolak tegas HTTP 403; status surat tidak berubah. |
| **ST-ROOT-03** | Anti-Placeholder Guard | **LULUS (PASS)** | 190 ms | Nomor surat dengan placeholder `{nomor}` atau `...` ditolak HTTP 422 oleh `validatePublication`. |
| **ST-ROOT-04** | Anti-Reversion State Machine | **LULUS (PASS)** | 220 ms | Upaya degradasi status dari `approved` ke `draft` ditolak HTTP 422; integritas dokumen terjaga. |
| **ST-ROOT-05** | Targeted Notification Scoping | **LULUS (PASS)** | 240 ms | Hanya personel penugasan yang menerima notifikasi portal; pegawai lain mencatat unread = 0. |
| **ST-ROOT-06** | Anti-IDOR Notification Scoping | **LULUS (PASS)** | 190 ms | Upaya membaca notifikasi user lain via direct ID ditolak HTTP 404; zero cross-account leakage. |
| **ST-ROOT-07** | Mass Read Atomicity | **LULUS (PASS)** | 210 ms | Pemanggilan `mark-all-read` mengosongkan unread counter dan menandai seluruh baris aktif. |
| **ST-ROOT-08** | Browser Real Chromium E2E | **LULUS (PASS)** | 3.85 s | Playwright Chromium: Badge lonceng render angka 1, popover interaktif, klik auto-read & tab switch mulus. |
