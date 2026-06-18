# Mobile API Readiness Plan

Tanggal: 18 Juni 2026

## Nilai Rencana

Nilai target rencana ini: **9.2/10**.

Alasan nilainya di atas 9:

- Prioritas disusun dari fondasi backend dulu, bukan langsung UI mobile.
- Setiap item punya dampak, acceptance criteria, dan urutan eksekusi.
- Web tetap aman karena perubahan difokuskan ke API contract, permission, pagination, dan response shape.
- Mobile app bisa dibuat lebih ringan karena endpoint list, dashboard, upload, dan download disiapkan sejak awal.
- Risiko auth, permission, dan data besar ditangani sebelum mobile masuk fase implementasi.

Yang membuatnya belum 10/10:

- Detail final auth mobile masih harus divalidasi langsung dari implementasi auth saat ini.
- Beberapa endpoint perlu audit kode backend sebelum dipastikan cukup atau perlu endpoint mobile baru.
- Estimasi effort final baru bisa dibuat setelah mapping endpoint selesai.

## Tujuan

Membuat backend/API BKSDA SuperApp siap dipakai oleh mobile app Android terlebih dahulu, dengan iOS disiapkan kemudian, tanpa merusak web yang sudah berjalan.

Mobile app akan dipakai oleh semua role yang ada saat ini. Semua akses fitur tetap mengikuti role, module access, dan permission backend yang sudah berlaku.

## Prinsip Utama

1. Backend tetap menjadi sumber kebenaran untuk auth, role, permission, validasi, dan data.
2. Mobile app tidak boleh hanya mengandalkan hidden button di UI untuk keamanan.
3. API list harus ringan, paginated, dan konsisten.
4. API detail boleh lengkap, tapi tetap tidak mengirim data yang tidak dibutuhkan user.
5. Mobile app online-only untuk MVP.
6. Generator dokumen BMN berat, seperti BA Pemakaian, BA Serah Terima, dan Lelang, tidak masuk mobile MVP.
7. Endpoint mobile khusus boleh dibuat jika endpoint web terlalu berat atau terlalu table-oriented.

## Prioritas Perbaikan

### P0 - Wajib Sebelum Mobile Coding

#### 1. Standarisasi Response API

Masalah:

Endpoint saat ini kemungkinan punya bentuk response berbeda-beda. Mobile akan sulit membuat state loading, error handling, pagination, dan retry jika format tidak konsisten.

Target:

Semua endpoint baru atau endpoint yang dipakai mobile mengikuti bentuk standar:

```json
{
  "data": {},
  "meta": {},
  "message": null
}
```

Untuk error:

```json
{
  "message": "Validasi gagal.",
  "errors": {}
}
```

Acceptance criteria:

- Endpoint list mengembalikan `data` dan `meta`.
- Endpoint detail mengembalikan `data`.
- Error validasi selalu memakai `message` dan `errors`.
- Error unauthorized tetap HTTP 401.
- Error forbidden tetap HTTP 403.
- Error not found tetap HTTP 404.

#### 2. Pagination Konsisten untuk Semua List Besar

Masalah:

Mobile tidak boleh memuat ribuan aset, pegawai, surat tugas, atau riwayat dalam satu request.

Target:

Semua endpoint list besar mendukung:

- `page`
- `per_page`
- `search`
- `sort`
- filter sesuai konteks

Meta minimal:

```json
{
  "current_page": 1,
  "per_page": 20,
  "total": 120,
  "last_page": 6
}
```

Endpoint prioritas:

- `GET /api/bmn/assets`
- `GET /api/bmn/loans`
- `GET /api/bmn/maintenances`
- `GET /api/kepegawaian/employees`
- `GET /api/surat-tugas`
- endpoint approval/pending jika ada

Acceptance criteria:

- Default `per_page` aman untuk mobile, misalnya 20.
- Maksimum `per_page` dibatasi backend.
- Search dan filter tidak mematikan pagination.
- Web tetap berjalan dengan pagination yang sama.

#### 3. Endpoint Profil dan Permission Mobile

Masalah:

Mobile perlu tahu user, pegawai terkait, role, module access, dan kemampuan aksi tanpa banyak request.

Target:

Perlu endpoint yang siap dipakai mobile, bisa memperluas `/api/user` atau membuat:

```text
GET /api/me
```

Response minimal:

- user id
- nama user
- employee id
- nama pegawai
- NIP
- jabatan
- unit kerja
- role
- access modules
- permissions/actions
- avatar/photo

Acceptance criteria:

- Mobile bisa menentukan tab/menu berdasarkan response ini.
- Backend tetap mengecek permission setiap aksi.
- Jika user tidak terhubung ke pegawai, response tetap aman dan jelas.

