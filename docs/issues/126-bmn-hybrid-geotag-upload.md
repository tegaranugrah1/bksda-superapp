# Issue #126: BMN Hybrid Geotag Photo Upload

## Status: ✅ DONE

## Deskripsi

Sebelumnya foto geotag (foto depan/bergeotag) hanya bisa disimpan sebagai link external (Google Drive URL). 
Sekarang endpoint `POST /api/bmn/assets/{asset}/geotag` mendukung **hybrid mode**:

1. **Upload file langsung** — kirim `photo` sebagai multipart form-data, server simpan di `storage/public/bmn-photos/` dan return URL publik.
2. **Paste URL external** — kirim `url` (string), server simpan link tersebut (backward compatible dengan Google Drive).

Ketika salah satu mode digunakan, data mode lainnya otomatis di-clear (mutual exclusive).

## Perubahan

| File | Perubahan |
|------|-----------|
| `Migrations/2026_05_14_100000_add_foto_geotag_path_to_bmn_assets.php` | Tambah kolom `foto_geotag_path` |
| `Models/Asset.php` | Tambah `foto_geotag_path` ke fillable |
| `Controllers/AssetPhotoController.php` | Refactor `updateGeotag()` jadi hybrid (file/URL), update `download()` & `downloadAll()` support local geotag, tambah `delete()` support geotag |
| `Routes/api.php` | Ubah `PUT` → `POST` untuk `/geotag` (file upload butuh POST) |

## API Usage

### Upload file langsung
```bash
curl -X POST /api/bmn/assets/{id}/geotag \
  -H "Authorization: Bearer {token}" \
  -F "photo=@foto_depan.jpg"
```

### Paste URL external  
```bash
curl -X POST /api/bmn/assets/{id}/geotag \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://drive.google.com/file/d/xxx/view"}'
```

### Delete foto geotag
```bash
curl -X DELETE /api/bmn/assets/{id}/photo/geotag \
  -H "Authorization: Bearer {token}"
```

## Catatan

- Route berubah dari `PUT` ke `POST` — ini karena PHP tidak support file upload via PUT dengan multipart/form-data.
- Tidak ada breaking change di frontend bksda-superapp karena belum ada kode yang memanggil endpoint ini.
- Foto geotag yang di-upload langsung ikut masuk ZIP saat download-all.
