<?php

namespace App\Modules\Kepegawaian\Services;

use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class MealAllowanceExcelExport
{
    /**
     * Generate 2-Sheet Excel Workbook (Matriks Presensi + Nominatif Pembayaran).
     *
     * @param array $items List of reconciled employee items
     * @param string $periodeBulan Format 'YYYY-MM', e.g. '2026-09'
     * @param array $signatory ['nama' => '...', 'nip' => '...', 'jabatan' => '...']
     * @return Spreadsheet
     */
    public function generate(array $items, string $periodeBulan, array $signatory = []): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $carbonPeriod = Carbon::createFromFormat('Y-m', $periodeBulan)->startOfMonth();

        // Helper normalisasi kode bank untuk judul sheet (maks 31 karakter Excel)
        $bankCodeHelper = function (string $bank): string {
            $b = strtoupper(trim($bank));
            if (str_contains($b, 'MANDIRI') || $b === 'MNDRI') return 'MNDRI';
            if (str_contains($b, 'BRI')) return 'BRI';
            if (str_contains($b, 'BSI')) return 'BSI';
            if (str_contains($b, 'BNI')) return 'BNI';
            if (str_contains($b, 'BCA')) return 'BCA';
            if (str_contains($b, 'KALTIM') || str_contains($b, 'BPD')) return 'KALTIM';
            return preg_replace('/[^A-Z0-9]/', '', $b) ?: 'LAIN';
        };

        // 1. Inisialisasi 4 kategori standar BKSDA Kaltim (PNS/PPPK x BRI/Mandiri)
        $groups = [
            'PNS_BRI' => [
                'title' => 'PNS_BRI',
                'items' => [],
            ],
            'PNS_MNDRI' => [
                'title' => 'PNS_MNDRI',
                'items' => [],
            ],
            'PPPK_MNDRI' => [
                'title' => 'PPPK_MNDRI',
                'items' => [],
            ],
            'PPPK_BRI' => [
                'title' => 'PPPK_BRI',
                'items' => [],
            ],
        ];

        // Wadah nominatif per bank (Mandiri & BRI default selalu tersedia)
        $nominatifBanks = [
            'MANDIRI' => [
                'title' => 'BANK MANDIRI',
                'sheet_title' => 'Nominatif Mandiri',
                'items' => [],
            ],
            'BRI' => [
                'title' => 'BANK BRI',
                'sheet_title' => 'Nominatif BRI',
                'items' => [],
            ],
        ];

        foreach ($items as $item) {
            $gol = strtoupper((string) ($item['golongan'] ?? ''));
            $jenis = strtoupper((string) ($item['jenis_pegawai'] ?? ''));
            $isPppk = ($jenis === 'PPPK') || str_contains($gol, 'PPPK') || str_contains($gol, 'P3K') || str_starts_with($gol, 'GOLONGAN ');
            $rawBank = trim((string) ($item['nama_bank'] ?? 'BRI'));
            $code = $bankCodeHelper($rawBank);
            $typePrefix = $isPppk ? 'PPPK' : 'PNS';
            $groupKey = "{$typePrefix}_{$code}";

            if (!isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'title' => substr($groupKey, 0, 31),
                    'items' => [],
                ];
            }
            $groups[$groupKey]['items'][] = $item;

            // Kumpulkan ke daftar nominatif bank terkait
            $nomKey = $code === 'MNDRI' ? 'MANDIRI' : $code;
            if (!isset($nominatifBanks[$nomKey])) {
                $nominatifBanks[$nomKey] = [
                    'title' => 'BANK ' . strtoupper($rawBank),
                    'sheet_title' => substr('Nominatif ' . strtoupper($rawBank), 0, 31),
                    'items' => [],
                ];
            }
            $nominatifBanks[$nomKey]['items'][] = $item;
        }

        // 2. Buat Sheet Matriks Presensi
        $sheetIdx = 0;
        foreach ($groups as $key => $grp) {
            $sheet = $sheetIdx === 0 ? $spreadsheet->getActiveSheet() : $spreadsheet->createSheet();
            $sheet->setTitle($grp['title']);
            $this->buildMatriksSheet($sheet, $grp['title'], $grp['items'], $carbonPeriod, $signatory);
            $sheetIdx++;
        }

        // 3. Buat Sheet Nominatif per Bank
        foreach ($nominatifBanks as $bankKey => $nom) {
            $sheetNom = $spreadsheet->createSheet();
            $sheetNom->setTitle($nom['sheet_title']);
            $this->buildNominatifSheet($sheetNom, $nom['title'], $nom['items'], $carbonPeriod, $signatory);
        }

        // Kembalikan kursor ke sheet pertama
        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    /**
     * Bangun satu sheet Matriks Presensi lengkap dengan format resmi BKSDA.
     */
    protected function buildMatriksSheet($sheet, string $groupTitle, array $items, Carbon $carbonPeriod, array $signatory): void
    {
        $daysInMonth = $carbonPeriod->daysInMonth;
        $namaBulanUpper = strtoupper($this->namaBulanIndo($carbonPeriod->month));
        $tahun = $carbonPeriod->year;
        $bulan = $carbonPeriod->month;

        $kasubbagNama = $signatory['nama'] ?? 'Dheny Mardiono, S.Hut., M.Sc.';
        $kasubbagNip = $signatory['nip'] ?? '19750314 199903 1 004';
        $kasubbagJabatan = $signatory['jabatan'] ?? 'Kepala Subbagian Tata Usaha';

        $kepalaBalaiNama = $signatory['kepala_balai_nama'] ?? 'M. Ari Wibawanto, S.Hut., M.Sc.';
        $kepalaBalaiNip = $signatory['kepala_balai_nip'] ?? '19740514 199903 1 001';

        // Page setup landscape auto-fit 1 page wide
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $sheet->getPageSetup()->setPaperSize(PageSetup::PAPERSIZE_LETTER);
        $sheet->getPageSetup()->setFitToPage(true);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        // Header Judul Baris 1-3
        $sheet->setCellValue('A1', 'REKAPITULASI ABSEN BALAI KSDA KALIMANTAN TIMUR');
        $sheet->setCellValue('A3', "BULAN  : {$namaBulanUpper}  {$tahun}");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(11);
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(10);

        // Header Tabel Baris 4-5
        $sheet->setCellValue('A4', 'No');
        $sheet->mergeCells('A4:A5');
        $sheet->setCellValue('B4', 'Nama');
        $sheet->mergeCells('B4:B5');

        // Kolom Tanggal 1..DaysInMonth
        $startColIdx = 3; // Kolom C
        $endColIdx = 2 + $daysInMonth;
        $startColLetter = Coordinate::stringFromColumnIndex($startColIdx);
        $endColLetter = Coordinate::stringFromColumnIndex($endColIdx);

        $sheet->setCellValue("{$startColLetter}4", 'Tanggal');
        $sheet->mergeCells("{$startColLetter}4:{$endColLetter}4");

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $colLetter = Coordinate::stringFromColumnIndex(2 + $d);
            $sheet->setCellValue("{$colLetter}5", $d);
            $sheet->getColumnDimension($colLetter)->setWidth(3.2);

            $currDate = Carbon::createFromDate($tahun, $bulan, $d);
            $isWeekend = HolidayCalendarHelper::isWeekend($currDate);
            $isHoliday = HolidayCalendarHelper::isHoliday($currDate);
            if ($isWeekend || $isHoliday) {
                $color = ($currDate->isSunday() || $isHoliday) ? 'FFFEE2E2' : 'FFE2E8F0';
                $sheet->getStyle("{$colLetter}5")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB($color);
            }
        }

        // Kolom Rekapitulasi setelah tanggal
        $jmlHariCol = Coordinate::stringFromColumnIndex($endColIdx + 1);
        $hadirCol = Coordinate::stringFromColumnIndex($endColIdx + 2);
        $alpaCol = Coordinate::stringFromColumnIndex($endColIdx + 3);
        $ijinCol = Coordinate::stringFromColumnIndex($endColIdx + 4);
        $sakitCol = Coordinate::stringFromColumnIndex($endColIdx + 5);
        $pdCol = Coordinate::stringFromColumnIndex($endColIdx + 6);
        $ctCol = Coordinate::stringFromColumnIndex($endColIdx + 7);

        $sheet->setCellValue("{$jmlHariCol}4", 'JML HARI');
        $sheet->mergeCells("{$jmlHariCol}4:{$jmlHariCol}5");

        $sheet->setCellValue("{$hadirCol}4", 'Jumlah');
        $sheet->mergeCells("{$hadirCol}4:{$ctCol}4");

        $sheet->setCellValue("{$hadirCol}5", 'Hadir');
        $sheet->setCellValue("{$alpaCol}5", 'Alpa');
        $sheet->setCellValue("{$ijinCol}5", 'Ijin');
        $sheet->setCellValue("{$sakitCol}5", 'Sakit');
        $sheet->setCellValue("{$pdCol}5", 'PD');
        $sheet->setCellValue("{$ctCol}5", 'CT');

        // Lebar kolom A, B, dan ringkasan
        $sheet->getColumnDimension('A')->setWidth(4.5);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension($jmlHariCol)->setWidth(6.5);
        foreach ([$hadirCol, $alpaCol, $ijinCol, $sakitCol, $pdCol, $ctCol] as $c) {
            $sheet->getColumnDimension($c)->setWidth(5.5);
        }

        // Style Header 4-5
        $headerRange = "A4:{$ctCol}5";
        $sheet->getStyle($headerRange)->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        // Data Rows Baris 6+
        $row = 6;
        $rowStartCol = Coordinate::stringFromColumnIndex(3);
        $rowEndCol = Coordinate::stringFromColumnIndex(2 + $daysInMonth);

        foreach ($items as $idx => $item) {
            $no = $idx + 1;
            $sheet->setCellValue("A{$row}", $no);
            $sheet->setCellValue("B{$row}", $this->safeCell(strtoupper((string) ($item['nama_lengkap'] ?? ''))));

            $dailyMatrix = $item['daily_matrix'] ?? [];

            for ($d = 1; $d <= $daysInMonth; $d++) {
                $colLetter = Coordinate::stringFromColumnIndex(2 + $d);
                $dayData = $dailyMatrix[$d] ?? null;
                $status = is_array($dayData) ? ($dayData['status'] ?? '-') : (is_string($dayData) ? $dayData : '-');
                $isHoliday = is_array($dayData) ? ($dayData['is_holiday'] ?? false) : false;
                $isWeekend = is_array($dayData) ? ($dayData['is_weekend'] ?? false) : false;

                $currDate = Carbon::createFromDate($tahun, $bulan, $d);
                $isWeekend = $isWeekend || HolidayCalendarHelper::isWeekend($currDate);
                $isHoliday = $isHoliday || HolidayCalendarHelper::isHoliday($currDate);

                if ($isWeekend || $isHoliday || $status === '-') {
                    $sheet->setCellValue("{$colLetter}{$row}", '');
                    $color = ($currDate->isSunday() || $isHoliday) ? 'FFFEE2E2' : 'FFE2E8F0';
                    $sheet->getStyle("{$colLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB($color);
                } else {
                    $sheet->setCellValue("{$colLetter}{$row}", $this->safeCell($status));
                }
            }

            // Formula Excel Dinamis (COUNTIF) identik BKSDA
            $rangeDinas = "{$rowStartCol}{$row}:{$rowEndCol}{$row}";

            $sheet->setCellValue("{$jmlHariCol}{$row}", $item['jml_hari_kerja'] ?? 22);
            $sheet->setCellValue("{$hadirCol}{$row}", "=COUNTIF({$rangeDinas},\"H\")");
            $sheet->setCellValue("{$alpaCol}{$row}", "=COUNTIF({$rangeDinas},\"TK\")+COUNTIF({$rangeDinas},\"A\")");
            $sheet->setCellValue("{$ijinCol}{$row}", "=COUNTIF({$rangeDinas},\"I\")");
            $sheet->setCellValue("{$sakitCol}{$row}", "=COUNTIF({$rangeDinas},\"S\")");
            $sheet->setCellValue("{$pdCol}{$row}", "=COUNTIF({$rangeDinas},\"PD\")");
            $sheet->setCellValue("{$ctCol}{$row}", "=COUNTIF({$rangeDinas},\"CT\")");

            // Format baris data
            $sheet->getStyle("A{$row}:{$ctCol}{$row}")->getFont()->setSize(9);
            $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("C{$row}:{$ctCol}{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("A{$row}:{$ctCol}{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

            $row++;
        }

        // Jika tidak ada pegawai dalam kategori ini, beri 1 baris kosong rapi
        if (empty($items)) {
            $sheet->setCellValue("A{$row}", '-');
            $sheet->setCellValue("B{$row}", 'Tidak ada pegawai pada kategori ini');
            $sheet->mergeCells("B{$row}:{$ctCol}{$row}");
            $sheet->getStyle("A{$row}:{$ctCol}{$row}")->getFont()->setSize(9)->setItalic(true);
            $sheet->getStyle("A{$row}:{$ctCol}{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $row++;
        }

        // Legenda & Blok Tanda Tangan Ganda BKSDA (Kiri: Kepala Balai, Kanan: Kasubbag TU)
        $legendStartRow = $row + 2;
        $sheet->setCellValue("A{$legendStartRow}", 'Keterangan');
        $sheet->setCellValue("A" . ($legendStartRow + 1), 'H');
        $sheet->setCellValue("B" . ($legendStartRow + 1), '= Hadir');
        $sheet->setCellValue("A" . ($legendStartRow + 2), 'TK');
        $sheet->setCellValue("B" . ($legendStartRow + 2), '= Tanpa Keterangan / Alpa');
        $sheet->setCellValue("A" . ($legendStartRow + 3), 'CT');
        $sheet->setCellValue("B" . ($legendStartRow + 3), '= Cuti');
        $sheet->setCellValue("A" . ($legendStartRow + 4), 'I');
        $sheet->setCellValue("B" . ($legendStartRow + 4), '= Ijin');
        $sheet->setCellValue("A" . ($legendStartRow + 5), 'PD');
        $sheet->setCellValue("B" . ($legendStartRow + 5), '= Perjalanan Dinas');
        $sheet->setCellValue("A" . ($legendStartRow + 6), 'S');
        $sheet->setCellValue("B" . ($legendStartRow + 6), '= Sakit');

        $sheet->getStyle("A{$legendStartRow}:B" . ($legendStartRow + 6))->getFont()->setSize(8.5);
        $sheet->getStyle("A{$legendStartRow}")->getFont()->setBold(true);

        // Tanda Tangan KIRI: Mengetahui Kepala Balai
        $sheet->setCellValue("C{$legendStartRow}", "Mengetahui :");
        $sheet->setCellValue("C" . ($legendStartRow + 1), 'Kepala Balai,');
        $sheet->setCellValue("C" . ($legendStartRow + 5), $this->safeCell($kepalaBalaiNama));
        $sheet->setCellValue("C" . ($legendStartRow + 6), $this->safeCell("NIP. {$kepalaBalaiNip}"));
        $sheet->getStyle("C" . ($legendStartRow + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet->getStyle("C{$legendStartRow}:C" . ($legendStartRow + 6))->getFont()->setSize(9);

        // Tanda Tangan KANAN: Kasubbag TU
        $sigCol = $hadirCol;
        $sheet->setCellValue("{$sigCol}{$legendStartRow}", "Samarinda,    {$this->namaBulanIndo($carbonPeriod->month)} {$tahun}");
        $sheet->setCellValue("{$sigCol}" . ($legendStartRow + 1), $this->safeCell($kasubbagJabatan) . ',');
        $sheet->setCellValue("{$sigCol}" . ($legendStartRow + 5), $this->safeCell($kasubbagNama));
        $sheet->setCellValue("{$sigCol}" . ($legendStartRow + 6), $this->safeCell("NIP. {$kasubbagNip}"));

        $sheet->getStyle("{$sigCol}" . ($legendStartRow + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet->getStyle("{$sigCol}{$legendStartRow}:{$sigCol}" . ($legendStartRow + 6))->getFont()->setSize(9);
    }

    /**
     * Bangun satu sheet Daftar Nominatif Pembayaran per Bank.
     */
    protected function buildNominatifSheet($sheet, string $bankTitle, array $items, Carbon $carbonPeriod, array $signatory): void
    {
        $namaBulanUpper = strtoupper($this->namaBulanIndo($carbonPeriod->month));
        $tahun = $carbonPeriod->year;

        $kasubbagNama = $signatory['nama'] ?? 'Dheny Mardiono, S.Hut., M.Sc.';
        $kasubbagNip = $signatory['nip'] ?? '19750314 199903 1 004';
        $kasubbagJabatan = $signatory['jabatan'] ?? 'Kepala Subbagian Tata Usaha';

        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $sheet->getPageSetup()->setFitToPage(true);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        // Judul Sheet Nominatif
        $sheet->setCellValue('A1', 'DAFTAR NOMINATIF PEMBAYARAN UANG MAKAN PEGAWAI (' . $bankTitle . ')');
        $sheet->setCellValue('A2', 'BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR');
        $sheet->setCellValue('A3', "PERIODE : {$namaBulanUpper} {$tahun}");
        $sheet->getStyle('A1:A3')->getFont()->setBold(true)->setSize(11);

        // Header Tabel Nominatif Baris 5
        $nomHeaders = [
            'A5' => 'NO',
            'B5' => 'NAMA PEGAWAI',
            'C5' => 'NIP',
            'D5' => 'GOLONGAN',
            'E5' => 'JML HARI',
            'F5' => 'TARIF (RP)',
            'G5' => 'KOTOR / BRUTO (RP)',
            'H5' => 'PPH 21 (%)',
            'I5' => 'POTONGAN PPH (RP)',
            'J5' => 'JUMLAH BERSIH / NETTO (RP)',
            'K5' => 'TANDA TANGAN',
        ];

        foreach ($nomHeaders as $cell => $text) {
            $sheet->setCellValue($cell, $text);
        }

        $sheet->getColumnDimension('A')->setWidth(5);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension('C')->setWidth(22);
        $sheet->getColumnDimension('D')->setWidth(18);
        $sheet->getColumnDimension('E')->setWidth(10);
        $sheet->getColumnDimension('F')->setWidth(14);
        $sheet->getColumnDimension('G')->setWidth(18);
        $sheet->getColumnDimension('H')->setWidth(12);
        $sheet->getColumnDimension('I')->setWidth(18);
        $sheet->getColumnDimension('J')->setWidth(22);
        $sheet->getColumnDimension('K')->setWidth(18);

        $sheet->getStyle('A5:K5')->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle('A5:K5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle('A5:K5')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle('A5:K5')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF1F5F9');

        $nomRow = 6;
        foreach ($items as $idx => $item) {
            $sheet->setCellValue("A{$nomRow}", $idx + 1);
            $sheet->setCellValue("B{$nomRow}", $this->safeCell((string) ($item['nama_lengkap'] ?? '')));
            $sheet->setCellValueExplicit("C{$nomRow}", (string) ($item['nip'] ?? ''), \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue("D{$nomRow}", $this->safeCell((string) ($item['golongan'] ?? '')));
            $sheet->setCellValue("E{$nomRow}", (int) ($item['jml_hadir'] ?? 0));
            $sheet->setCellValue("F{$nomRow}", (float) ($item['tarif_harian'] ?? 0));
            $sheet->setCellValue("G{$nomRow}", "=E{$nomRow}*F{$nomRow}");
            $pphRate = max(0, (float) ($item['persen_pph21'] ?? 0));
            $sheet2H = $pphRate . '%';
            $sheet->setCellValue("H{$nomRow}", $sheet2H);
            $sheet->setCellValue("I{$nomRow}", "=G{$nomRow}*({$pphRate}/100)");
            $sheet->setCellValue("J{$nomRow}", "=G{$nomRow}-I{$nomRow}");
            $sheet->setCellValue("K{$nomRow}", ($idx + 1) . '. ..............');

            $sheet->getStyle("A{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("C{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("D{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("E{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("H{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->getStyle("F{$nomRow}:G{$nomRow}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("I{$nomRow}:J{$nomRow}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("A{$nomRow}:K{$nomRow}")->getFont()->setSize(9);
            $sheet->getStyle("A{$nomRow}:K{$nomRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

            $nomRow++;
        }

        // Baris Total
        $sheet->setCellValue("A{$nomRow}", 'TOTAL');
        $sheet->mergeCells("A{$nomRow}:D{$nomRow}");
        $startDataRow = 6;
        $endDataRow = max(6, $nomRow - 1);
        $sheet->setCellValue("E{$nomRow}", "=SUM(E{$startDataRow}:E{$endDataRow})");
        $sheet->setCellValue("G{$nomRow}", "=SUM(G{$startDataRow}:G{$endDataRow})");
        $sheet->setCellValue("I{$nomRow}", "=SUM(I{$startDataRow}:I{$endDataRow})");
        $sheet->setCellValue("J{$nomRow}", "=SUM(J{$startDataRow}:J{$endDataRow})");

        $sheet->getStyle("A{$nomRow}:K{$nomRow}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("E{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("G{$nomRow}:J{$nomRow}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("A{$nomRow}:K{$nomRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$nomRow}:K{$nomRow}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF1F5F9');

        // Tanda Tangan di Sheet Nominatif
        $sigRow2 = $nomRow + 3;
        $sheet->setCellValue("I{$sigRow2}", "Samarinda,    {$this->namaBulanIndo($carbonPeriod->month)} {$tahun}");
        $sheet->setCellValue("I" . ($sigRow2 + 1), $this->safeCell($kasubbagJabatan) . ',');
        $sheet->setCellValue("I" . ($sigRow2 + 5), $this->safeCell($kasubbagNama));
        $sheet->setCellValue("I" . ($sigRow2 + 6), $this->safeCell("NIP. {$kasubbagNip}"));

        $sheet->getStyle("I" . ($sigRow2 + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet->getStyle("I{$sigRow2}:I" . ($sigRow2 + 6))->getFont()->setSize(9);
    }

    private function safeCell(?string $value): string
    {
        if ($value === null || $value === '' || $value === '-') {
            return $value ?? '-';
        }

        $trimmed = ltrim($value);
        return preg_match('/^[=+\-@\t\r]/', $trimmed) === 1 ? "'{$value}" : $value;
    }

    protected function namaBulanIndo(int $m): string
    {
        $bulan = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        return $bulan[$m] ?? '';
    }
}