#### 4. Audit Auth Mobile

Masalah:

Mobile harus mengikuti auth sekarang, tetapi storage dan session mobile berbeda dari browser.

Target:

Pastikan auth saat ini bisa dipakai aman di mobile.

Hal yang harus dicek:

- apakah login mengembalikan token atau bergantung ke cookie
- apakah token/session bisa disimpan di secure storage mobile
- bagaimana logout/revoke bekerja
- bagaimana expired session ditangani
- apakah rate limit login aktif

Acceptance criteria:

- Mobile bisa login, restore session, dan logout dengan aman.
- Token/session tidak disimpan di storage biasa.
- 401 otomatis menghapus sesi lokal mobile.
- Backend punya mekanisme revoke/logout.

#### 5. Permission Backend untuk Semua Aksi Mobile

Masalah:

Mobile akan dipakai semua role. Tidak cukup hanya menyembunyikan tombol di app.

Target:

Semua aksi yang akan dipakai mobile harus dicek di backend.

Aksi prioritas:

- lihat aset
- tambah aset
- edit aset
- hapus/dispose aset
- upload foto aset
- hapus foto aset
- verifikasi aset
- pinjam/serahkan aset
- kembalikan aset
- lihat surat tugas
- buat surat tugas
- approve/reject surat tugas
- lihat data pegawai sesuai role

Acceptance criteria:

- User tanpa permission mendapat HTTP 403.
- Mobile menerima pesan error yang bisa ditampilkan jelas.
- Permission tidak hanya bergantung pada frontend.

### P1 - Penting untuk MVP Mobile yang Enak Dipakai

#### 6. Endpoint Dashboard Mobile

Masalah:

Jika mobile home harus memanggil banyak endpoint, loading akan lambat dan rawan gagal.

Target:

Buat endpoint ringkas:

```text
GET /api/mobile/dashboard
```

Isi sesuai role:

- profil singkat
- jumlah aset terkait user
- jumlah pinjaman aktif
- jumlah surat tugas aktif/pending
- jumlah approval pending jika role terkait
- kendaraan dengan pajak dekat jatuh tempo jika relevan
- notifikasi ringkas

Acceptance criteria:

- Satu request cukup untuk home screen.
- Response tidak mengirim list besar.
- Data disesuaikan dengan role.

#### 7. Endpoint List Aset Ringan

Masalah:

Data aset punya banyak kolom. List mobile tidak perlu semua field.

Target:

Endpoint list aset mengirim field ringkas:

- id
- kode barang
- nup
- nama barang
- merk/tipe
- kondisi
- lokasi ringkas
- pengguna
- no polisi jika kendaraan
- thumbnail foto jika ada
- status verifikasi

Detail lengkap hanya dikirim di endpoint detail.

Acceptance criteria:

- List aset mobile ringan dan cepat.
- Detail aset tetap lengkap saat dibuka.
- Search aset mendukung nama, kode, NUP, no polisi, lokasi, pengguna, dan kondisi.

#### 8. Upload Foto BMN Mobile-Friendly

Masalah:

Upload foto dari kamera mobile perlu endpoint yang stabil, batas ukuran jelas, dan response yang langsung bisa memperbarui UI.

Target:

Endpoint foto menerima:

- file image
- slot foto
- latitude
- longitude
- catatan/lokasi barang jika ada

Slot foto:

- foto_geotag
- tampak_depan
- tampak_belakang
- tampak_kiri
- tampak_kanan
- lokasi_barang jika masih dipakai sebagai slot terpisah

Acceptance criteria:

- Validasi file type dan size jelas.
- Response mengembalikan URL foto terbaru.
- Upload gagal mengembalikan error yang bisa dibaca user.
- Hapus foto tetap dicek permission.

#### 9. Download PDF dan File yang Nyaman untuk Mobile

Masalah:

Mobile butuh URL download yang authenticated dan stabil, bukan bergantung pada URL frontend.

Target:

Endpoint download langsung dari API:

- surat tugas PDF
- dokumen pendukung jika ada
- foto/dokumen aset jika diperlukan

Acceptance criteria:

- File bisa diunduh dari mobile dengan token/session auth.
- Backend tetap mengecek permission.
- Nama file jelas.
- Response memakai content type yang benar.

#### 10. Error Message Konsisten

Masalah:

Mobile UX buruk jika error backend terlalu teknis atau berbeda-beda.

Target:

Semua error yang akan tampil di mobile punya pesan singkat dan jelas.

Contoh:

- "Akses ditolak untuk fitur ini."
- "Data tidak ditemukan."
- "File terlalu besar. Maksimal 10 MB."
- "Sesi berakhir. Silakan login kembali."

Acceptance criteria:

