# Issue #570 — Design: Manajemen Template Surat Tugas

> **Branch**: `development`
> **Issue**: #570
> **Status**: Draft untuk review

## 1. Prinsip Desain

1. **Single source of truth**: template aktif berasal dari database, bukan daftar terpisah di banyak file frontend.
2. **Master vs draft**: template master hanya dapat diubah superadmin; form Surat Tugas bekerja pada salinan template.
3. **Snapshot dokumen**: dokumen tersimpan tidak bergantung pada perubahan template di masa depan.
4. **Backend-enforced authorization**: frontend tidak dijadikan lapisan keamanan.
5. **System template aman**: template bawaan tidak dihapus destruktif.
6. **Perubahan dapat diaudit**: aksi sensitif dicatat.

## 2. Model Data

### 2.1 `st_templates`

Kolom yang diusulkan:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint | Primary key |
| `name` | varchar | Nama tampilan |
| `code` | varchar unique | Identitas stabil, misalnya `default` atau `bmn-penghapusan` |
| `description` | text nullable | Penjelasan template |
| `type` | varchar | `standard`, `bmn`, `beda_hari`, `plh`, `custom` |
| `menimbang` | json nullable | Array item `{id,text}` |
| `dasar` | json nullable | Array item `{id,text}` |
| `default_signer_employee_id` | bigint nullable | Relasi ke `kpg_employees` |
| `default_signer_name` | varchar nullable | Snapshot penandatangan |
| `default_signer_nip` | varchar nullable | Snapshot NIP |
| `configuration` | json nullable | Konfigurasi tambahan template |
| `is_system` | boolean | Template bawaan atau custom |
| `is_active` | boolean | Tersedia untuk penggunaan baru |
| `is_default` | boolean | Default aktif |
| `created_by` | bigint nullable | User pembuat |
| `updated_by` | bigint nullable | User terakhir mengubah |
| timestamps | - | Waktu pembuatan/perubahan |
| `deleted_at` | timestamp nullable | Soft delete bila diperlukan |

Kolom penting dan sering difilter tetap berupa kolom biasa. `configuration` hanya digunakan untuk pengaturan tambahan yang tidak membutuhkan query rutin.

Contoh `configuration`:

```json
{
  "klasifikasi": "KSA.05",
  "sumber_dana": "dipa",
  "kota_surat": "Samarinda",
  "tembusan": [],
  "activity_prefix": "Melaksanakan Perjalanan Dinas"
}
```

### 2.2 Versi Template

Untuk tahap awal, snapshot template disimpan pada Surat Tugas. Jika kebutuhan histori meningkat, tambahkan tabel:

```text
st_template_versions
- id
- st_template_id
- version
- snapshot
- changed_by
- created_at
```

Template yang disimpan pada Surat Tugas wajib memiliki snapshot agar perubahan template master tidak memengaruhi dokumen lama.

### 2.3 Snapshot pada Surat Tugas

Tambahkan field atau struktur JSON yang menyimpan:

```json
{
  "template_id": 12,
  "template_code": "bmn-penghapusan",
  "template_name": "Penghapusan BMN",
  "template_version": 3,
  "menimbang": [],
  "dasar": [],
  "signer": {
    "employee_id": 21,
    "name": "M. ARI WIBAWANTO, S.Hut., M.Sc.",
    "nip": "19740514 199903 1 001"
  },
  "configuration": {}
}
```

## 3. Backend Architecture

### 3.1 Route dan Otorisasi

Gunakan route group terautentikasi. Operasi mutasi diarahkan ke middleware/policy/permission superadmin, bukan hanya pengecekan string role di setiap method controller.

```text
GET    /api/kepegawaian/st-templates
GET    /api/kepegawaian/st-templates/{id}
POST   /api/kepegawaian/st-templates
PUT    /api/kepegawaian/st-templates/{id}
DELETE /api/kepegawaian/st-templates/{id}
POST   /api/kepegawaian/st-templates/{id}/set-default
PATCH  /api/kepegawaian/st-templates/{id}/toggle-active
POST   /api/kepegawaian/st-templates/{id}/duplicate
```

Aturan akses:

- `GET`: user terautentikasi; default hanya template aktif.
- Mutasi: superadmin/permission template management.
- Superadmin dapat meminta `include_inactive=true`.

### 3.2 Layer Backend

Struktur yang disarankan:

