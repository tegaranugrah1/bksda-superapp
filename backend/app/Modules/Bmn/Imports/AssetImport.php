<?php

namespace App\Modules\Bmn\Imports;

use App\Modules\Bmn\Models\Asset;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class AssetImport implements ToModel, WithHeadingRow, WithBatchInserts, WithChunkReading
{
    private int $imported = 0;

    public function model(array $row)
    {
        // Map Excel headers (snake_case from WithHeadingRow) to DB columns
        $kodeBarang = $row['kode_barang'] ?? null;
        $nup = $row['nup'] ?? null;
        $namaBarang = $row['nama_barang'] ?? null;

        if (!$kodeBarang || !$nup || !$namaBarang) {
            return null; // Skip rows without required fields
        }

        $kondisi = $row['kondisi'] ?? 'Baik';
        if (!in_array($kondisi, ['Baik', 'Rusak Ringan', 'Rusak Berat'])) {
            $kondisi = 'Baik';
        }

        $this->imported++;

        return new Asset([
            'id' => (string) Str::uuid(),
            'jenis_bmn' => $row['jenis_bmn'] ?? null,
            'kode_satker' => $row['kode_satker'] ?? null,
            'nama_satker' => $row['nama_satker'] ?? null,
            'kode_barang' => $kodeBarang,
            'nup' => (string) $nup,
            'nup_lama' => isset($row['nup_lama']) ? (string) $row['nup_lama'] : null,
            'nama_barang' => $namaBarang,
            'status_bmn' => $row['status_bmn'] ?? null,
            'merk' => $row['merk'] ?? null,
            'tipe' => $row['tipe'] ?? null,
            'merk_tipe' => trim(($row['merk'] ?? '') . ' ' . ($row['tipe'] ?? '')) ?: null,
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
            'nama_pemilik' => $row['nama'] ?? null,
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
            'nama_pengguna_bmn' => $row['nama_pengguna'] ?? null,
            'status_pmk' => $row['status_pmk'] ?? null,
            'foto_geotag_url' => $this->extractUrl($row['foto_ber-geotag'] ?? ($row['foto_bergeotag'] ?? ($row['foto_ber_geotag'] ?? null))),
            'tahun_perolehan' => $this->extractYear($row['tanggal_perolehan'] ?? null),
        ]);
    }

    public function batchSize(): int
    {
        return 200;
    }

    public function chunkSize(): int
    {
        return 500;
    }

    public function getImportedCount(): int
    {
        return $this->imported;
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
