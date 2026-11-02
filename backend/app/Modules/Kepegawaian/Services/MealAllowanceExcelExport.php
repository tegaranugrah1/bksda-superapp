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
        $daysInMonth = $carbonPeriod->daysInMonth;
        $namaBulanUpper = strtoupper($this->namaBulanIndo($carbonPeriod->month));
        $tahun = $carbonPeriod->year;

        $kasubbagNama = $signatory['nama'] ?? 'Dheny Mardiono, S.Hut., M.Sc.';
        $kasubbagNip = $signatory['nip'] ?? '19750314 199903 1 004';
        $kasubbagJabatan = $signatory['jabatan'] ?? 'Kepala Subbagian Tata Usaha';

        // ==========================================
        // SHEET 1: MATRIKS PRESENSI
        // ==========================================
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('Matriks Presensi');

        // Page setup landscape auto-fit 1 page wide
        $sheet1->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $sheet1->getPageSetup()->setPaperSize(PageSetup::PAPERSIZE_LETTER);
        $sheet1->getPageSetup()->setFitToPage(true);
        $sheet1->getPageSetup()->setFitToWidth(1);
        $sheet1->getPageSetup()->setFitToHeight(0);

        // Header Judul Baris 1-3
        $sheet1->setCellValue('A1', 'REKAPITULASI ABSEN BALAI KSDA KALIMANTAN TIMUR');
        $sheet1->setCellValue('A3', "BULAN  : {$namaBulanUpper}  {$tahun}");
        $sheet1->getStyle('A1')->getFont()->setBold(true)->setSize(11);
        $sheet1->getStyle('A3')->getFont()->setBold(true)->setSize(10);

        // Header Tabel Baris 4-5
        $sheet1->setCellValue('A4', 'No');
        $sheet1->mergeCells('A4:A5');
        $sheet1->setCellValue('B4', 'Nama');
        $sheet1->mergeCells('B4:B5');

        // Kolom Tanggal 1..DaysInMonth
        $startColIdx = 3; // Kolom C
        $endColIdx = 2 + $daysInMonth;
        $startColLetter = Coordinate::stringFromColumnIndex($startColIdx);
        $endColLetter = Coordinate::stringFromColumnIndex($endColIdx);

        $sheet1->setCellValue("{$startColLetter}4", 'Tanggal');
        $sheet1->mergeCells("{$startColLetter}4:{$endColLetter}4");

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $colLetter = Coordinate::stringFromColumnIndex(2 + $d);
            $sheet1->setCellValue("{$colLetter}5", $d);
            $sheet1->getColumnDimension($colLetter)->setWidth(3.2);
        }

        // Kolom Rekapitulasi setelah tanggal
        $jmlHariCol = Coordinate::stringFromColumnIndex($endColIdx + 1);
        $hadirCol = Coordinate::stringFromColumnIndex($endColIdx + 2);
        $alpaCol = Coordinate::stringFromColumnIndex($endColIdx + 3);
        $ijinCol = Coordinate::stringFromColumnIndex($endColIdx + 4);
        $sakitCol = Coordinate::stringFromColumnIndex($endColIdx + 5);
        $pdCol = Coordinate::stringFromColumnIndex($endColIdx + 6);
        $ctCol = Coordinate::stringFromColumnIndex($endColIdx + 7);

        $sheet1->setCellValue("{$jmlHariCol}4", 'JML HARI');
        $sheet1->mergeCells("{$jmlHariCol}4:{$jmlHariCol}5");

        $sheet1->setCellValue("{$hadirCol}4", 'Jumlah');
        $sheet1->mergeCells("{$hadirCol}4:{$ctCol}4");

        $sheet1->setCellValue("{$hadirCol}5", 'Hadir');
        $sheet1->setCellValue("{$alpaCol}5", 'Alpa');
        $sheet1->setCellValue("{$ijinCol}5", 'Ijin');
        $sheet1->setCellValue("{$sakitCol}5", 'Sakit');
        $sheet1->setCellValue("{$pdCol}5", 'PD');
        $sheet1->setCellValue("{$ctCol}5", 'CT');

        // Lebar kolom A, B, dan ringkasan
        $sheet1->getColumnDimension('A')->setWidth(4.5);
        $sheet1->getColumnDimension('B')->setWidth(28);
        $sheet1->getColumnDimension($jmlHariCol)->setWidth(6.5);
        foreach ([$hadirCol, $alpaCol, $ijinCol, $sakitCol, $pdCol, $ctCol] as $c) {
            $sheet1->getColumnDimension($c)->setWidth(5.5);
        }

        // Style Header 4-5
        $headerRange = "A4:{$ctCol}5";
        $sheet1->getStyle($headerRange)->getFont()->setBold(true)->setSize(9);
        $sheet1->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet1->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        // Data Rows Baris 6+
        $row = 6;
        $totalWorkingDaysInMonth = 0;

        foreach ($items as $idx => $item) {
            $no = $idx + 1;
            $sheet1->setCellValue("A{$row}", $no);
            $sheet1->setCellValue("B{$row}", strtoupper($item['nama_lengkap']));

            $dailyMatrix = $item['daily_matrix'] ?? [];

            for ($d = 1; $d <= $daysInMonth; $d++) {
                $colLetter = Coordinate::stringFromColumnIndex(2 + $d);
                $dayData = $dailyMatrix[$d] ?? null;
                $status = is_array($dayData) ? ($dayData['status'] ?? '-') : (is_string($dayData) ? $dayData : '-');
                $isHoliday = is_array($dayData) ? ($dayData['is_holiday'] ?? false) : false;
                $isWeekend = is_array($dayData) ? ($dayData['is_weekend'] ?? false) : false;

                if ($isWeekend || $isHoliday || $status === '-') {
                    $sheet1->setCellValue("{$colLetter}{$row}", '');
                    // Shading abu-abu akhir pekan / libur
                    $sheet1->getStyle("{$colLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE2E8F0');
                } else {
                    $sheet1->setCellValue("{$colLetter}{$row}", $status);
                }
            }

            // Formula Excel Dinamis (COUNTIF)
            $rowStartCol = Coordinate::stringFromColumnIndex(3);
            $rowEndCol = Coordinate::stringFromColumnIndex(2 + $daysInMonth);
            $rangeDinas = "{$rowStartCol}{$row}:{$rowEndCol}{$row}";

            $sheet1->setCellValue("{$jmlHariCol}{$row}", $item['jml_hari_kerja'] ?? 22);
            $sheet1->setCellValue("{$hadirCol}{$row}", "=COUNTIF({$rangeDinas},\"H\")");
            $sheet1->setCellValue("{$alpaCol}{$row}", "=COUNTIF({$rangeDinas},\"TK\")+COUNTIF({$rangeDinas},\"A\")");
            $sheet1->setCellValue("{$ijinCol}{$row}", "=COUNTIF({$rangeDinas},\"I\")");
            $sheet1->setCellValue("{$sakitCol}{$row}", "=COUNTIF({$rangeDinas},\"S\")");
            $sheet1->setCellValue("{$pdCol}{$row}", "=COUNTIF({$rangeDinas},\"PD\")");
            $sheet1->setCellValue("{$ctCol}{$row}", "=COUNTIF({$rangeDinas},\"CT\")");

            // Format baris data
            $sheet1->getStyle("A{$row}:{$ctCol}{$row}")->getFont()->setSize(9);
            $sheet1->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet1->getStyle("C{$row}:{$ctCol}{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet1->getStyle("A{$row}:{$ctCol}{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

            $row++;
        }

        // Legenda & Blok Tanda Tangan Kasubbag TU
        $legendStartRow = $row + 2;
        $sheet1->setCellValue("A{$legendStartRow}", 'Keterangan');
        $sheet1->setCellValue("A" . ($legendStartRow + 1), 'H');
        $sheet1->setCellValue("B" . ($legendStartRow + 1), '= Hadir');
        $sheet1->setCellValue("A" . ($legendStartRow + 2), 'TK');
        $sheet1->setCellValue("B" . ($legendStartRow + 2), '= Tanpa Keterangan / Alpa');
        $sheet1->setCellValue("A" . ($legendStartRow + 3), 'CT');
        $sheet1->setCellValue("B" . ($legendStartRow + 3), '= Cuti');
        $sheet1->setCellValue("A" . ($legendStartRow + 4), 'I');
        $sheet1->setCellValue("B" . ($legendStartRow + 4), '= Ijin');
        $sheet1->setCellValue("A" . ($legendStartRow + 5), 'PD');
        $sheet1->setCellValue("B" . ($legendStartRow + 5), '= Perjalanan Dinas');
        $sheet1->setCellValue("A" . ($legendStartRow + 6), 'S');
        $sheet1->setCellValue("B" . ($legendStartRow + 6), '= Sakit');

        $sheet1->getStyle("A{$legendStartRow}:B" . ($legendStartRow + 6))->getFont()->setSize(8.5);
        $sheet1->getStyle("A{$legendStartRow}")->getFont()->setBold(true);

        // Tanda Tangan Tunggal Kasubbag TU di Kanan Bawah
        $sigCol = $hadirCol;
        $sheet1->setCellValue("{$sigCol}{$legendStartRow}", "Samarinda,    {$this->namaBulanIndo($carbonPeriod->month)} {$tahun}");
        $sheet1->setCellValue("{$sigCol}" . ($legendStartRow + 1), $kasubbagJabatan . ',');
        $sheet1->setCellValue("{$sigCol}" . ($legendStartRow + 5), $kasubbagNama);
        $sheet1->setCellValue("{$sigCol}" . ($legendStartRow + 6), "NIP. {$kasubbagNip}");

        $sheet1->getStyle("{$sigCol}" . ($legendStartRow + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet1->getStyle("{$sigCol}{$legendStartRow}:{$sigCol}" . ($legendStartRow + 6))->getFont()->setSize(9);

        // ==========================================
        // SHEET 2: DAFTAR NOMINATIF PEMBAYARAN UANG MAKAN
        // ==========================================
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Nominatif Uang Makan');

        $sheet2->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $sheet2->getPageSetup()->setFitToPage(true);
        $sheet2->getPageSetup()->setFitToWidth(1);
        $sheet2->getPageSetup()->setFitToHeight(0);

        // Judul Sheet 2
        $sheet2->setCellValue('A1', 'DAFTAR NOMINATIF PEMBAYARAN UANG MAKAN PEGAWAI');
        $sheet2->setCellValue('A2', 'BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR');
        $sheet2->setCellValue('A3', "PERIODE : {$namaBulanUpper} {$tahun}");
        $sheet2->getStyle('A1:A3')->getFont()->setBold(true)->setSize(11);

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
            $sheet2->setCellValue($cell, $text);
        }

        $sheet2->getColumnDimension('A')->setWidth(5);
        $sheet2->getColumnDimension('B')->setWidth(28);
        $sheet2->getColumnDimension('C')->setWidth(22);
        $sheet2->getColumnDimension('D')->setWidth(18);
        $sheet2->getColumnDimension('E')->setWidth(10);
        $sheet2->getColumnDimension('F')->setWidth(14);
        $sheet2->getColumnDimension('G')->setWidth(18);
        $sheet2->getColumnDimension('H')->setWidth(12);
        $sheet2->getColumnDimension('I')->setWidth(18);
        $sheet2->getColumnDimension('J')->setWidth(22);
        $sheet2->getColumnDimension('K')->setWidth(18);

        $sheet2->getStyle('A5:K5')->getFont()->setBold(true)->setSize(9);
        $sheet2->getStyle('A5:K5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet2->getStyle('A5:K5')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet2->getStyle('A5:K5')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF1F5F9');

        $nomRow = 6;
        foreach ($items as $idx => $item) {
            $sheet2->setCellValue("A{$nomRow}", $idx + 1);
            $sheet2->setCellValue("B{$nomRow}", $item['nama_lengkap']);
            $sheet2->setCellValueExplicit("C{$nomRow}", $item['nip'], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet2->setCellValue("D{$nomRow}", $item['golongan']);
            $sheet2->setCellValue("E{$nomRow}", $item['jml_hadir']);
            $sheet2->setCellValue("F{$nomRow}", $item['tarif_harian']);
            $sheet2->setCellValue("G{$nomRow}", "=E{$nomRow}*F{$nomRow}");
            $sheet2->setCellValue("H{$nomRow}", $item['persen_pph21'] . '%');
            $sheet2->setCellValue("I{$nomRow}", "=G{$nomRow}*({$item['persen_pph21']}/100)");
            $sheet2->setCellValue("J{$nomRow}", "=G{$nomRow}-I{$nomRow}");
            $sheet2->setCellValue("K{$nomRow}", ($idx + 1) . '. ..............');

            // Format angka
            $sheet2->getStyle("A{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle("C{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle("D{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle("E{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle("H{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet2->getStyle("F{$nomRow}:G{$nomRow}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet2->getStyle("I{$nomRow}:J{$nomRow}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet2->getStyle("A{$nomRow}:K{$nomRow}")->getFont()->setSize(9);
            $sheet2->getStyle("A{$nomRow}:K{$nomRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

            $nomRow++;
        }

        // Baris Total
        $sheet2->setCellValue("A{$nomRow}", 'TOTAL');
        $sheet2->mergeCells("A{$nomRow}:D{$nomRow}");
        $startDataRow = 6;
        $endDataRow = $nomRow - 1;
        $sheet2->setCellValue("E{$nomRow}", "=SUM(E{$startDataRow}:E{$endDataRow})");
        $sheet2->setCellValue("G{$nomRow}", "=SUM(G{$startDataRow}:G{$endDataRow})");
        $sheet2->setCellValue("I{$nomRow}", "=SUM(I{$startDataRow}:I{$endDataRow})");
        $sheet2->setCellValue("J{$nomRow}", "=SUM(J{$startDataRow}:J{$endDataRow})");

        $sheet2->getStyle("A{$nomRow}:K{$nomRow}")->getFont()->setBold(true)->setSize(9);
        $sheet2->getStyle("A{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet2->getStyle("E{$nomRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet2->getStyle("G{$nomRow}:J{$nomRow}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet2->getStyle("A{$nomRow}:K{$nomRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet2->getStyle("A{$nomRow}:K{$nomRow}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF1F5F9');

        // Tanda Tangan di Sheet 2
        $sigRow2 = $nomRow + 3;
        $sheet2->setCellValue("I{$sigRow2}", "Samarinda,    {$this->namaBulanIndo($carbonPeriod->month)} {$tahun}");
        $sheet2->setCellValue("I" . ($sigRow2 + 1), $kasubbagJabatan . ',');
        $sheet2->setCellValue("I" . ($sigRow2 + 5), $kasubbagNama);
        $sheet2->setCellValue("I" . ($sigRow2 + 6), "NIP. {$kasubbagNip}");

        $sheet2->getStyle("I" . ($sigRow2 + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet2->getStyle("I{$sigRow2}:I" . ($sigRow2 + 6))->getFont()->setSize(9);

        // Kembalikan ke active sheet 1
        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
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
