# Requirements — Issue #580: Perbaikan Pagination Endpoint Surat Masuk & Sinkronisasi Arsip

> **Issue**: #580
> **Tipe**: Bug Fix & Data Consistency
> **Modul**: Persuratan (`backend/app/Modules/Surat` & `frontend/src/app/surat`)

---

## 1. Masalah & Latar Belakang

Ketika akun pengguna baru (misalnya akun *Tegar Anugrah*) yang telah diberikan hak akses modul surat login dan membuka halaman daftar surat masuk di `http://localhost:3000/surat/masuk`, daftar surat masuk hanya menampilkan 1 data paling atas (terbaru). Data-data lama yang sebelumnya telah diinput tidak muncul di daftar tabel.

### Analisis Penyebab (Root Cause):
1. **Type-Casting Query Parameter `per_page=all`**:
   - Frontend memanggil `api.get('/api/surat-masuk?per_page=all')`.
   - Pada `SuratMasukController.php` (dan `SuratKeluarController.php`), parameter dievaluasi menggunakan `(int) $request->input('per_page', 10)`.
   - String `"all"` di-cast integer menjadi `0`.
   - Logika `min(max(1, 0), 100)` menghasilkan nilai `1`.
   - Akibatnya, backend mengeksekusi `$query->paginate(1)` dan hanya mengembalikan 1 data (record terbaru).
2. **Ketergantungan pada `localStorage`**:
   - Akun pembuat surat awal (misal Super Admin) masih melihat data lama karena browser menyimpannya di cache `localStorage` (`bksda_saved_surat_masuk`).
   - Akun/browser baru tidak memiliki cache tersebut sehingga hanya bergantung pada API backend yang salah membatasi data menjadi 1 baris.

---

## 2. Kebutuhan Fungsional (Requirements)

1. **Dukungan `per_page=all` di Backend**:
   - Jika query parameter `per_page=all` dikirim, controller wajib mengembalikan seluruh data tanpa pagination (`$query->get()`) beserta format respons metadata yang konsisten.
   - Jika query parameter `per_page` berupa angka (misal `10`, `20`, `50`, `100`), controller melakukan pagination sesuai angka tersebut.
2. **Konsistensi Endpoint Surat Keluar**:
   - Menerapkan penanganan `per_page=all` yang sama pada `SuratKeluarController.php` untuk mencegah bug serupa.
3. **Database sebagai *Single Source of Truth* di Frontend**:
   - Menghapus ketergantungan merge paksa dari `localStorage` yang berpotensi menyebabkan ketidaksinkronan data antar-pengguna.
   - Menyimpan dan menampilkan data langsung dari backend API ke tabel daftar surat masuk.
4. **Hak Akses Modul Surat**:
   - Setiap pengguna yang memiliki hak akses modul `surat` di `access_modules` (termasuk Super Admin, Admin, dan Pegawai umum seperti Tegar Anugrah) harus dapat melihat seluruh daftar arsip surat masuk dan surat keluar yang tersimpan di database.
