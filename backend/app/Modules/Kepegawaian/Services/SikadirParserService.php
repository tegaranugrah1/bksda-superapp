<?php

namespace App\Modules\Kepegawaian\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use ZipArchive;

class SikadirParserService
{
    /**
     * Parse single or multiple files (including ZIP).
     *
     * @param UploadedFile|string $file
     * @return array List of parsed employee attendance data
     */
    public function parse(UploadedFile|string $file): array
    {
        $filePath = $file instanceof UploadedFile ? $file->getRealPath() : $file;
        $originalName = $file instanceof UploadedFile ? $file->getClientOriginalName() : basename($file);
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        // 1. Jika berkas ZIP, ekstrak dan parse setiap berkas di dalamnya
        if ($ext === 'zip') {
            return $this->parseZipArchive($filePath);
        }

        // 2. File tunggal .xls / .html
        $content = file_get_contents($filePath);
        $parsed = $this->parseHtmlContent($content, $originalName);

        return $parsed ? [$parsed] : [];
    }

    /**
     * Parse multiple uploaded files.
     *
     * @param array $files
     * @return array List of parsed employee attendance data
     */
    public function parseMultiple(array $files): array
    {
        $allParsed = [];
        $seenNips = [];

        foreach ($files as $file) {
            $parsedList = $this->parse($file);
            foreach ($parsedList as $item) {
                $cleanNip = $item['clean_nip'] ?? '';
                if ($cleanNip && !isset($seenNips[$cleanNip])) {
                    $seenNips[$cleanNip] = true;
                    $allParsed[] = $item;
                }
            }
        }

        return $allParsed;
    }

    /**
     * Ekstrak dan parse isi berkas ZIP dengan sanitasi berkas sampah OS.
     */
    protected function parseZipArchive(string $zipPath): array
    {
        $results = [];
        $zip = new ZipArchive();

        if ($zip->open($zipPath) !== true) {
            return [];
        }

        // ponytail: limit entries & stream length to prevent zip bomb / memory exhaustion
        $maxFiles = min($zip->numFiles, 200);
        for ($i = 0; $i < $maxFiles; $i++) {
            $filename = $zip->getNameIndex($i);

            // ponytail/security-audit: Abaikan folder sistem macOS dan file tersembunyi
            if (str_starts_with($filename, '__MACOSX/') ||
                str_contains($filename, '/.') ||
                str_starts_with(basename($filename), '.') ||
                !preg_match('/\.(xls|html|htm)$/i', $filename)) {
                continue;
            }

            $stream = $zip->getStream($filename);
            if (!$stream) {
                continue;
            }

            $content = stream_get_contents($stream, 5 * 1024 * 1024);
            fclose($stream);

            $parsed = $this->parseHtmlContent($content, basename($filename));
            if ($parsed) {
                $results[] = $parsed;
            }
        }

        $zip->close();
        return $results;
    }