- Error teknis tidak bocor ke user.
- Mobile bisa menampilkan `message` langsung.
- Validation error tetap detail per field.

### P2 - Setelah MVP Stabil

#### 11. Endpoint Notification Feed

Target:

```text
GET /api/notifications
```

Untuk mobile MVP, ini bisa ditunda jika push notification belum dibuat.

#### 12. Device Registration untuk Push Notification

Target:

```text
POST /api/mobile/devices
DELETE /api/mobile/devices/{id}
```

Digunakan untuk Expo push token atau FCM token.

#### 13. Audit Log untuk Aksi Mobile

Target:

Catat aksi penting dari mobile:

- login
- upload foto
- verifikasi aset
- edit aset
- approve/reject surat tugas

## Endpoint yang Perlu Dimapping

Tahap berikutnya sebelum coding mobile adalah membuat mapping endpoint aktual:

| Modul | Endpoint Sekarang | Status Mobile | Catatan |
| --- | --- | --- | --- |
| Auth | `POST /api/login` | Perlu audit | Pastikan token/session cocok untuk mobile |
| Auth | `GET /api/user` | Perlu diperluas | Perlu role, employee, permissions |
| BMN Aset | `GET /api/bmn/assets` | Perlu audit | Pastikan ringan dan paginated |
| BMN Aset | `GET /api/bmn/assets/{id}` | Perlu audit | Detail lengkap |
| BMN Foto | `/api/bmn/assets/{id}/photo...` | Perlu audit | Stabilkan format upload mobile |
| BMN Pinjam | `/api/bmn/loans...` | Perlu audit | Sesuaikan role |
| Pegawai | `/api/kepegawaian/employees...` | Perlu audit | Mobile butuh select dan search |
| Surat Tugas | `/api/surat-tugas...` | Perlu audit | Semua flow sesuai role |
| Dashboard | Belum pasti | Kemungkinan perlu baru | `GET /api/mobile/dashboard` |

## Urutan Eksekusi yang Disarankan

### Issue 1 - API Contract Baseline

Scope:

- Dokumentasikan response standar.
- Rapikan helper/resource jika perlu.
- Pastikan error format konsisten untuk endpoint mobile prioritas.

Target nilai dampak: tinggi.

### Issue 2 - Auth dan Me Endpoint

Scope:

- Audit login sekarang.
- Pastikan mobile bisa menyimpan sesi aman.
- Perluas `/api/user` atau buat `/api/me`.

Target nilai dampak: sangat tinggi.

### Issue 3 - Pagination dan Lightweight Lists

Scope:

- Standardisasi pagination untuk aset, pegawai, surat tugas, loans.
- Batasi `per_page`.
- Pisahkan field list dan detail jika perlu.

Target nilai dampak: sangat tinggi.

### Issue 4 - Mobile Dashboard Endpoint

Scope:

- Buat endpoint dashboard ringkas sesuai role.
- Satu request untuk home mobile.

Target nilai dampak: tinggi.

### Issue 5 - Mobile Upload dan Download

Scope:

- Stabilkan upload foto BMN.
- Stabilkan download PDF/file.
- Pastikan permission dan error message.

Target nilai dampak: tinggi.

### Issue 6 - Permission Audit

Scope:

- Cek semua aksi mobile.
- Pastikan backend menolak aksi tanpa permission.
- Tambahkan test untuk endpoint kritikal.

Target nilai dampak: sangat tinggi.

## Risiko Jika Tidak Dikerjakan

- Mobile app terasa lambat karena response terlalu besar.
- Mobile sulit menampilkan error yang manusiawi.
- Role bisa bocor jika permission hanya disaring di UI.
- Upload foto dari kamera mobile sering gagal.
- PDF/download tidak nyaman dibuka dari mobile.
- Dashboard mobile butuh banyak request dan terasa lambat.

## Definition of Ready untuk Mulai Mobile App

Mobile app layak mulai coding setelah kondisi berikut terpenuhi:

- Auth mobile sudah jelas dan tervalidasi.
- Endpoint profil/permission siap.
- Endpoint list utama sudah paginated.
- Endpoint BMN asset list ringan.
- Upload foto punya format stabil.
- Download file/PDF aman dan jelas.
- Error response konsisten.
- Permission backend untuk aksi utama sudah diaudit.

## Kesimpulan

Rencana ini layak dijadikan fondasi sebelum membuat mobile app. Fokusnya bukan merombak web, tetapi membuat API yang dipakai web dan mobile lebih konsisten, aman, ringan, dan mudah dipakai.

Nilai realistis rencana: **9.2/10**.

Jika setelah endpoint mapping selesai semua kebutuhan API sudah jelas, rencana ini bisa naik menjadi **9.5/10** karena risiko implementasi mobile akan jauh lebih kecil.
