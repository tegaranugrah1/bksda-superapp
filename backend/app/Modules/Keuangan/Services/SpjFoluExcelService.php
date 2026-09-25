<?php

namespace App\Modules\Keuangan\Services;

use Exception;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class SpjFoluExcelService
{
    protected string $templatePath;

    public function __construct(?string $templatePath = null)
    {
        if ($templatePath && file_exists($templatePath)) {
            $this->templatePath = $templatePath;
        } elseif (file_exists(storage_path('app/templates/Folu.xlsx'))) {
            $this->templatePath = storage_path('app/templates/Folu.xlsx');
        } elseif (file_exists(base_path('Folu.xlsx'))) {
            $this->templatePath = base_path('Folu.xlsx');
        } else {
            throw new Exception('Template Folu.xlsx tidak ditemukan di storage/app/templates atau root proyek.');
        }
    }

    /**
     * Generate populated Excel file from SPJ data array and return path to temporary file.
     */
    public function generate(array $data): string
    {
        @ini_set('memory_limit', '512M');

        $reader = new XlsxReader();
        $reader->setReadEmptyCells(false);
        $spreadsheet = $reader->load($this->templatePath);

        $recipients = $data['recipients'] ?? [];
        $pegawaiList = array_values(array_filter($recipients, fn($r) => ($r['type'] ?? '') !== 'pihak_ketiga'));
        $pihakKetigaList = array_values(array_filter($recipients, fn($r) => ($r['type'] ?? '') === 'pihak_ketiga'));

        $this->populateSptPanduan($spreadsheet, $data, $pegawaiList);
        $this->populateRekap($spreadsheet, $data, $recipients, $pegawaiList, $pihakKetigaList);
        $this->populateSpb($spreadsheet, $data, $recipients);
        $this->populateDaftarIsian($spreadsheet, $data, $recipients);
        $this->populateRinba($spreadsheet, $data, $pegawaiList);
        $this->populateSpd($spreadsheet, $data, $pegawaiList);
        $this->populateKwitansi($spreadsheet, $data, $recipients);

        $tempFile = tempnam(sys_get_temp_dir(), 'SPJ_FOLU_') . '.xlsx';
        $writer = new XlsxWriter($spreadsheet);
        $writer->setPreCalculateFormulas(false);
        $writer->save($tempFile);

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $tempFile;
    }

    protected function populateSptPanduan(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('SPT Panduan');
        if (!$ws) return;

        // Nomor SPT
        $sptNumber = $data['nomor_spt'] ?? $data['sptNumber'] ?? '';
        if ($sptNumber) {
            $ws->setCellValue('G2', $sptNumber);
        }

        // Slot pegawai 1..4
        $slots = [
            0 => ['d' => 'D6', 'g_name' => 'G6', 'g_nip' => 'G7', 'g_rank' => 'G8', 'g_pos' => 'G9', 'clear' => ['D6', 'E6', 'F6', 'G6', 'E7', 'F7', 'G7', 'E8', 'F8', 'G8', 'E9', 'F9', 'G9']],
            1 => ['d' => 'D11', 'g_name' => 'G11', 'g_nip' => 'G12', 'g_rank' => 'G13', 'g_pos' => 'G14', 'clear' => ['D11', 'E11', 'F11', 'G11', 'E12', 'F12', 'G12', 'E13', 'F13', 'G13', 'E14', 'F14', 'G14']],
            2 => ['d' => 'D16', 'g_name' => 'G16', 'g_nip' => 'G17', 'g_rank' => 'G18', 'g_pos' => 'G19', 'clear' => ['D16', 'E16', 'F16', 'G16', 'E17', 'F17', 'G17', 'E18', 'F18', 'G18', 'E19', 'F19', 'G19']],
            3 => ['d' => 'D21', 'g_name' => 'G21', 'g_nip' => 'G22', 'g_rank' => 'G23', 'g_pos' => 'G24', 'clear' => ['D21', 'E21', 'F21', 'G21', 'E22', 'F22', 'G22', 'E23', 'F23', 'G23', 'E24', 'F24', 'G24']],
        ];

        foreach ($slots as $idx => $slot) {
            if ($idx < count($pegawaiList)) {
                $p = $pegawaiList[$idx];
                $ws->setCellValue($slot['d'], ($idx + 1) . '.');
                $ws->setCellValue($slot['g_name'], $p['name'] ?? '');
                $nip = trim((string) ($p['nip'] ?? ''));
                $nipVal = $nip !== '' ? $this->formatTextValue($nip) : '-';
                $ws->setCellValueExplicit($slot['g_nip'], $nipVal, DataType::TYPE_STRING);
                $ws->setCellValue($slot['g_rank'], $p['rank'] ?? '-');
                $ws->setCellValue($slot['g_pos'], $p['position'] ?? '-');
            } else {
                foreach ($slot['clear'] as $cellCoord) {
                    $ws->setCellValue($cellCoord, null);
                }
            }
        }

        // Tanggal ST
        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $ws->setCellValue('H34', 'Samarinda ');
        $ws->setCellValue('I34', $this->formatIndoDate($startDate));
    }

    protected function populateRekap(Spreadsheet $spreadsheet, array $data, array $recipients, array $pegawaiList, array $pihakKetigaList): void
    {
        $ws = $spreadsheet->getSheetByName('Rekap');
        if (!$ws) return;

        // Header info
        $satker = $data['satuan_kerja'] ?? 'Balai Konservasi Sumber Daya Alam Kalimantan Timur';
        $kodeAwp = $data['kode_awp'] ?? $data['activity']['awpCode'] ?? 'C.1.1.2.01';
        $kegiatan = $data['nama_kegiatan'] ?? $data['activity']['name'] ?? $data['spjName'] ?? '';

        $ws->setCellValue('C2', $satker);
        $ws->setCellValue('C3', $kodeAwp);
        $ws->setCellValue('C4', $kegiatan);

        // Baris Penerima 10 s/d 15
        for ($i = 0; $i < 6; $i++) {
            $row = 10 + $i;
            if ($i < count($recipients)) {
                $r = $recipients[$i];
                $isPihakKetiga = ($r['type'] ?? '') === 'pihak_ketiga';

                $ws->setCellValue('A' . $row, $i + 1);
                $ws->setCellValue('B' . $row, $r['name'] ?? '');
                if ($isPihakKetiga) {
                    $ws->setCellValue('F' . $row, (float) ($r['amount'] ?? 0));
                }

                $ws->setCellValue('C' . $row, $r['description'] ?? '');

                $evidenceNo = $r['evidenceNo'] ?? '';
                $evidenceSuffix = $r['evidenceSuffix'] ?? '';
                $fullEvidence = trim($evidenceNo . $evidenceSuffix);
                if ($fullEvidence) {
                    $ws->setCellValue('E' . $row, $fullEvidence);
                }
            } else {
                foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as $col) {
                    $ws->setCellValue($col . $row, null);
                }
            }
        }

        // Tanggal & Pejabat TTD
        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $ws->setCellValue('B21', 'Samarinda, ' . $this->formatIndoDate($startDate));

        $ppk = $data['pejabat_ppk'] ?? $data['ppk'] ?? [];
        if (!empty($ppk['name'])) {
            $ws->setCellValue('B27', $ppk['name']);
            $ws->setCellValue('B28', 'NIP. ' . $this->cleanNip($ppk['nip'] ?? ''));
        }

        $pdo = $data['pejabat_pdo'] ?? $data['pdo'] ?? [];
        if (!empty($pdo['name'])) {
            $ws->setCellValue('E27', $pdo['name']);
            $ws->setCellValue('E28', 'NIP. ' . $this->cleanNip($pdo['nip'] ?? ''));
        }
    }

    protected function populateDaftarIsian(Spreadsheet $spreadsheet, array $data, array $recipients): void
    {
        $ws = $spreadsheet->getSheetByName('Daftar Isian');
        if (!$ws) return;

        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $endDate = $data['tanggal_selesai'] ?? $data['travel']['endDate'] ?? $startDate;
        $dateRangeText = $this->formatIndoDate($startDate) . ' - ' . $this->formatIndoDate($endDate);

        // Baris 12 s/d 17
        for ($i = 0; $i < 6; $i++) {
            $row = 12 + $i;
            if ($i < count($recipients)) {
                $r = $recipients[$i];
                $ws->setCellValue('A' . $row, $i + 1);
                $accNo = trim((string) ($r['accountNo'] ?? ''));
                $ws->setCellValueExplicit('C' . $row, $this->formatTextValue($accNo), DataType::TYPE_STRING);
                $ws->setCellValue('D' . $row, $r['bankName'] ?? '');
                $ws->setCellValue('E' . $row, $r['accountHolder'] ?? $r['name'] ?? '');
                $ws->setCellValue('G' . $row, $dateRangeText);
            } else {
                foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as $col) {
                    $ws->setCellValue($col . $row, null);
                }
            }
        }
    }

    protected function populateSpb(Spreadsheet $spreadsheet, array $data, array $recipients): void
    {
        $ws = $spreadsheet->getSheetByName('SPB');
        if (!$ws) return;

        // Nomor SPB
        $spbNo = $data['spbNumber']['no'] ?? '';
        $spbSuffix = $data['spbNumber']['suffix'] ?? '/SPB/K.18/FOLU-NC23/09/2026';
        $fullSpb = trim($spbNo . $spbSuffix);
        if ($fullSpb) {
            $ws->setCellValue('E9', $fullSpb);
        }

        // Virtual Account & PPK Position
        $spbConfig = $data['spbConfig'] ?? [];
        if (!empty($spbConfig['virtualAccount'])) {
            $ws->setCellValueExplicit('D15', $this->formatTextValue($spbConfig['virtualAccount']), DataType::TYPE_STRING);
        }
        if (!empty($spbConfig['ppkPosition'])) {
            $ws->setCellValue('D14', $spbConfig['ppkPosition']);
        }

        // Pejabat TTD
        $pdo = $data['pejabat_pdo'] ?? $data['pdo'] ?? [];
        if (!empty($pdo['name'])) {
            $ws->setCellValue('A33', $pdo['name']);
            $ws->setCellValue('A34', 'NIP. ' . $this->cleanNip($pdo['nip'] ?? ''));
        }

        $verifikator = $data['pejabat_verifikator'] ?? $data['verifikator'] ?? [];
        if (!empty($verifikator['name'])) {
            $ws->setCellValue('F33', $verifikator['name']);
            $ws->setCellValue('F34', 'NIP. ' . $this->cleanNip($verifikator['nip'] ?? ''));
        }

        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $ws->setCellValue('F36', 'Samarinda, ' . $this->formatIndoDate($startDate));
    }

    protected function populateRinba(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('Rinba');
        if (!$ws) return;

        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $indoDate = $this->formatIndoDate($startDate);

        $slots = [
            0 => ['suffix_col' => 'G3', 'date_col' => 'E4', 'rate_col' => 'E8', 'days_text' => 'B9', 'trans1' => 'E11', 'trans2' => 'E12', 'city_date' => 'G25', 'terbilang' => 'C23'],
            1 => ['suffix_col' => 'P3', 'date_col' => 'N4', 'rate_col' => 'N8', 'days_text' => 'K9', 'trans1' => 'N11', 'trans2' => 'N12', 'city_date' => 'P25', 'terbilang' => 'L23'],
            2 => ['suffix_col' => 'Y3', 'date_col' => 'W4', 'rate_col' => 'W8', 'days_text' => 'T9', 'trans1' => 'W11', 'trans2' => 'W12', 'city_date' => 'Y25', 'terbilang' => 'U23'],
            3 => ['suffix_col' => 'AH3', 'date_col' => 'AF4', 'rate_col' => 'AF8', 'days_text' => 'AC9', 'trans1' => 'AF11', 'trans2' => 'AF12', 'city_date' => 'AH25', 'terbilang' => 'AD23'],
        ];

        $spdSuffix = $data['spdNumber']['suffix'] ?? '/K.18-TU/FOLU.NC-23/09/2026';

        foreach ($slots as $idx => $slot) {
            if ($idx < count($pegawaiList)) {
                $p = $pegawaiList[$idx];
                $rinba = $p['rinba'] ?? [];

                $ws->setCellValue($slot['suffix_col'], $spdSuffix);
                $ws->setCellValue($slot['date_col'], $indoDate);
                $ws->setCellValue($slot['city_date'], 'Samarinda, ' . $indoDate);

                if (!empty($rinba['uangHarianTotal'])) {
                    $ws->setCellValue($slot['rate_col'], (float) $rinba['uangHarianTotal']);
                }
                if (!empty($rinba['lamaHari']) && !empty($rinba['uangHarianRate'])) {
                    $ws->setCellValue($slot['days_text'], "{$rinba['lamaHari']} x Rp. " . number_format($rinba['uangHarianRate'], 0, ',', '.') . ',-');
                }
                if (isset($rinba['transportPergi'])) {
                    $ws->setCellValue($slot['trans1'], (float) $rinba['transportPergi']);
                }
                if (isset($rinba['transportPulang'])) {
                    $ws->setCellValue($slot['trans2'], (float) $rinba['transportPulang']);
                }
                if (!empty($rinba['terbilang'])) {
                    $ws->setCellValue($slot['terbilang'], $rinba['terbilang']);
                }
            } else {
                $ws->setCellValue($slot['rate_col'], 0);
                $ws->setCellValue($slot['trans1'], 0);
                $ws->setCellValue($slot['trans2'], 0);
                $ws->setCellValue($slot['terbilang'], '');
                $ws->setCellValue($slot['days_text'], '');
            }
        }
    }

    protected function populateSpd(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('spd');
        if (!$ws) return;

        $spdNo = $data['spdNumber']['no'] ?? '';
        $spdSuffix = $data['spdNumber']['suffix'] ?? '/K.18-TU/FOLU.NC-23/09/2026';
        $fullSpd = trim($spdNo . $spdSuffix);

        $origin = $data['travel']['origin'] ?? $data['asal'] ?? 'Samarinda';
        $destination = $data['travel']['destination'] ?? $data['tujuan'] ?? 'Kabupaten Kutai Barat';
        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $endDate = $data['tanggal_selesai'] ?? $data['travel']['endDate'] ?? $startDate;
        $maksud = $data['nama_kegiatan'] ?? $data['activity']['name'] ?? $data['spjName'] ?? '';

        $slots = [
            0 => ['no' => 'E11', 'maksud' => 'E19', 'origin' => 'F21', 'dest' => 'F22', 'start' => 'F24', 'end' => 'F25'],
            1 => ['no' => 'N11', 'maksud' => 'N19', 'origin' => 'O21', 'dest' => 'O22', 'start' => 'O24', 'end' => 'O25'],
            2 => ['no' => 'W11', 'maksud' => 'W19', 'origin' => 'X21', 'dest' => 'X22', 'start' => 'X24', 'end' => 'X25'],
            3 => ['no' => 'AF11', 'maksud' => 'AF19', 'origin' => 'AG21', 'dest' => 'AG22', 'start' => 'AG24', 'end' => 'AG25'],
        ];

        foreach ($slots as $idx => $slot) {
            if ($idx < count($pegawaiList)) {
                if ($fullSpd) {
                    $ws->setCellValue($slot['no'], $fullSpd);
                }
                $ws->setCellValue($slot['maksud'], $maksud);
                $ws->setCellValue($slot['origin'], $origin);
                $ws->setCellValue($slot['dest'], $destination);
                $ws->setCellValue($slot['start'], $this->formatIndoDate($startDate));
                $ws->setCellValue($slot['end'], $this->formatIndoDate($endDate));
            }
        }
    }

    protected function populateKwitansi(Spreadsheet $spreadsheet, array $data, array $recipients): void
    {
        $ws = $spreadsheet->getSheetByName('Kwitansi');
        if (!$ws) return;

        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $year = date('Y', strtotime($startDate));
        $ws->setCellValue('K3', (int) $year);

        $kwitansiConfig = $data['kwitansiConfig'] ?? [];
        if (!empty($kwitansiConfig['sudahTerimaDari'])) {
            $ws->setCellValue('D10', $kwitansiConfig['sudahTerimaDari']);
        }

        $ws->setCellValue('J19', 'Samarinda, ' . $this->formatIndoDate($startDate));
    }

    protected function formatIndoDate(?string $date): string
    {
        if (!$date) return '';
        $time = strtotime($date);
        if (!$time) return $date;

        $months = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        $d = date('j', $time);
        $m = (int) date('n', $time);
        $y = date('Y', $time);

        return "{$d} {$months[$m]} {$y}";
    }

    protected function cleanNip(?string $nip): string
    {
        if (!$nip) return '';
        $clean = preg_replace('/[^0-9]/', '', $nip);
        if (strlen($clean) === 18) {
            return substr($clean, 0, 8) . ' ' . substr($clean, 8, 6) . ' ' . substr($clean, 14, 1) . ' ' . substr($clean, 15);
        }
        if ($clean !== '') {
            return "'" . $clean;
        }
        return $nip;
    }

    /**
     * Format nilai teks ke Excel. Jika nilai hanya berisi angka (seperti NIP, NIK, No Rekening, dll),
     * tambahkan tanda petik satu (') di awal agar Excel tidak mengubahnya menjadi format ilmiah (2E+17)
     * atau memotong digit presisi.
     */
    protected function formatTextValue($val): string
    {
        if ($val === null || $val === '') {
            return '';
        }
        $str = trim((string) $val);
        if ($str === '' || $str === '-') {
            return $str;
        }
        if (str_starts_with($str, "'")) {
            return $str;
        }
        // Jika angka semua (atau angka dengan spasi seperti NIP berformat)
        $digitsOnly = preg_replace('/\s+/', '', $str);
        if (preg_match('/^\d+$/', $digitsOnly) && strlen($digitsOnly) >= 3) {
            return "'" . $str;
        }
        return $str;
    }
}
