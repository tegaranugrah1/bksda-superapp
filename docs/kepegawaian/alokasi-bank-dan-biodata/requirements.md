# Spesifikasi Kebutuhan (Requirements): Alokasi Rekening Bank Modular, Sanitasi Kontak, & Navigasi Pegawai

**Modul**: Kepegawaian & Pengaturan Uang Makan  
**Versi**: 1.0.0  
**Tanggal**: 3 November 2026  
**Status**: Approved & Siap Diuji  

---

## 1. Ringkasan Eksekutif & Latar Belakang

Sistem Informasi Manajemen BKSDA Kalimantan Timur (BKSDA SuperApp) mengelola 152 pegawai aktif yang tersebar di Balai Samarinda, Seksi KSDA Wilayah I Berau, Wilayah II Tenggarong, Wilayah III Balikpapan, dan 14 Resor Konservasi Lapangan.

Sebelum pembaruan ini, modul kepegawaian menghadapi 5 kendala utama:
1. **Opsi Bank Hardcoded**: Bank penyalur uang makan dikunci secara statis pada Bank BRI dan Bank Mandiri. Ketika ada opsi bank lain (misal: BSI, Bankaltimtara, BNI, BCA), sistem tidak memiliki mekanisme pendaftaran mandiri.
2. **Distribusi Rekening Tidak Selaras**: Seluruh 152 pegawai aktif default ke Bank BRI (152 BRI vs 0 Mandiri), padahal data riil nominatif uang makan terbagi menjadi 53 PNS BRI, 39 PNS Mandiri, 4 PPPK Mandiri, dan 17 PPPK BRI.
3. **Polusi Tanda Strip (`-`) pada Kolom Kontak**: Pegawai yang belum menginput nomor WhatsApp atau nomor rekening menyimpan karakter literal `"-"` di database, memaksa user menghapus tanda strip secara manual saat ingin mengisi data kontak baru.
4. **Elemen Visual AI Slop**: Halaman detail profil pegawai memuat strip garis dekoratif gradient multi-warna yang tidak serasi dengan bahasa desain enterprise BKSDA Kaltim.
5. **Ketiadaan Kontrol Halaman pada Tabel Pengaturan**: Tabel alokasi bank di Pengaturan menampilkan seluruh 152 baris sekaligus tanpa pembagian halaman (*pagination*), memberatkan scrolling di perangkat dengan resolusi standar.

Dokumen ini mendefinisikan spesifikasi kebutuhan untuk menyelesaikan kendala di atas secara tuntas, aman, dan mematuhi prinsip senior dev **/ponytail** (*minimal code, zero unnecessary dependencies, rock-solid security*).

---

## 2. Analisis Permasalahan & Akar Penyebab

| No | Gejala / Masalah | Akar Penyebab (Root Cause) | Solusi yang Diterapkan |
| :--- | :--- | :--- | :--- |
| **1** | Bank lain (BSI, Bankaltimtara, dll) tidak dapat dipilih di form pegawai | Tidak ada tabel master opsi bank terdaftar di database; opsi hanya ditulis hardcoded di file JSX | Dibuat tabel `kpg_registered_banks` dan endpoint REST API dinamis |
| **2** | Statistik uang makan menampilkan 152 BRI dan 0 Mandiri | Migrasi awal menyetel default `'BRI'` tanpa eksekusi mapping ke data riil nominatif | Dibuat migrasi data idempotent `2026_11_03_190000` memetakan 113 ASN secara tepat |
| **3** | Input edit nomor WhatsApp terisi karakter `-` yang harus dihapus manual | Form edit mengikat nilai mentah dari database yang tersimpan `"-"` | Sanitasi database menjadi `null` + helper frontend `cleanFieldValue()` |
| **4** | Garis gradient warna-warni di atas foto profil mengganggu estetika | Sisa elemen dekoratif eksperimental (*AI slop*) | Dihapus total, digantikan flat border slate monokrom profesional |
| **5** | Tabel pengaturan alokasi bank memanjang ke bawah tanpa pembagian baris | Tidak ada state pagination di `MealAllowanceHolidaysTab.tsx` | Ditambahkan pagination dinamis dengan pilihan baris 10, 20, 50, dan Semua |

---

## 3. Kebutuhan Fungsional (Functional Requirements)

