# Laporan Progres Integrasi WhatsApp Hermes AI - Modul Surat Tugas

**Tanggal**: 3 November 2026  
**Status**: Selesai & Teruji End-to-End ✅  

---

## 1. Ringkasan Eksekutif

Telah diselesaikan implementasi dan pengujian alur otomatisasi pengelolaan **Surat Tugas (ST)** melalui WhatsApp Hermes AI yang terhubung langsung ke backend Laravel 11 dan database PostgreSQL BKSDA SuperApp.

Alur ini mencakup seluruh siklus hidup surat tugas:
1. **Intake Usulan Natural**: Pemohon dapat mengajukan penugasan dengan bahasa santai / natural tanpa format kaku.
2. **Pencocokan Personil & Fuzzy Search**: Hermes mengenali nama panggilan (seperti *Pak Nuryani*, *Pak Bowo*, *Mba Anna*, *Pak Dayat*, *Resqi*) dan melakukan disambiguasi jika ada nama yang mirip (misal: *Didimus* vs *Didi Susanto*).
3. **Delegasi Pengusulan untuk Rekan Kerja**: Pemohon dapat mengusulkan ST untuk rekan kerja lain tanpa pengusul sendiri ikut bertugas.
4. **Pengecekan Bentrok Jadwal Otomatis**: Memeriksa penugasan aktif dan cuti yang disetujui melalui `AssignmentLetterConflictService`.
5. **Pemilihan Ketua Tim**: Jika personil $\ge 2$ orang, Hermes memastikan siapa yang menjadi Ketua Tim sebelum draf disahkan.
6. **Normalisasi Sumber Dana & PKS Kerjasama**: Otomatis mengenali DIPA, FOLU, DL1, dan mitra kerjasama terdaftar (*KJA, COP, MJA, BOSF, Tjiwi Kimia, CAN, ALeRT*), maupun mitra luar lainnya.
7. **Penerbitan Draf Sementara**: Menyimpan usulan sebagai draf berstatus `draft` dengan nomor sementara `ST.DRAFT/XXXXXXXX`.
8. **Notifikasi Transparan ke Admin**: Mengirim notifikasi WhatsApp ke Admin Tegar berisi rincian penugasan, jenis ST resmi, dan bunyi lengkap diktum **"Untuk :"**.
9. **Penetapan Nomor Resmi & Kode KSA oleh Admin**: Admin dapat langsung membalas WhatsApp (misal: *"Nomor 244 KSA.08.09"* atau *"244 KSA.08.09"*) untuk menerbitkan nomor resmi lengkap `ST.[NOMOR]/K.18/TU/[KLASIFIKASI]/B/[BULAN]/[TAHUN]`, memperbarui status menjadi `approved`, dan mengabari pemohon secara otomatis.

---

## 2. Rincian Teknis Perubahan

### A. Backend Laravel 11 (`HermesSuratTugasCommand.php`)
- **Perintah Artisan**: `php artisan hermes:st {action}`
  - `check-conflict`: Pengecekan bentrok jadwal penugasan dan cuti secara instan.
  - `create-draft`:
    - Auto-detect jenis ST (`luar_wilayah`, `dalam_kawasan`, `kegiatan_1_hari`, `menugaskan_staf`, `jenis_kegiatan`).
    - Format kalimat Title Case bahasa Indonesia resmi.
    - Suffix durasi otomatis:
      - 1 hari: `, selama 1 (satu) hari pada tanggal {tanggal};`
      - Lebih dari 1 hari: `, selama {N} ({terbilang}) hari terhitung mulai tanggal {mulai} sampai dengan {selesai};`
    - Dukungan `--ketua-tim`: Memposisikan ketua tim di urutan #1 dan anggota berikutnya.
    - Dukungan `--sumber-dana` dan `--sumber-dana-other`.
  - `approve-draft`:
    - Mengonversi `ST.DRAFT/...` menjadi nomor resmi `ST.[NOMOR]/K.18/TU/[KLASIFIKASI]/B/[BULAN]/[TAHUN]`.
    - Menyimpan `kode_surat`, `tanggal_surat`, `status = 'approved'`, dan `approved_by`.
    - Memancarkan event `AdminInboxChanged` untuk sinkronisasi antarmuka web SuperApp.
  - `list-employees`: Daftar pegawai aktif BKSDA Kaltim.

### B. Gateway WhatsApp & Web Assistant (`hermes-agent`)
- **Live QR Web Viewer**:
  - Halaman `/qr` dengan pembaruan otomatis per 12 detik.
  - Endpoint `/api/qr-live` untuk polling status koneksi gateway.
- **WhatsApp Adapter Filter**:
  - Menyaring dan membuang (*drop*) pesan log sistem / refleksi internal (*"Self-improvement review"*) agar percakapan WhatsApp pegawai tetap bersih dan ramah.

### C. Konfigurasi Otak Hermes (VM 108)
- `~/.hermes/SOUL.md`: Injeksi instruksi wajib protokol Surat Tugas pada prompt inti.
- `~/.hermes/skills/bksda-superapp-ops/SKILL.md`: Panduan operasional asisten.
- `~/.hermes/memories/security_guardrails.md`: Guardrails keamanan zero-trust dan otentikasi.
- `~/.hermes/memories/MEMORY.md`: Pemetaan panggilan pegawai dan aturan persetujuan draf.

---

## 3. Hasil Pengujian Terverifikasi

1. **Uji Kasus 1: Usulan Mandiri Mbak Anisa (Inventarisasi Pesut Teluk Adang)**
   - Rute: Samarinda ke Kab. Paser (4–8 November 2026).
   - Draf dibuat: `ST.DRAFT/D068BFD0` (dipa).
   - Ditetapkan oleh Admin Tegar: **`ST.244/K.18/TU/KSA.08.09/B/11/2026`** (status `approved`).
   - Notifikasi sukses terkirim ke WhatsApp Tegar & Anisa.

2. **Uji Kasus 2: Usulan untuk Rekan Kerja (Pelatihan Drone Balai KSDA)**
   - Pengusul: Anisa Rahmawati (tidak ikut serta).
   - Personil: Puji Mulyanto (Ketua Tim), Afrizal Maula Alfarisi, Didi Susanto.
   - Sumber dana: `dl1` (1 hari, 5 November 2026).
   - Draf dibuat: `ST.DRAFT/2A749EFA` (jenis ST: *Perjalanan Dinas Luar Wilayah*).
   - Diktum resmi:
     > *Melaksanakan Perjalanan Dinas dari Tenggarong ke Samarinda dalam rangka Mengikuti Pelatihan Drone di Balai KSDA Kalimantan Timur, selama 1 (satu) hari pada tanggal 5 November 2026;*
   - Jadwal bentrok pemohon tidak terpancing karena Anisa tidak ikut serta.

---

## 4. Status Layanan Saat Ini

- **VM 108 Service**: `hermes-gateway.service` aktif (*Active running*).
- **WhatsApp Bridge**: Tersambung normal (*Bridge ready, status: connected*).
- **Reverse SSH Tunnel**: Port `5435` aktif meneruskan koneksi database lokal PostgreSQL ke VM 108.
