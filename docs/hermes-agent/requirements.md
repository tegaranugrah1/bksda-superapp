# Requirements Specification: Hermes Agent (BKSDA Kaltim)

> **Inisiatif**: Asisten Cerdas Terpadu WhatsApp BKSDA SuperApp & Dedicated Coding Sandbox  
> **Status**: APPROVED  
> **Target Infrastruktur**: VM 108 (`192.168.100.205`) pada Proxmox VE Host (`192.168.100.11`)  
> **Alokasi Sumber Daya**: 16 GB RAM, 4 vCPU, 100 GB NVMe Storage  
> **Dokumen Terkait**: [design.md](design.md) | [tasks.md](tasks.md)

---

## 1. Latar Belakang & Masalah Riil (Problem Statement)

1. **Kendala Akses Pegawai Lapangan**:
   - Pegawai BKSDA Kalimantan Timur tersebar di Kantor Balai (Samarinda), SKW I (Berau), SKW II (Tenggarong), SKW III (Balikpapan), dan puluhan Resor Konservasi Wilayah di pelosok hutan/kawasan konservasi.
   - Polisi Kehutanan (Polhut) dan personil lapangan lebih sering mengoperasikan ponsel cerdas berbasis **WhatsApp** daripada menyalakan laptop untuk login ke antarmuka web BKSDA SuperApp.
   - Sering terjadi keterlambatan informasi saat Surat Tugas (ST) resmi diterbitkan, atau kesulitan mengecek sisa saldo cuti tahunan saat berada di luar kantor.
2. **Kebutuhan Asisten Otomasi Tugas Harian**:
   - Pengajuan cuti secara percakapan natural (*conversational leave request*) tanpa formulir manual.
   - Notifikasi otomatis *real-time* disertai tautan unduh dokumen PDF resmi bertanda tangan digital saat penugasan terbit.
   - Pembuatan draf surat tugas (ST) awal secara percakapan langsung ke pimpinan.
3. **Kebutuhan Autonomous Coding & CI/CD Sandbox**:
   - Diperlukan agen koding otomatis (memanfaatkan **Gemini CLI** dan LLM Gemini AI Pro) yang mampu membaca kode, memodifikasi berkas, menjalankan test (`php artisan test` dan `npm run build`), serta membuka Pull Request (PR) ke GitHub.
   - **Kaidah Keamanan Mutlak**: Aktivitas koding dan eksekusi skrip eksperimental agen **dilarang keras** berjalan langsung di VM 106 Produksi BKSDA SuperApp demi menjaga integritas data dan ketersediaan layanan 24/7.

---

## 2. Kebutuhan Pengguna (User Stories)

### 2.1. Pegawai Lapangan / Staf BKSDA
- **US-01 (Cek Saldo Cuti)**: Sebagai pegawai BKSDA, saya ingin mengirim pesan WA *"cek sisa cuti saya"* agar saya tahu persis sisa hak cuti $N, N-1, N-2$ saya tanpa perlu membuka laptop.
- **US-02 (Pengajuan Cuti Percakapan)**: Sebagai pegawai BKSDA, saya ingin mengajukan cuti via WA dengan bahasa wajar (*"ajukan cuti 3 hari dari 10-12 Nov untuk urusan keluarga"*) dan mendapat kartu konfirmasi sebelum tersimpan resmi di sistem.
- **US-03 (Notifikasi Surat Tugas)**: Sebagai personil penugasan, saya ingin menerima pesan WA otomatis begitu Surat Tugas saya diterbitkan oleh Kepala Balai, lengkap dengan nomor surat, tempat tujuan, dan tautan unduh PDF resmi.
- **US-04 (Penyusunan Draf ST)**: Sebagai koordinator kegiatan, saya ingin mendiktekan draf penugasan via WA (*"buat draf ST patroli kawasan Balikpapan tanggal 18-20 Nov, personil A dan B"*), sehingga draf langsung siap ditinjau pimpinan di SuperApp.

### 2.2. Administrator & Kasubbag Tata Usaha
- **US-05 (Integrasi Data Satu Pintu)**: Sebagai admin kepegawaian, saya ingin semua permohonan dari WhatsApp otomatis masuk ke tabel Inbox Cuti & Persuratan BKSDA SuperApp yang sudah terproteksi validasi PerBKN 24/2017.
- **US-06 (Verifikasi Keamanan Nomor)**: Sebagai Kasubbag TU, saya ingin sistem hanya merespons perintah mutasi dari nomor WhatsApp pegawai yang telah terdaftar resmi di basis data pegawai (`kpg_employees`).

### 2.3. Developer / Sysadmin
- **US-07 (Coding Agent Sandbox Terisolasi)**: Sebagai pengembang, saya ingin agen koding bekerja di VM 108 (16 GB RAM) menggunakan Gemini CLI, mengeksekusi tes mandiri, dan membuat Pull Request tanpa membahayakan server produksi (VM 106).
- **US-08 (Fleksibilitas Pergantian Nomor & Skalabilitas)**: Sebagai sysadmin, saya ingin nomor WhatsApp bot dapat diganti kapan saja via scan QR baru, serta kapasitas RAM/HDD di VM Proxmox dapat dinaikkan kapan pun tanpa instal ulang.

---

## 3. Kebutuhan Fungsional (Functional Requirements)