### FR-1: Manajemen Modular Bank Penyalur Terdaftar (`kpg_registered_banks`)
- **FR-1.1**: Sistem menyediakan tabel `kpg_registered_banks` dengan default awal `BRI` dan `Mandiri`.
- **FR-1.2**: Admin Kepegawaian (`super_admin`, `admin`) dapat mendaftarkan bank baru melalui modal dialog di Pengaturan (`POST /api/kepegawaian/settings/registered-banks`).
- **FR-1.3**: Nama bank baru otomatis dinormalisasi menjadi huruf kapital (UPPERCASE) dan dipangkas spasi (*trimmed*).
- **FR-1.4**: Sistem menolak pendaftaran bank duplikat (case-insensitive).
- **FR-1.5**: Sistem menyediakan tombol hapus bank pada tab *Kelola Opsi Bank*, dengan **validasi pengaman**: jika bank masih digunakan oleh minimal 1 pegawai aktif, proses hapus ditolak dengan peringatan: *"Bank tidak dapat dihapus karena masih digunakan oleh X pegawai aktif."*

### FR-2: Penyelarasan Roster Alokasi Bank Resmi (113 Pegawai)
- **FR-2.1**: Sistem mengalokasikan bank penyalur uang makan secara akurat:
  - 53 PNS dialokasikan ke Bank BRI.
  - 39 PNS dialokasikan ke Bank Mandiri.
  - 4 PPPK dialokasikan ke Bank Mandiri (*A. Aliah Indah Fitriah, Eni Susanti, Mega Wahyu Birinda, Yogi Pratama*).
  - 17 PPPK dialokasikan ke Bank BRI (*Anas Jaya Kurniawan, Achmad Syafey, Boy Eka Sujarwo, Dian Anggraini, Friederich J.H., Giga Piancita, Muh Arsal, Nurviona Shahira, Sukma Mawarni, Wa Ode Fikih Hairunisa, Abdurrahman, Asrina, Rismanto, Suryadi, Taufik Rahman, Wahyuddin, Yonatan*).
- **FR-2.2**: Pegawai non-ASN / mitra konservasi (MMP - Masyarakat Mitra Polhut) default ke BRI tanpa mengganggu kalkulasi uang makan ASN.

### FR-3: Sinkronisasi Dinamis Dropdown Bank Pegawai
- **FR-3.1**: Dropdown pilihan bank pada form edit profil pegawai di `/kepegawaian/employees/[id]` wajib memuat data dinamis dari endpoint `GET /api/kepegawaian/settings/registered-banks`.
- **FR-3.2**: Jika bank baru didaftarkan di Pengaturan, bank tersebut langsung tersedia di dropdown pegawai tanpa perlu restart server atau edit kode frontend.
- **FR-3.3**: Disediakan link pintas `+ Daftarkan bank baru di Pengaturan` di bawah dropdown form edit pegawai.

### FR-4: Sanitasi Kolom Kontak & Rekening Pegawai
- **FR-4.1**: Seluruh data lama bernilai `"-"` pada kolom `telepon`, `nomor_rekening`, dan `email` di database dibersihkan menjadi `null`.
- **FR-4.2**: Pada form edit profil dan modal edit pengaturan, jika data bernilai `null` atau `""`, input form wajib kosong bersih (menampilkan placeholder `Misal: 081234567890`), bukan karakter strip `-`.
- **FR-4.3**: Pada kartu biodata, status belum terisi wajib ditampilkan dengan teks penjelas `Belum diatur` (font abu-abu muted), bukan strip literal.
- **FR-4.4**: Backend request validator wajib mengonversi input string `"-"` menjadi `null` secara otomatis sebelum disimpan ke database.

### FR-5: Kontrol Pembagian Halaman (Pagination) Dinamis
- **FR-5.1**: Tabel alokasi bank di Pengaturan menyediakan selector ukuran halaman (*Page Size*):
  - `10 baris` *(default)*
  - `20 baris`
  - `50 baris`
  - `Semua ({total}) baris`
- **FR-5.2**: Footer tabel menampilkan informasi rentang data: *“Menampilkan {startItem}–{endItem} dari {totalItems} pegawai (Halaman {page} dari {totalPages})”*.
- **FR-5.3**: Navigasi halaman mencakup tombol Halaman Pertama (`<<`), Sebelumnya (`<`), *Page Pills* interaktif (1, 2, 3...) dengan indikator aktif biru, Berikutnya (`>`), dan Terakhir (`>>`).
- **FR-5.4**: Jika filter pencarian atau bank diubah, halaman otomatis tereset ke Halaman 1 (*auto-reset*).

### FR-6: Seleksi Batch Lintas Halaman Cerdas
- **FR-6.1**: Checkbox di header tabel memilih atau membatalkan seluruh pegawai yang berada di halaman aktif saat ini (*select all visible*).
- **FR-6.2**: Ketika sebagian pegawai terpilih, floating batch bar memunculkan tombol `(Pilih Semua {total} Pegawai Terfilter)` agar admin dapat memindahkan seluruh hasil pencarian ke bank lain dalam 1 klik tanpa harus membuka halaman satu per satu.

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

