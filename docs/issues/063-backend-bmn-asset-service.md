# Issue #063 — Backend — AssetService (Otak Jantung Aset BMN)

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `module-bmn`
> **Priority**: 🔴 Critical (Inti Logika Manipulasi dan Audit Barang Milik Negara)
> **Complexity**: 🔴 High (Pelacakan Perubahan Data secara Otomatis dan Transaksi Atomik)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #061, Issue #062

---

## Branch

```
issue/063-backend-bmn-asset-service
```

## Deskripsi

Sama halnya dengan Modul Logistik (Fase 4), Modul BMN ini mengusung prinsip **Clean Architecture**. *Controller* sifatnya "Bodoh"; dia tidak boleh tahu bagaimana cara memproses perhitungan harga atau menyimpan jejak audit. Seluruh beban intelegensia itu diserahkan kepada **AssetService**.

Pada **Issue #063** ini, kita akan merakit otak utama pencatatan aset negara: `AssetService.php`.

Fitur unggulan tingkat dewa yang kita bangun di dalam `AssetService`:
1. **DB Transaction**: Mewajibkan manipulasi aset (Pencatatan Baru/Ubah/Hapus) menjadi satu paket. Jika salah satu gagal *(Error)*, seluruh aksi batal *(Rollback)*.
2. **Auto-Intelijen Audit (Spy Mechanism)**: Jika ada Admin yang mengganti harga beli aset (`nilai_perolehan`), *AssetService* secara cerdas akan langsung mendeteksinya! Ia membandingkan Harga Lama dengan Harga Baru, lalu seketika itu juga menyimpan buktinya ke tabel `bmn_asset_updates` *(Issue 060)*. Tidak ada koruptor yang bisa lolos dari sini!
3. **Fungsi Pemutihan (Disposal)**: Aset negara BMN tidak boleh dihapus secara kasar (`DELETE`). Ia harus diistirahatkan menggunakan prosedur `SoftDeletes` dan ditandai sebagai aset yang dilelang/dimusnahkan.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/Bmn/Services`.
- [ ] File `AssetService.php` memuat fungsi canggih `storeAsset()` untuk pendaftaran BMN baru.
- [ ] File tersebut memuat fungsi `updateAsset()` yang dikawal oleh algoritma Pelacakan Audit Keuangan *(Intelijen).*
- [ ] Tersedia fungsi `disposeAsset()` yang secara santun mengeksekusi `SoftDeletes` pada aset yang tak lagi digunakan.

---

## Panduan Implementasi Cerdas

Buatlah wadah pangkalan otaknya:
```bash
mkdir -p backend/app/Modules/Bmn/Services
```

**Path:** `backend/app/Modules/Bmn/Services/AssetService.php`

Salin dan pahatlah algoritma perlindungan aset negara ini secara saksama:

```php
<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetUpdate;
use Illuminate\Support\Facades\DB;
use Exception;

class AssetService
{
    /**
     * FUNGSI 1: PENDAFTARAN ASET BARU (STORE)
     */
    public function storeAsset(array $data)
    {
        return DB::transaction(function () use ($data) {
            // Karena validasi input akan dilakukan di FormRequest (Issue berikutnya),
            // Service ini cukup langsung menancapkan data ke Database.
            $asset = Asset::create($data);
            return $asset;
        });
    }

    /**
     * FUNGSI 2: PERUBAHAN ASET + INTELIJEN AUDIT (UPDATE)
     * Ini adalah algoritma terpenting di fase ini!
     */
    public function updateAsset(string $assetId, array $data, string $userId)
    {
        return DB::transaction(function () use ($assetId, $data, $userId) {
            // Kunci Baris Tabel (Pessimistic Locking)
            $asset = Asset::lockForUpdate()->findOrFail($assetId);
            
            // --- DETEKTOR KORUPSI / PENYUSUTAN (AUDIT TRAIL) ---
            // Cek apakah 'nilai_perolehan' dikirimkan dan apakah nilainya berbeda dengan Database?
            if (isset($data['nilai_perolehan'])) {
                $oldNilai = (float) $asset->nilai_perolehan;
                $newNilai = (float) $data['nilai_perolehan'];

                if ($oldNilai !== $newNilai) {
                    // TEREKAM! Simpan dosa/revisi ini ke buku besar Intelijen
                    AssetUpdate::create([
                        'asset_id' => $asset->id,
                        'user_id' => $userId, // Siapa yang menggantinya
                        'field_changed' => 'nilai_perolehan',
                        'old_value' => (string) $oldNilai,
                        'new_value' => (string) $newNilai,
                        'alasan_perubahan' => $data['keterangan_audit'] ?? 'Penyusutan Tahunan atau Revisi Nilai'
                    ]);
                }
            }
            
            // Cek apakah 'kondisi' barang dirubah?
            if (isset($data['kondisi']) && $asset->kondisi !== $data['kondisi']) {
                AssetUpdate::create([
                    'asset_id' => $asset->id,
                    'user_id' => $userId,
                    'field_changed' => 'kondisi',
                    'old_value' => $asset->kondisi,
                    'new_value' => $data['kondisi'],
                    'alasan_perubahan' => 'Pembaruan kondisi fisik aset'
                ]);
            }
            // ----------------------------------------------------

            // Setelah pengawasan selesai, perbarui data fisiknya
            $asset->update($data);
            
            return $asset;
        });
    }