### 3.1. Sub-Sistem Asisten WhatsApp (Hermes Daily Assistant)
- **FR-01 (Identifikasi Nomor Pengirim)**:
  - Sistem mengidentifikasi pengirim berdasarkan nomor telepon internasional (+62).
  - Sistem mencocokkan nomor tersebut dengan kolom `telepon` / kontak resmi di tabel `kpg_employees`.
  - Jika tidak ditemukan, bot menolak akses fitur internal dan memberikan panduan cara mendaftarkan nomor ke admin kepegawaian.
- **FR-02 (NLU & Entity Extraction dengan Gemini AI Pro)**:
  - Pesan teks percakapan bebas diurai menjadi intent dan payload terstruktur (JSON).
  - Ekstraksi mencakup: `jenis_cuti`, `tanggal_mulai`, `tanggal_selesai`, `alasan_cuti`, `personil_tugas`, `tempat_tujuan`.
- **FR-03 (Pemeriksaan Integritas Kuota Cuti BKSDA)**:
  - Validasi saldo cuti mencukupi.
  - Validasi batas tahun anggaran (tidak boleh lintas tahun kalender sesuai PerBKN 24/2017).
  - Validasi tidak ada bentrok (*overlap*) dengan jadwal cuti atau surat tugas aktif lainnya.
- **FR-04 (Gerbang Konfirmasi Eksplisit - Confirmation Gatekeeper)**:
  - Sebelum data dikirim ke API SuperApp, bot wajib menyajikan ringkasan rincian data dan meminta balasan konfirmasi (misal: *"Ketik 'YA' untuk memproses"*).
  - Jika pengguna membatalkan atau tidak membalas dalam 10 menit, sesi pengajuan dibatalkan otomatis.
- **FR-05 (Webhook Notifikasi Penugasan)**:
  - Menyediakan endpoint webhook lokal yang menerima trigger dari SuperApp saat ST berstatus `DITERBITKAN` atau status Cuti diperbarui (`DISETUJUI` / `DITOLAK`).
  - Mengirim pesan WhatsApp terformat rapi ke masing-masing personil terkait.

### 3.2. Sub-Sistem Coding Agent (Gemini CLI Sandbox)
- **FR-06 (Automated Workspace Git)**:
  - Meng-clone repositori `bksda-superapp` secara terisolasi di VM 108.
  - Membuat branch baru secara otomatis: `feat/nama-fitur` atau `fix/nama-bug`.
- **FR-07 (Eksekusi Gemini CLI & Reasoning)**:
  - Membaca issue / arahan perbaikan melalui Gemini CLI.
  - Menerapkan modifikasi kode pada controller, model, request, atau komponen frontend.
- **FR-08 (Mandatory Self-Testing)**:
  - Menjalankan backend PHPUnit (`php artisan test`).
  - Menjalankan frontend kompilasi (`npm run build`).
  - Menolak pembukaan PR jika terdapat kegagalan uji coba atau kesalahan tipe TypeScript.
- **FR-09 (Otomasi Pull Request GitHub)**:
  - Men-push branch yang telah lolos tes ke remote `origin`.
  - Membuat GitHub Pull Request (PR) otomatis dengan rangkuman perubahan yang terstruktur.

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 4.1. Kinerja & Sumber Daya (Performance & Resources)
- **NFR-01 (Alokasi RAM 16 GB Sesuai Target PC Dev)**:
  - Alokasi RAM 16 GB di Proxmox VM 108 menjamin kelancaran kompilasi Next.js multi-thread (`npm run build`) dan headless browser (Playwright) tanpa swap overhead.
- **NFR-02 (Waktu Respons WhatsApp Bot)**:
  - Respons sapaan dan pengecekan saldo cuti wajib kembali ke pengguna dalam waktu $< 3$ detik.
  - Pemrosesan NLU via Gemini Pro API rata-rata selesai dalam waktu $1.5 – 2.5$ detik.

### 4.2. Keamanan & Anti-Ban (Security & Anti-Banning Strategy)
- **NFR-03 (Human Typing Delay & Anti-Ban)**:
  - Setiap respons WhatsApp dilengkapi simulasi *composing / typing presence* selama $1 – 3$ detik untuk menghindari deteksi spam dari algoritma WhatsApp.
  - Membatasi pengiriman notifikasi massal dengan antrean bertingkat (*throttling queue*, maks 1 pesan per 2 detik per nomor).
- **NFR-04 (Isolasi Jaringan & Least Privilege)**:
  - VM 108 hanya dapat mengakses VM 106 Produksi melalui port HTTPS internal (`443` / `80`) dengan bearer token Sanctum khusus.
  - VM 108 **tidak memiliki izin SSH** atau koneksi langsung ke port PostgreSQL (`5432`/`5435`) di VM 106 Produksi.
- **NFR-05 (Kerahasiaan Kredensial)**:
  - API Key Gemini AI Pro dan GitHub Access Token disimpan pada environment file `.env` terenkripsi dengan izin akses ketat (`chmod 600`).

### 4.3. Skalabilitas & Manajemen Perangkat (Scalability)
- **NFR-06 (Pergantian Nomor Fleksibel)**:
  - Engine WhatsApp mendukung pemutusan sesi lama dan pemindaian ulang QR code nomor baru kapan saja tanpa kehilangan riwayat data di SuperApp.
- **NFR-07 (Kemudahan Resize Proxmox)**:
  - Konfigurasi VM 108 mendukung penambahan RAM (memory hotplug) dan penambahan disk storage (disk resize) langsung dari Web UI Proxmox tanpa perlu instalasi ulang.
