# RustFS Object Storage — Panduan BKSDA SuperApp

## Apa itu RustFS?

RustFS adalah object storage (penyimpanan file berbasis objek) yang kompatibel dengan protocol S3.
Fungsinya sama seperti Google Drive atau hard disk server, tapi diakses via API — bukan folder biasa.

Bayangkan seperti ini:
- **Hard disk** = file disimpan di folder `/var/www/storage/`
- **Object storage** = file disimpan di "bucket" dan diakses via URL `http://server:9002/bucket/namafile.jpg`

---

## Konsep Dasar

### Bucket = "Folder Utama"

Bucket itu seperti **partisi** atau **root folder**. Satu bucket menampung banyak file dan subfolder.

```
RustFS Server
└── bksda (BUCKET)          ← satu bucket untuk semua
    ├── bmn-photos/         ← foto aset BMN
    │   ├── router-mikrotik_1_belakang.jpg
    │   ├── laptop-dell_23_geotag.png
    │   └── ...
    ├── cms/                ← file CMS (thumbnail, logo, dll)
    │   ├── a1b2c3d4.jpg
    │   └── ...
    ├── employees/foto/     ← foto profil pegawai
    │   ├── e5f6g7h8.jpg
    │   └── ...
    ├── private/surat_tugas/ ← file PDF Surat Tugas
    │   ├── i9j0k1l2.pdf
    │   └── ...
    └── private/dereporting/ ← lampiran laporan DE
        ├── m3n4o5p6.docx
        └── ...
```

### Setup BKSDA SuperApp: 1 Bucket untuk Semua

Kita pakai **1 bucket** bernama `bksda` — semua modul simpan di situ, dipisahkan oleh **prefix folder**:

| Modul | Folder di dalam bucket | Contoh file |
|-------|----------------------|-------------|
| BMN | `bmn-photos/` | `bmn-photos/router-mikrotik_1_belakang.jpg` |
| CMS | `cms/` | `cms/a1b2c3d4-uuid.jpg` |
| Kepegawaian | `employees/foto/` | `employees/foto/randomhash.jpg` |
| Surat Tugas | `private/surat_tugas/` | `private/surat_tugas/randomhash.pdf` |
| DeReporting | `private/dereporting/internals/` | `private/dereporting/internals/randomhash.pdf` |

> **Kenapa 1 bucket?** Lebih simpel. Di production, kalau mau pisah (misalnya beda permission), bisa buat multiple bucket nanti.

---

## Cara Akses

### 1. Web Console (UI)

```
URL:      http://localhost:9003
Username: bksda_admin
Password: bksda_secret_2025
```

Di console bisa:
- Browse file yang sudah diupload
- Download / delete file manual
- Buat bucket baru
- Set access policy (public/private)

### 2. Via Laravel (kode)

Semua pakai `Storage` facade Laravel — tidak perlu tau ini RustFS atau S3 atau apapun.

```php
// Upload
Storage::put('bmn-photos/test.jpg', $fileContent);

// Get URL publik
$url = Storage::url('bmn-photos/test.jpg');
// → http://localhost:9002/bksda/bmn-photos/test.jpg

// Cek ada atau tidak
Storage::exists('bmn-photos/test.jpg');

// Hapus
Storage::delete('bmn-photos/test.jpg');

// Download stream
return Storage::download('bmn-photos/test.jpg', 'namafile.jpg');
```

### 3. Via Artisan Tinker (quick test)

```bash
cd backend
php artisan tinker

# Test upload
Storage::put('test/hello.txt', 'Halo dari tinker!');

# Cek URL
Storage::url('test/hello.txt');

# Hapus
Storage::delete('test/hello.txt');
```

---

## Cara Kerja Upload di App

Ketika user upload foto (misal foto aset BMN), ini yang terjadi:

```
[User Browser] 
    → POST /api/bmn/assets/123/photo (multipart form)
    → [Laravel Controller]
        → $file->storeAs('bmn-photos', 'nama-aset_1_belakang.jpg')
        → [Laravel S3 Driver]
            → PUT ke RustFS API (http://localhost:9002)
            → File tersimpan di bucket "bksda", path "bmn-photos/nama-aset_1_belakang.jpg"
    → Return URL: http://localhost:9002/bksda/bmn-photos/nama-aset_1_belakang.jpg
```

Frontend tinggal pakai URL tersebut di `<img src="...">`.

---

## Public vs Private

### File Publik (bisa diakses tanpa login)
- Foto aset BMN
- Thumbnail CMS
- Logo, favicon

URL-nya bisa langsung dibuka di browser: `http://localhost:9002/bksda/bmn-photos/foto.jpg`

### File Private (butuh auth)
- File Surat Tugas (PDF)
- Lampiran DeReporting
- Foto profil pegawai

File private didownload lewat Laravel endpoint (yang butuh Sanctum token), bukan langsung dari RustFS.

> **Catatan:** Untuk mengatur public/private, set bucket policy di console RustFS. Default-nya semua public. Di production, buat 2 bucket terpisah (`bksda-public` dan `bksda-private`) untuk keamanan lebih baik.

---

## Config di .env

```env
FILESYSTEM_DISK=s3

AWS_ACCESS_KEY_ID=bksda_admin
AWS_SECRET_ACCESS_KEY=bksda_secret_2025
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=bksda
AWS_ENDPOINT=http://localhost:9002
AWS_USE_PATH_STYLE_ENDPOINT=true
AWS_URL=http://localhost:9002/bksda
```

| Key | Penjelasan |
|-----|-----------|
| `FILESYSTEM_DISK` | Disk yang dipakai Laravel (`s3` = S3-compatible) |
| `AWS_ACCESS_KEY_ID` | Username RustFS |
| `AWS_SECRET_ACCESS_KEY` | Password RustFS |
| `AWS_BUCKET` | Nama bucket |
| `AWS_ENDPOINT` | Alamat API RustFS |
| `AWS_URL` | Base URL untuk generate link publik file |
| `AWS_USE_PATH_STYLE_ENDPOINT` | Harus `true` untuk RustFS/MinIO-style |

---

## Deploy ke Production

Saat deploy, tinggal ganti `.env`:

```env
# Contoh: RustFS di VPS yang sama
AWS_ENDPOINT=http://rustfs:9002        # internal Docker network
AWS_URL=https://storage.bksda.go.id    # public URL via reverse proxy

# Atau pakai Cloudflare R2:
AWS_ENDPOINT=https://xxx.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=r2_key
AWS_SECRET_ACCESS_KEY=r2_secret
AWS_BUCKET=bksda-prod
AWS_URL=https://cdn.bksda.go.id
```

Kode tidak perlu berubah — semua tetap pakai `Storage::put()`, `Storage::url()`, dll.

---

## FAQ

**Q: Kalau Docker mati, file hilang?**  
A: Tidak. File disimpan di Docker volume `rustfs-data` yang persist di disk.

**Q: Bisa backup?**  
A: Ya. Backup Docker volume, atau gunakan `mc mirror` (MinIO Client) untuk sync ke tempat lain.

**Q: Beda bucket per modul bisa?**  
A: Bisa. Tambah disk baru di `config/filesystems.php` dengan bucket berbeda. Tapi untuk skala BKSDA, 1 bucket cukup.

**Q: Kapan harus pisah bucket?**  
A: Kalau mau beda access policy (misal: CMS publik, Surat Tugas private), atau beda retention/lifecycle.