```text
Kepegawaian/
├── Controllers/StTemplateController.php
├── Requests/StoreStTemplateRequest.php
├── Requests/UpdateStTemplateRequest.php
├── Policies/StTemplatePolicy.php
├── Services/StTemplateService.php
├── Resources/StTemplateResource.php
└── Models/StTemplate.php
```

`StTemplateService` menangani:

- Membuat/mengubah template
- Menentukan template default secara atomic
- Toggle active
- Duplikasi
- Snapshot penandatangan
- Validasi aturan bisnis
- Audit event

### 3.3 Aturan Bisnis Database

- `code` unik.
- Template sistem tidak boleh hard delete.
- Template yang telah dipakai tidak boleh dihapus destruktif.
- Penetapan default memakai transaction.
- Hanya satu template aktif yang boleh menjadi default.
- Template default wajib aktif.
- Pegawai penandatangan harus valid dan sesuai aturan pegawai aktif.

## 4. Frontend Architecture

### 4.1 Halaman Superadmin

Lokasi yang sudah ada:

```text
frontend/src/app/kepegawaian/settings/st-templates/page.tsx
```

Komponen/panel yang diperlukan:

1. `TemplateList`
2. `TemplateForm`
3. `TemplateItemsEditor`
4. `TemplateSignerPicker`
5. `TemplateStatusActions`
6. `TemplatePreview`

Form dibagi menjadi:

- Informasi template
- Default Menimbang
- Default Dasar
- Penandatangan default
- Pengaturan tambahan
- Preview

### 4.2 Halaman Create

Lokasi:

```text
frontend/src/app/kepegawaian/surat-tugas/create/page.tsx
```

Saat template dipilih:

1. Ambil template dari query/API cache.
2. Salin Menimbang ke state form.
3. Salin Dasar ke state form.
4. Salin penandatangan default ke state form.
5. Terapkan konfigurasi khusus sesuai `type`.
6. Jangan mengubah object master secara langsung.

Jika form sudah berisi data, tampilkan konfirmasi sebelum mengganti template.

## 5. Migrasi Template Bawaan

Buat `StTemplateSeeder` untuk template:

- Default
- Penghapusan BMN
- Beda Hari
- PLH

Setiap template memiliki `code` stabil dan `is_system = true`. Perilaku khusus Beda Hari/PLH tetap menggunakan `type` dan konfigurasi, bukan menebak berdasarkan nama template.

## 6. API Payload

### Create/update template

```json
{
  "name": "Perjalanan Dinas Biasa",
  "code": "perjalanan-dinas-biasa",
  "description": "Template perjalanan dinas standar",
  "type": "custom",
  "menimbang": [
    { "id": "m1", "text": "bahwa ...;" }
  ],
  "dasar": [
    { "id": "d1", "text": "Peraturan ...;" }
  ],
  "default_signer_employee_id": 21,
  "configuration": {
    "klasifikasi": "KSA.01.01",
    "sumber_dana": "dipa"
  },
  "is_active": true
}
```

### Response

Gunakan API Resource agar format response konsisten dan tidak mengekspos field internal yang tidak diperlukan.

## 7. Error Handling

- `401`: belum login.
- `403`: tidak memiliki hak mengelola template.
- `404`: template tidak ditemukan.
- `409`: konflik kode/default/version.
- `422`: payload tidak valid.
- `500`: pesan umum untuk user; detail hanya di server log.

## 8. Audit dan Keamanan

- Validasi dilakukan di Form Request.
- Tidak menerima HTML mentah tanpa sanitasi jika nantinya template mendukung rich text.
- Tidak menyimpan password/token pada log.
- Mutasi memakai CSRF/session mechanism yang sudah digunakan aplikasi.
- Audit log mencatat actor, action, resource, before, after, dan timestamp.
- Semua operasi penting diuji untuk guest, user, admin, dan superadmin.

## 9. Keputusan yang Perlu Direview

1. Apakah template bawaan boleh diedit langsung atau harus dibuat override oleh superadmin?
2. Apakah satu template default berlaku global atau berbeda per modul/unit kerja?
3. Apakah versioning template dibuat pada tahap pertama atau setelah fitur dasar stabil?
4. Apakah admin boleh memiliki permission khusus untuk mengelola template tanpa menjadi superadmin?
5. Apakah snapshot Surat Tugas disimpan dalam kolom JSON baru atau memakai beberapa kolom terstruktur?