- **NFR-1 (Performa)**:
  - Waktu muat in-memory pagination untuk 152 pegawai adalah < 1 milidetik di sisi browser.
  - Endpoint `registered-banks` merespons dalam < 50 milidetik dengan agregasi hitungan pegawai aktif.
- **NFR-2 (Keamanan & RBAC)**:
  - Seluruh endpoint mutasi (`POST /registered-banks`, `DELETE /registered-banks/{bank}`, `PUT /employee-banks/batch`, `PUT /employees/{id}`) wajib diproteksi middleware otentikasi Sanctum dan otorisasi role minimal `admin` atau `super_admin`. User ber-role `user` diblokir dengan `403 Forbidden`.
  - Input nama bank dibatasi maksimal 50 karakter alfanumerik untuk mencegah *payload injection* / *Cross-Site Scripting (XSS)*.
- **NFR-3 (Desain & UI/UX Enterprise)**:
  - Seluruh komponen mematuhi sistem desain BKSDA Kaltim: flat design, sans-serif typography (Geist), kontras warna WCAG AAA, dan dark-mode compatibility.
  - Zero AI-slop: tidak ada garis gradien dekoratif pelangi atau animasi mengambang yang tidak fungsional.
---

## 5. Kebutuhan Perbaikan Hasil Audit Akar (Root-Cause Remediation Requirements)

Berdasarkan audit jeroan tanggal 3 November 2026, ditambahkan kebutuhan perbaikan tingkat akar untuk menjamin keutuhan data:

### FR-7: Preservasi Data Rekening & Bank pada Aliran Rekonsiliasi Uang Makan
- **FR-7.1**: Fungsi normalisasi data presensi di frontend (`normalizeEmployeeItem`) WAJIB melestarikan properti `nama_bank` dan `nomor_rekening` yang diterima dari API rekonsiliasi.
- **FR-7.2**: Kartu rekapitulasi sheet (`PNS_BRI`, `PNS_MNDRI`, `PPPK_MNDRI`, `PPPK_BRI`) pada halaman `/kepegawaian/uang-makan` wajib merefleksikan alokasi bank aktual pegawai (tidak boleh bernilai 0 untuk Mandiri).
- **FR-7.3**: Payload penyimpanan batch uang makan dan ekspor Excel wajib menyertakan alokasi bank aktual tanpa memberlakukan fallback default ke BRI untuk pegawai Bank Mandiri.

### FR-8: Ketepatan Klasifikasi Roster ASN vs Tenaga Lapangan (MMP)
- **FR-8.1**: Seluruh query dan endpoint kepegawaian wajib menggunakan klasifikasi resmi model `Employee::scopeOfJenis()` atau accessor `$emp->jenis_pegawai`.
- **FR-8.2**: 33 orang personil Masyarakat Mitra Polhut (MMP) dilarang diklasifikasikan sebagai PNS pada modul bank dan perhitungan uang makan.

### FR-9: Akuntabilitas Mutasi Data & Sanitasi Tanda Hubung pada Batch Update
- **FR-9.1**: Setiap mutasi alokasi bank atau kontak melalui endpoint batch (`PUT /api/kepegawaian/settings/employee-banks/batch`) wajib mencatat riwayat perubahan ke tabel `kpg_employee_histories` dengan mencantumkan ID pengguna yang melakukan perubahan.
- **FR-9.2**: Nilai tanda strip literal `"-"` yang dikirimkan pada form batch edit wajib secara otomatis dikonversi menjadi `null`.
- **FR-9.3**: Parameter array `employee_ids` wajib divalidasi keabsahan keberadaannya pada database (`exists:kpg_employees,id`).

### FR-10: Penegakan Otoritas Master Bank (Anti Bank Liar & Stored XSS)
- **FR-10.1**: Endpoint pendaftaran bank baru (`POST /api/kepegawaian/settings/registered-banks`) wajib menolak payload yang memuat tag HTML/script dengan HTTP 422 Unprocessable Content melalui aturan regex alfanumerik (`regex:/^[A-Za-z0-9 .&\-]+$/`).
- **FR-10.2**: Kolom input alokasi bank pegawai pada endpoint batch maupun profil individu wajib divalidasi harus sudah terdaftar pada tabel `kpg_registered_banks`.
- **FR-10.3**: Antarmuka modal edit rekening pegawai dilarang menyediakan input teks bebas (*free-text*), seluruh pilihan bank wajib dipilih dari master bank terdaftar.

### FR-11: Standardisasi Pencarian SQL Anti-Injeksi Wildcard
- **FR-11.1**: Filter pencarian nama atau NIP pegawai wajib meng-escape karakter wildcard SQL (`%` dan `_`) dengan fungsi `addcslashes()`.
- **FR-11.2**: Pencarian wajib bersifat *case-insensitive* di seluruh database engine (menggunakan operator `ilike` pada PostgreSQL).

