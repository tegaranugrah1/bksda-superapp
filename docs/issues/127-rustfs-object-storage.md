# Issue #127: RustFS Object Storage Setup

## Status: ✅ CLOSED

## Deskripsi

Menambahkan RustFS sebagai object storage S3-compatible untuk menggantikan MinIO (yang sudah tidak aktif dikembangkan). Semua file foto BMN sekarang disimpan di RustFS.

## Setup

```bash
# Start RustFS
docker compose up -d rustfs

# Akses Console
http://localhost:9003
# User: bksda_admin
# Pass: bksda_secret_2025
```

## Ports

| Service | Port | Fungsi |
|---------|------|--------|
| RustFS API | 9002 | S3-compatible endpoint |
| RustFS Console | 9003 | Web management UI |

## Config (.env)

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

## Perubahan Teknis

- `docker-compose.yml` — tambah service `rustfs`
- `composer.json` — tambah `league/flysystem-aws-s3-v3`
- `AssetPhotoController` — refactor dari `Storage::disk('public')` ke default disk (S3)
- `AssetResource` — gunakan `Storage::url()` untuk generate URL dari S3
- Download menggunakan `streamDownload()` (compatible dengan remote storage)

## Catatan

- RustFS berlisensi **Apache 2.0** — fully open source
- S3-compatible — bisa diganti ke Cloudflare R2, AWS S3, dll tanpa ubah kode
- File lama yang sudah ada di `storage/app/public/bmn-photos/` perlu dimigrasikan manual ke RustFS