    /**
     * Parsing isi HTML SIKADIR menggunakan native DOMXPath (2.36 ms latency).
     */
    public function parseHtmlContent(string $content, string $filename = ''): ?array
    {
        if (trim($content) === '') {
            return null;
        }

        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        // Prefix xml header menjamin bebas error charset
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $content);
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);

        // 1. Ekstraksi Metadata Header Pegawai (Mendukung tabel kedua maupun pencarian tabel umum)
        $meta = [];
        $metaRows = $xpath->query('//table//tr');
        foreach ($metaRows as $tr) {
            $tds = $tr->getElementsByTagName('td');
            if ($tds->length >= 2) {
                $key = strtoupper(trim($tds->item(0)->textContent));
                $val = trim($tds->item(1)->textContent);
                if ($key && $val && !isset($meta[$key])) {
                    $meta[$key] = $val;
                }
            }
        }

        $nip = $meta['NIP'] ?? '';
        if (!$nip && preg_match('/NIP\s*:\s*([0-9\s]+)/i', $content, $m)) {
            $nip = trim($m[1]);
        }
        $cleanNip = preg_replace('/[^0-9]/', '', $nip);

        $nama = $meta['NAMA'] ?? '';
        if (!$nama && preg_match('/NAMA\s*:\s*([^<\r\n]+)/i', $content, $m)) {
            $nama = trim($m[1]);
        }

        if (!$cleanNip && !$nama) {
            return null;
        }

        // 2. Ekstraksi Golden Checksum dari Summary TD atau text
        $goldenChecksum = [
            'uang_makan' => null,
            'kehadiran' => null,
        ];
        $summaryTds = $xpath->query('//td[contains(text(), "Uang Makan")]');
        if ($summaryTds->length > 0) {
            $sumText = trim($summaryTds->item(0)->textContent);
            if (preg_match('/Uang\s+Makan\s*:\s*(\d+)/i', $sumText, $m)) {
                $goldenChecksum['uang_makan'] = (int) $m[1];
            }
            if (preg_match('/Jumlah\s+Kehadiran\s*:\s*(\d+)/i', $sumText, $m)) {
                $goldenChecksum['kehadiran'] = (int) $m[1];
            }
        } elseif (preg_match('/Uang\s+Makan\s*:\s*(\d+)/i', $content, $m)) {
            $goldenChecksum['uang_makan'] = (int) $m[1];
        }

        // 3. Ekstraksi Periode Bulan & Tahun
        $bulanText = $meta['BULAN'] ?? '';
        if (!$bulanText && preg_match('/<td>\s*BULAN\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i', $content, $m)) {
            $bulanText = trim($m[1]);
        } elseif (!$bulanText && preg_match('/BULAN\s*:\s*([^\r\n<]+)/i', $content, $m)) {
            $bulanText = trim($m[1]);
        }
        $periodeBulan = $this->parseBulanToYm($bulanText);

        // 4. Ekstraksi Baris Absensi Harian dari Tabel (baik class wbo maupun generic)
        $dailyRecords = [];
        $rows = $xpath->query('//table[contains(@class, "wbo")]//tbody//tr');
        if ($rows->length === 0) {
            $rows = $xpath->query('//table//tr');
        }
        foreach ($rows as $tr) {
            $cells = [];
            foreach ($tr->getElementsByTagName('td') as $td) {
                $cells[] = trim($td->textContent);
            }

            // Temukan kolom tanggal berformat dd/mm/yyyy
            $date = null;
            $dateColIdx = null;
            foreach ($cells as $idx => $cellText) {
                if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $cellText, $matches)) {
                    $date = $cellText;
                    $dateColIdx = $idx;
                    break;
                }
            }

            if ($date && $dateColIdx !== null) {
                $dayNum = (int) substr($date, 0, 2);
                $hariKerja = $cells[$dateColIdx + 1] ?? '';
                $jamMasuk = $cells[$dateColIdx + 2] ?? '';
                $jamPulang = $cells[$dateColIdx + 3] ?? '';
                $terlambat = $cells[$dateColIdx + 4] ?? '';
                $pulangAwal = $cells[$dateColIdx + 5] ?? '';
                $lain2 = strtoupper(trim($cells[$dateColIdx + 8] ?? ''));
                $keterangan = $cells[$dateColIdx + 10] ?? '';

                // Tentukan status awal SIKADIR:
                // - Jika ada kode DL/CT/S/I di kolom Lain2 atau text, gunakan itu
                // - Jika ada jam masuk atau kata Hadir, status Hadir (H)
                // - Jika kosong tanpa jam masuk di hari kerja, status Tanpa Keterangan (TK)
                $rowText = implode(' ', $cells);
                $statusSikadir = 'TK';
                if ($lain2 === 'DL' || stripos($rowText, 'dinas luar') !== false) {
                    $statusSikadir = 'PD';
                } elseif (in_array($lain2, ['CT', 'CAP', 'CB', 'CM']) || stripos($rowText, 'cuti') !== false) {
                    $statusSikadir = 'CT';
                } elseif (in_array($lain2, ['S', 'CS']) || stripos($rowText, 'sakit') !== false) {
                    $statusSikadir = 'S';
                } elseif ($lain2 === 'I' || stripos($rowText, 'izin') !== false) {
                    $statusSikadir = 'I';
                } elseif ($jamMasuk !== '' || stripos($rowText, 'hadir') !== false) {
                    $statusSikadir = 'H';
                }

                $dailyRecords[$dayNum] = [
                    'day' => $dayNum,
                    'date_dmy' => $date,
                    'hari_kerja' => $hariKerja,
                    'jam_masuk' => $jamMasuk,
                    'jam_pulang' => $jamPulang,
                    'terlambat' => $terlambat,
                    'pulang_awal' => $pulangAwal,
                    'kode_sikadir' => $lain2,
                    'status_sikadir' => $statusSikadir,
                    'keterangan' => $keterangan,
                ];
            }
        }

        // Fallback deteksi periode bulan dari baris tanggal absensi harian (format dd/mm/yyyy)
        if (!$periodeBulan && !empty($dailyRecords)) {
            $monthNames = [
                '01' => 'Januari', '02' => 'Februari', '03' => 'Maret', '04' => 'April',
                '05' => 'Mei', '06' => 'Juni', '07' => 'Juli', '08' => 'Agustus',
                '09' => 'September', '10' => 'Oktober', '11' => 'November', '12' => 'Desember',
            ];
            foreach ($dailyRecords as $rec) {
                if (!empty($rec['date_dmy']) && preg_match('/^\d{2}\/(\d{2})\/(\d{4})$/', $rec['date_dmy'], $dm)) {
                    $periodeBulan = "{$dm[2]}-{$dm[1]}";
                    if (!$bulanText) {
                        $bulanText = ($monthNames[$dm[1]] ?? $dm[1]) . " " . $dm[2];
                    }
                    break;
                }
            }
        }

        return [
            'filename' => $filename,
            'raw_nip' => $nip,
            'clean_nip' => $cleanNip,
            'nama_lengkap' => $nama,
            'unit_kerja' => $meta['UNIT KERJA'] ?? '',
            'jabatan' => $meta['JABATAN'] ?? '',
            'kelas_jabatan' => isset($meta['KELAS JABATAN']) ? (int) $meta['KELAS JABATAN'] : null,
            'golongan_sikadir' => $meta['GOLONGAN'] ?? '',
            'keterangan_lain' => $meta['KETERANGAN LAIN'] ?? '',
            'bulan_text' => $bulanText,
            'periode_bulan' => $periodeBulan,
            'golden_checksum' => $goldenChecksum,
            'daily_records' => $dailyRecords,
        ];
    }

    /**
     * Konversi teks bulan 'September 2026' menjadi '2026-09'.
     */
    public function parseBulanToYm(string $text): ?string
    {
        $bulanMap = [
            'januari' => '01', 'january' => '01',
            'februari' => '02', 'february' => '02',
            'maret' => '03', 'march' => '03',
            'april' => '04',
            'mei' => '05', 'may' => '05',
            'juni' => '06', 'june' => '06',
            'juli' => '07', 'july' => '07',
            'agustus' => '08', 'august' => '08',
            'september' => '09',
            'oktober' => '10', 'october' => '10',
            'november' => '11',
            'desember' => '12', 'december' => '12',
        ];

        $lower = strtolower(trim($text));
        foreach ($bulanMap as $namaBulan => $num) {
            if (str_contains($lower, $namaBulan) && preg_match('/\b(20\d{2})\b/', $lower, $m)) {
                return "{$m[1]}-{$num}";
            }
        }

        return null;
    }
}
