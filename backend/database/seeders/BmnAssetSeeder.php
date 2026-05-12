<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class BmnAssetSeeder extends Seeder
{
    public function run(): void
    {
        $filePath = base_path('../ASET.xlsx');
        if (!file_exists($filePath)) {
            $this->command->error("ASET.xlsx not found at: {$filePath}");
            return;
        }

        $this->command->info("Reading ASET.xlsx...");
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestDataRow();

        // Column mapping: Excel column letter => DB column name
        $mapping = [
            'B' => 'jenis_bmn',
            'C' => 'kode_satker',
            'D' => 'nama_satker',
            'E' => 'kode_barang',
            'F' => 'nup',
            'G' => 'nup_lama',
            'H' => 'nama_barang',
            'I' => 'status_bmn',
            'J' => 'merk',
            'K' => 'tipe',
            'L' => 'kondisi',
            'M' => 'umur_aset',
            'N' => 'intra_extra',
            'O' => 'henti_guna',
            'P' => 'status_sbsn',
            'Q' => 'status_bmn_idle',
            'R' => 'status_kemitraan',
            'S' => 'bpybds',
            'T' => 'usulan_barang_hilang',
            'U' => 'usulan_barang_rb',
            'V' => 'usul_hapus',
            'W' => 'hibah_dktp',
            'X' => 'konsensi_jasa',
            'Y' => 'properti_investasi',
            'Z' => 'jenis_dokumen',
            'AA' => 'no_dokumen',
            'AB' => 'no_bpkp',
            'AC' => 'no_polisi',
            'AD' => 'status_sertifikasi',
            'AE' => 'jenis_sertipikat',
            'AF' => 'no_sertifikat',
            'AG' => 'nama_pemilik',
            'AH' => 'tanggal_buku_pertama',
            'AI' => 'tanggal_perolehan',
            'AJ' => 'tanggal_pengapusan',
            'AK' => 'nilai_perolehan_pertama',
            'AL' => 'nilai_mutasi',
            'AM' => 'nilai_perolehan',
            'AN' => 'nilai_penyusutan',
            'AO' => 'nilai_buku',
            'AP' => 'luas_tanah_seluruhnya',
            'AQ' => 'luas_tanah_bangunan',
            'AR' => 'luas_tanah_sarana',
            'AS' => 'luas_lahan_kosong',
            'AT' => 'luas_bangunan',
            'AU' => 'luas_tapak_bangunan',
            'AV' => 'luas_pemanfaatan',
            'AW' => 'jumlah_lantai',
            'AX' => 'jumlah_foto',
            'AY' => 'status_penggunaan',
            'AZ' => 'no_psp',
            'BA' => 'tanggal_psp',
            'BB' => 'alamat',
            'BC' => 'rt_rw',
            'BD' => 'kelurahan_desa',
            'BE' => 'kecamatan',
            'BF' => 'kab_kota',
            'BG' => 'kode_kab_kota',
            'BH' => 'provinsi',
            'BI' => 'kode_provinsi',
            'BJ' => 'kode_pos',
            'BK' => 'sbsk',
            'BL' => 'optimalisasi',
            'BM' => 'penghuni',
            'BN' => 'pengguna',
            'BO' => 'kode_kpknl',
            'BP' => 'uraian_kpknl',
            'BQ' => 'uraian_kanwil_djkn',
            'BR' => 'nama_kl',
            'BS' => 'nama_e1',
            'BT' => 'nama_korwil',
            'BU' => 'kode_register',
            'BV' => 'lokasi_ruang',
            'BW' => 'jenis_identitas',
            'BX' => 'no_identitas',
            'BY' => 'no_stnk',
            'BZ' => 'nama_pengguna_bmn',
            'CA' => 'status_pmk',
            'CB' => 'status_foto_geotag',
        ];

        // Date columns
        $dateColumns = ['tanggal_buku_pertama', 'tanggal_perolehan', 'tanggal_pengapusan', 'tanggal_psp'];
        // Numeric columns
        $numericColumns = ['umur_aset', 'nilai_perolehan_pertama', 'nilai_mutasi', 'nilai_perolehan', 'nilai_penyusutan', 'nilai_buku', 'luas_tanah_seluruhnya', 'luas_tanah_bangunan', 'luas_tanah_sarana', 'luas_lahan_kosong', 'luas_bangunan', 'luas_tapak_bangunan', 'luas_pemanfaatan', 'jumlah_lantai', 'jumlah_foto'];

        // Clear existing data
        DB::table('bmn_assets')->truncate();

        $batch = [];
        $batchSize = 100;
        $imported = 0;

        for ($row = 2; $row <= $highestRow; $row++) {
            $record = [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            foreach ($mapping as $col => $dbCol) {
                $colIdx = Coordinate::columnIndexFromString($col);
                $val = $sheet->getCellByColumnAndRow($colIdx, $row)->getValue();

                if (in_array($dbCol, $dateColumns)) {
                    // Handle Excel date serial numbers
                    if (is_numeric($val) && $val > 0) {
                        try {
                            $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((int)$val);
                            $val = $date->format('Y-m-d');
                        } catch (\Exception $e) {
                            $val = null;
                        }
                    } elseif (is_string($val) && !empty($val)) {
                        // Try to parse date string
                        try {
                            $val = date('Y-m-d', strtotime($val));
                            if ($val === '1970-01-01') $val = null;
                        } catch (\Exception $e) {
                            $val = null;
                        }
                    } else {
                        $val = null;
                    }
                } elseif (in_array($dbCol, $numericColumns)) {
                    $val = is_numeric($val) ? (float)$val : 0;
                } else {
                    $val = $val !== null ? (string)$val : null;
                    // Trim empty strings
                    if ($val === '' || $val === '0' && !in_array($dbCol, ['nup', 'nup_lama', 'kode_barang'])) {
                        $val = null;
                    }
                }

                $record[$dbCol] = $val;
            }

            // Ensure required fields
            if (empty($record['kode_barang']) || empty($record['nup'])) {
                continue; // Skip rows without kode_barang or nup
            }
            if (empty($record['nama_barang'])) {
                $record['nama_barang'] = 'Tanpa Nama';
            }

            // Map kondisi to valid enum
            $kondisi = $record['kondisi'] ?? 'Baik';
            if (!in_array($kondisi, ['Baik', 'Rusak Ringan', 'Rusak Berat'])) {
                $kondisi = 'Baik';
            }
            $record['kondisi'] = $kondisi;

            // Keep merk_tipe for backward compat
            $record['merk_tipe'] = trim(($record['merk'] ?? '') . ' ' . ($record['tipe'] ?? '')) ?: null;

            // Extract tahun_perolehan from tanggal_perolehan
            if (!empty($record['tanggal_perolehan'])) {
                $record['tahun_perolehan'] = (int)substr($record['tanggal_perolehan'], 0, 4);
            }

            // lokasi_spesifik from lokasi_ruang or alamat
            $record['lokasi_spesifik'] = $record['lokasi_ruang'] ?? $record['alamat'] ?? null;

            $batch[] = $record;

            if (count($batch) >= $batchSize) {
                DB::table('bmn_assets')->insert($batch);
                $imported += count($batch);
                $batch = [];
                if ($imported % 500 === 0) {
                    $this->command->info("  Imported {$imported} rows...");
                }
            }
        }

        // Insert remaining
        if (!empty($batch)) {
            DB::table('bmn_assets')->insert($batch);
            $imported += count($batch);
        }

        $this->command->info("Done! Imported {$imported} BMN assets from ASET.xlsx.");
    }
}