    /**
     * FUNGSI 3: PEMUTIHAN ASET / PENGHAPUSAN (DISPOSAL)
     * Menggunakan SoftDeletes agar BPK tetap bisa melacaknya.
     */
    public function disposeAsset(string $assetId, string $userId, string $alasan)
    {
        return DB::transaction(function () use ($assetId, $userId, $alasan) {
            $asset = Asset::findOrFail($assetId);

            // 1. Catat penghapusan ini sebagai momen pamungkas di tabel Audit
            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => $userId,
                'field_changed' => 'STATUS_ASET',
                'old_value' => 'Aktif',
                'new_value' => 'Dihapus/Pemutihan',
                'alasan_perubahan' => $alasan
            ]);

            // 2. Eksekusi eksekusi gaib (SoftDeletes)
            $asset->delete();
            
            return true;
        });
    }
}
```

---

## Troubleshooting

### Q: Tombol Pengeditan (*Update*) terus mengatakan `Target class [AssetUpdate] not found`!

**Artinya:** Kelas *AssetUpdate* (Tabel Mata-Mata) gagal ditemukan.
**Solusi:** Pastikan di paling atas *file* `AssetService.php` kamu telah menanamkan balok impor yang tepat: `use App\Modules\Bmn\Models\AssetUpdate;`. Sangat sering kecerdasan buatan (*AI Copilot/Autocomplete*) melupakan deklarasi Model kedua ini.

### Q: Kenapa repot-repot membandingkan angka menggunakan `(float) $oldNilai !== (float) $newNilai`?

**Artinya:** Pertahanan Kekacauan Desimal *(Decimal Casting Protection)*.
**Solusi:** Di PostgreSQL, nilai `150000.00` berbentuk *string*, sedangkan *Frontend* bisa jadi mengirim angka murni `150000` (integer/float). Jika kita menggunakan komparator tipe ketat biasa (`!==`), PHP akan menganggap `"150000.00"` dan `150000` adalah hal yang berbeda, dan ia akan menyuntikkan Audit Jejak Palsu (mengira nilainya diubah padahal tidak). Pemaksaan ke wujud `(float)` menyatukan mereka secara absolut di mata mesin.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): encapsulate core national asset manipulation logic with automated spy mechanisms" \
  --body "Mengemas sistem intelegensia (Service Layer) yang menangani atomisitas aliran pendataan Barang Milik Negara. Melibatkan instalasi detektor perubahan (Pessimistic Anti-Fraud Mechanism) demi mematuhi regulasi BPK. Detail di docs/issues/063-backend-bmn-asset-service.md" \
  --label "backend,architecture,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/063-backend-bmn-asset-service
```

### Step 3: Kerjakan

Tuangkan blok kode super-intelijen di atas ke alamat target `backend/app/Modules/Bmn/Services/AssetService.php`. Baris kodingan `lockForUpdate()` sangat krusial, jangan sampai terhapus tanpa sengaja oleh kebiasaan memformat *Prettier* yang salah.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(bmn): encapsulate core national asset manipulation logic with automated spy mechanisms (#63)"
git push -u origin issue/063-backend-bmn-asset-service
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): encapsulate core national asset manipulation logic with automated spy mechanisms (#63)" \
  --body "## Summary
Pembangkitan Sentral Logika BMN (*Service Layer*). Menjauhkan rutinitas aritmatika kompleks dari jangkauan Controller sehingga sistem dapat dirawat berpuluh tahun ke depan.

## Changes
- Penciptaan \`AssetService\` yang mewadahi fungsionalitas \`storeAsset\`, \`updateAsset\`, dan \`disposeAsset\`.
- Penerapan pembungkus \`DB::transaction\` level master dipadukan gembok baris \`lockForUpdate()\`.
- Instalasi Papan Peringatan *(Intelligent Audit Hook)* yang mencatat jejak setiap kali nominal Harga atau Kondisi dirubah (*Anti-Fraud Compliance*).

## Rules Compliance
- [x] Lolos integrasi *Decimal Equality Casting*: Mencegah ledakan audit bodong akibat perbedaan tipe wujud dari API Payload.

Closes #63" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Modul BMN sisi Backend tidak boleh sekadar menyimpan. Ia butuh penjagaan Audit Tingkat Tinggi (Intelijen Jejak). Fungsi Controller dilarang keras menampung barisan *If-Else* Audit ini.

## Task

Kerjakan Issue #063 (Backend — AssetService).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/063-backend-bmn-asset-service.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Ciptakan Folder `backend/app/Modules/Bmn/Services`.
3. Pahat kode `AssetService.php` secara presisi tanpa mengganti blok `(float) === (float)` (Hal tersebut penting agar Audit Palsu tidak menjamur).
4. Pastikan `Asset` dan `AssetUpdate` berhasil di- *import* dengan sukses (cek ruang lingkup namespace-mu!).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
