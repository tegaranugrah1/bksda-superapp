<?php

namespace App\Modules\Bmn\Imports;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\ImportBatch;
use App\Modules\Bmn\Models\ImportStaging;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class AssetStagingImport implements ToArray, WithHeadingRow, WithChunkReading
{
    private ImportBatch $batch;
    private int $newCount = 0;
    private int $updatedCount = 0;
    private int $unchangedCount = 0;

    // Compare ALL fields in imported data (not just a subset)
    private const SKIP_FIELDS = ['id', 'created_at', 'updated_at', 'deleted_at', 'employee_id', 'foto_url', 'keterangan'];

    public function __construct(ImportBatch $batch)
    {
        $this->batch = $batch;
    }

    public function array(array $rows): void
    {
        $stagingRows = [];

        foreach ($rows as $row) {
            $kodeBarang = $row['kode_barang'] ?? null;
            $nup = $row['nup'] ?? null;
            $namaBarang = $row['nama_barang'] ?? null;

            if (!$kodeBarang || !$nup || !$namaBarang) {
                continue;
            }

            $importedData = $this->mapRowToData($row);

            // Find existing asset by kode_barang + nup (include soft-deleted)
            $existing = Asset::withTrashed()
                ->where('kode_barang', $kodeBarang)
                ->where('nup', (string) $nup)
                ->first();

            if ($existing) {
                // Compare fields
                $changedFields = $this->detectChanges($existing, $importedData);

                // If asset is soft-deleted, always mark as "updated" (needs restore)
                if ($existing->trashed()) {
                    $this->updatedCount++;
                    $diffStatus = 'updated';
                    if (empty($changedFields)) {
                        $changedFields = ['_restore' => ['old' => 'Dihapus', 'new' => 'Aktif']];
                    } else {
                        $changedFields['_restore'] = ['old' => 'Dihapus', 'new' => 'Aktif'];
                    }
                } elseif (empty($changedFields)) {
                    $this->unchangedCount++;
                    $diffStatus = 'unchanged';
                } else {
                    $this->updatedCount++;
                    $diffStatus = 'updated';
                }

                $stagingRows[] = [
                    'id' => (string) Str::uuid(),
                    'batch_id' => $this->batch->id,
                    'existing_asset_id' => $existing->id,
                    'diff_status' => $diffStatus,
                    'imported_data' => json_encode($importedData),
                    'changed_fields' => !empty($changedFields) ? json_encode($changedFields) : null,
                    'selected' => $diffStatus !== 'unchanged',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            } else {
                $this->newCount++;
                $stagingRows[] = [
                    'id' => (string) Str::uuid(),
                    'batch_id' => $this->batch->id,
                    'existing_asset_id' => null,
                    'diff_status' => 'new',
                    'imported_data' => json_encode($importedData),
                    'changed_fields' => null,
                    'selected' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // Bulk insert staging rows
        if (!empty($stagingRows)) {
            foreach (array_chunk($stagingRows, 200) as $chunk) {
                ImportStaging::insert($chunk);
            }
        }
    }

    public function chunkSize(): int
    {
        return 500;
    }

    public function getSummary(): array
    {
        return [
            'total' => $this->newCount + $this->updatedCount + $this->unchangedCount,
            'new' => $this->newCount,
            'updated' => $this->updatedCount,
            'unchanged' => $this->unchangedCount,
        ];
    }

    /**
     * Detect which fields changed between existing asset and imported data.
     * Compares ALL fields in imported data (full 80 columns).
     */
    private function detectChanges(Asset $existing, array $importedData): array
    {
        $changes = [];

        foreach ($importedData as $field => $newValue) {
            // Skip non-comparable fields
            if (in_array($field, self::SKIP_FIELDS)) {
                continue;
            }

            $oldValue = $existing->{$field};

            // Normalize for comparison
            $oldNorm = $this->normalize($oldValue);
            $newNorm = $this->normalize($newValue);

            // Detect change if values differ
            // Include cases where old has value but new is empty (field cleared)
            if ($oldNorm !== $newNorm) {
                $changes[$field] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }

        return $changes;
    }

    private function normalize($value): string
    {
        if ($value === null || $value === '' || $value === '-') {
            return '';
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        // Normalize numbers: remove trailing .00 decimals
        if (is_numeric($value)) {
            $float = (float) $value;
            if ($float == (int) $float) {
                return (string) (int) $float;
            }
            return (string) $float;
        }
        return strtolower(trim((string) $value));
    }

    /**
     * Map Excel row to asset data array (same logic as AssetImport).
     */
    private function mapRowToData(array $row): array
    {
        $kondisi = $row['kondisi'] ?? 'Baik';
        if (!in_array($kondisi, ['Baik', 'Rusak Ringan', 'Rusak Berat'])) {
            $kondisi = 'Baik';
        }

        return [
            'jenis_bmn' => $row['jenis_bmn'] ?? null,
            'kode_satker' => $row['kode_satker'] ?? null,
            'nama_satker' => $row['nama_satker'] ?? null,
            'kode_barang' => $row['kode_barang'],
            'nup' => (string) ($row['nup'] ?? ''),
            'nup_lama' => isset($row['nup_lama']) ? (string) $row['nup_lama'] : null,
            'nama_barang' => $row['nama_barang'],
            'status_bmn' => $row['status_bmn'] ?? null,
            'tipe' => $row['tipe'] ?? null,
            'merk' => $row['merk'] ?? ($row['nama'] ?? null),
            'merk_tipe' => trim(($row['merk'] ?? ($row['nama'] ?? '')) . ' ' . ($row['tipe'] ?? '')) ?: null,
            'kondisi' => $kondisi,
            'umur_aset' => $this->toInt($row['umur_aset'] ?? null),
            'intra_extra' => $row['intra_extra'] ?? ($row['intra__extra'] ?? null),
            'henti_guna' => $row['henti_guna'] ?? null,
            'status_sbsn' => $row['status_sbsn'] ?? null,
            'status_bmn_idle' => $row['status_bmn_idle'] ?? null,
            'status_kemitraan' => $row['status_kemitraan'] ?? null,
            'bpybds' => $row['bpybds'] ?? null,
            'usulan_barang_hilang' => $row['usulan_barang_hilang'] ?? null,
            'usulan_barang_rb' => $row['usulan_barang_rb'] ?? null,
            'usul_hapus' => $row['usul_hapus'] ?? null,
            'hibah_dktp' => $row['hibah_dktp'] ?? null,
            'konsensi_jasa' => $row['konsensi_jasa'] ?? null,
            'properti_investasi' => $row['properti_investasi'] ?? null,
            'jenis_dokumen' => $row['jenis_dokumen'] ?? null,
            'no_dokumen' => $row['no_dokumen'] ?? null,
            'no_bpkp' => $row['no_bpkp'] ?? null,
            'no_polisi' => $row['no_polisi'] ?? null,
            'status_sertifikasi' => $row['status_sertifikasi'] ?? null,
            'jenis_sertipikat' => $row['jenis_sertipikat'] ?? null,
            'no_sertifikat' => $row['no_sertifikat'] ?? null,
            'nama' => $row['nama'] ?? ($row['nama_pemilik'] ?? null),
            'tanggal_buku_pertama' => $this->toDate($row['tanggal_buku_pertama'] ?? null),
            'tanggal_perolehan' => $this->toDate($row['tanggal_perolehan'] ?? null),
            'tanggal_pengapusan' => $this->toDate($row['tanggal_pengapusan'] ?? null),
            'nilai_perolehan_pertama' => $this->toFloat($row['nilai_perolehan_pertama'] ?? null),
            'nilai_mutasi' => $this->toFloat($row['nilai_mutasi'] ?? null),
            'nilai_perolehan' => $this->toFloat($row['nilai_perolehan'] ?? 0),
            'nilai_penyusutan' => $this->toFloat($row['nilai_penyusutan'] ?? null),
            'nilai_buku' => $this->toFloat($row['nilai_buku'] ?? 0),
            'luas_tanah_seluruhnya' => $this->toFloat($row['luas_tanah_seluruhnya'] ?? null),
            'luas_tanah_bangunan' => $this->toFloat($row['luas_tanah_untuk_bangunan'] ?? null),
            'luas_tanah_sarana' => $this->toFloat($row['luas_tanah_untuk_sarana_lingkungan'] ?? null),
            'luas_lahan_kosong' => $this->toFloat($row['luas_lahan_kosong'] ?? null),
            'luas_bangunan' => $this->toFloat($row['luas_bangunan'] ?? null),
            'luas_tapak_bangunan' => $this->toFloat($row['luas_tapak_bangunan'] ?? null),
            'luas_pemanfaatan' => $this->toFloat($row['luas_pemanfataan'] ?? ($row['luas_pemanfaatan'] ?? null)),
            'jumlah_lantai' => $this->toInt($row['jumlah_lantai'] ?? null),
            'jumlah_foto' => $this->toInt($row['jumlah_foto'] ?? null),
            'status_penggunaan' => $row['status_penggunaan'] ?? null,
            'no_psp' => $row['no_psp'] ?? null,
            'tanggal_psp' => $this->toDate($row['tanggal_psp'] ?? null),
            'alamat' => $row['alamat'] ?? null,
            'rt_rw' => $row['rtrw'] ?? ($row['rt_rw'] ?? null),
            'kelurahan_desa' => $row['kelurahandesa'] ?? ($row['kelurahan_desa'] ?? null),
            'kecamatan' => $row['kecamatan'] ?? null,
            'kab_kota' => $row['kabkota'] ?? ($row['kab_kota'] ?? null),
            'kode_kab_kota' => $row['kode_kabkota'] ?? ($row['kode_kab_kota'] ?? null),
            'provinsi' => $row['provinsi'] ?? null,
            'kode_provinsi' => $row['kode_provinsi'] ?? null,
            'kode_pos' => $row['kode_pos'] ?? null,
            'sbsk' => $row['sbsk'] ?? null,
            'optimalisasi' => $row['optimalisasi'] ?? null,
            'penghuni' => $row['penghuni'] ?? null,
            'pengguna' => $row['pengguna'] ?? null,
            'kode_kpknl' => $row['kode_kpknl'] ?? null,
            'uraian_kpknl' => $row['uraian_kpknl'] ?? null,
            'uraian_kanwil_djkn' => $row['uraian_kanwil_djkn'] ?? null,
            'nama_kl' => $row['nama_kl'] ?? null,
            'nama_e1' => $row['nama_e1'] ?? null,
            'nama_korwil' => $row['nama_korwil'] ?? null,
            'kode_register' => $row['kode_register'] ?? null,
            'lokasi_ruang' => $row['lokasi_ruang'] ?? null,
            'lokasi_spesifik' => $row['lokasi_ruang'] ?? ($row['alamat'] ?? null),
            'jenis_identitas' => $row['jenis_identitas'] ?? null,
            'no_identitas' => $row['no_identitas'] ?? null,
            'no_stnk' => $row['no_stnk'] ?? null,
            'nama_pengguna' => $row['nama_pengguna'] ?? null,
            'status_pmk' => $row['status_pmk'] ?? null,
            'foto_geotag_url' => $this->extractUrl($row['foto_ber-geotag'] ?? ($row['foto_bergeotag'] ?? ($row['foto_ber_geotag'] ?? null))),
            'tahun_perolehan' => $this->extractYear($row['tanggal_perolehan'] ?? null),
        ];
    }

    private function toDate($value): ?string
    {
        if (!$value) return null;
        if (is_numeric($value)) {
            try {
                return ExcelDate::excelToDateTimeObject((int) $value)->format('Y-m-d');
            } catch (\Exception $e) {
                return null;
            }
        }
        if (is_string($value)) {
            $ts = strtotime($value);
            if ($ts && $ts > 0) {
                $date = date('Y-m-d', $ts);
                return $date !== '1970-01-01' ? $date : null;
            }
        }
        return null;
    }

    private function toFloat($value): float
    {
        return is_numeric($value) ? (float) $value : 0;
    }

    private function toInt($value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    private function extractYear($value): ?int
    {
        $date = $this->toDate($value);
        return $date ? (int) substr($date, 0, 4) : null;
    }

    private function extractUrl($value): ?string
    {
        if (!$value) return null;
        $val = (string) $value;
        return str_contains($val, 'http') ? $val : null;
    }
}
