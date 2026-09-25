<?php

namespace App\Modules\Keuangan\Services;

use Exception;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class SpjDipaExcelService
{
    protected string $templatePath;

    public function __construct(?string $templatePath = null)
    {
        if ($templatePath && file_exists($templatePath)) {
            $this->templatePath = $templatePath;
        } elseif (file_exists(storage_path('app/templates/SPJDIPA.xlsx'))) {
            $this->templatePath = storage_path('app/templates/SPJDIPA.xlsx');
        } elseif (file_exists(base_path('SPJDIPA.xlsx'))) {
            $this->templatePath = base_path('SPJDIPA.xlsx');
        } else {
            throw new Exception('Template SPJDIPA.xlsx tidak ditemukan di storage/app/templates atau root proyek.');
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
        $pegawaiList = array_values($recipients);

        // Populate sheets
        $this->populateSptPanduan($spreadsheet, $data, $pegawaiList);
        $this->populateRinba($spreadsheet, $data, $pegawaiList);
        $this->populateNominatif($spreadsheet, $data, $pegawaiList);
        $this->populateSptb($spreadsheet, $data, $pegawaiList);
        $this->populateSpby($spreadsheet, $data, $pegawaiList);
        $this->populateDpRil($spreadsheet, $data, $pegawaiList);
        $this->populateSpd($spreadsheet, $data, $pegawaiList);

        // Remove Belakang (Visum) sheets as per design alignment
        foreach (['BELAKANG', 'BELAKANG (2)', 'BELAKANG (3)'] as $sheetName) {
            $sheet = $spreadsheet->getSheetByName($sheetName);
            if ($sheet !== null) {
                $sheetIndex = $spreadsheet->getIndex($sheet);
                $spreadsheet->removeSheetByIndex($sheetIndex);
            }
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'SPJ_DIPA_') . '.xlsx';
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

        // Each person takes 5 rows starting at row 6
        for ($i = 0; $i < count($pegawaiList); $i++) {
            $p = $pegawaiList[$i];
            $row = 6 + $i * 5;

            $ws->setCellValue('D' . $row, ($i + 1) . '.');
            $ws->setCellValue('E' . $row, 'Nama');
            $ws->setCellValue('F' . $row, ':');
            $ws->setCellValue('G' . $row, $p['name'] ?? '');

            $ws->setCellValue('E' . ($row + 1), 'NIP.');
            $ws->setCellValue('F' . ($row + 1), ':');
            $this->setCellText($ws, 'G' . ($row + 1), $this->cleanNip($p['nip'] ?? $p['id'] ?? ''));

            $ws->setCellValue('E' . ($row + 2), 'Pangkat/Gol.');
            $ws->setCellValue('F' . ($row + 2), ':');
            $ws->setCellValue('G' . ($row + 2), $p['rank'] ?? '-');

            $ws->setCellValue('E' . ($row + 3), 'Jabatan');
            $ws->setCellValue('F' . ($row + 3), ':');
            $ws->setCellValue('G' . ($row + 3), $p['position'] ?? 'Pelaksana');
        }

        // Tanggal ST & TTD Kepala
        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $stDate = $data['dipaConfig']['stDate'] ?? $this->formatIndoDate($startDate);
        $ws->setCellValue('H17', 'Samarinda,');
        $ws->setCellValue('I17', $stDate);
    }

    protected function populateNominatif(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('Nominatif PD(wajib diisi n ttd)');
        if (!$ws) return;

        $dipaConfig = $data['dipaConfig'] ?? [];
        $destination = $data['tujuan'] ?? $data['travel']['destination'] ?? '';
        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $endDate = $data['tanggal_selesai'] ?? $data['travel']['endDate'] ?? $startDate;

        // Nomor SPD (Single input without SPD. prefix)
        $nominatifSpd = trim($dipaConfig['nominatifSpd'] ?? '');
        if ($nominatifSpd === '') {
            $spdNo = trim($dipaConfig['nominatifSpdNo'] ?? '');
            $spdSuffix = trim($dipaConfig['nominatifSpdSuffix'] ?? '');
            if ($spdNo !== '' || $spdSuffix !== '') {
                $nominatifSpd = trim(($spdNo !== '' ? "{$spdNo} " : '') . $spdSuffix);
            }
        }

        if ($nominatifSpd !== '') {
            $ws->setCellValue('E2', "Nomor SPD : {$nominatifSpd}");
        } else {
            $ws->setCellValue('E2', "Nomor SPD :          ");
        }

        // Fill recipient rows
        $totalTransport = 0;
        $totalUangHarian = 0;
        $totalPenginapan = 0;
        $totalBiaya = 0;

        for ($i = 0; $i < count($pegawaiList); $i++) {
            $p = $pegawaiList[$i];
            $row = 8 + $i * 3;
            $dipa = $p['dipa'] ?? [];

            $uangHarianRate = (float) ($dipa['uangHarianRate'] ?? 360000);
            $uangHarianDays = (int) ($dipa['uangHarianDays'] ?? 3);
            $uangHarian = $uangHarianDays * $uangHarianRate;

            $transportItems = $this->getPersonTransportItems($dipa);
            $baseCol = $this->getRinbaBaseCol($i);
            $colLetterPlus4 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol + 4);

            $daratCells = [];
            $udaraCells = [];
            $tuSum = 0;
            $tpSum = 0;
            foreach ($transportItems as $k => $item) {
                $itemRow = 11 + $k;
                if ($itemRow > 13) break;
                $cat = $item['category'] ?? 'darat';
                $amt = (float) ($item['amount'] ?? 0);
                if ($cat === 'udara') {
                    $udaraCells[] = "Rinba!{$colLetterPlus4}{$itemRow}";
                    $tuSum += $amt;
                } else {
                    $daratCells[] = "Rinba!{$colLetterPlus4}{$itemRow}";
                    $tpSum += $amt;
                }
            }

            $extraList = $dipa['extraItems'] ?? [];
            $extraSum = array_reduce($extraList, fn($acc, $it) => $acc + (float) ($it['amount'] ?? 0), 0);
            $tpSum += $extraSum;
            $transportSubtotal = $tuSum + $tpSum;

            $hotelRate = (float) ($dipa['penginapanRate'] ?? 0);
            $hotelNights = (int) ($dipa['penginapanNights'] ?? 0);
            $penginapan = $hotelRate * $hotelNights;

            $rowTotal = $p['amount'] ?? ($uangHarian + $transportSubtotal + $penginapan);

            $totalTransport += $transportSubtotal;
            $totalUangHarian += $uangHarian;
            $totalPenginapan += $penginapan;
            $totalBiaya += $rowTotal;

            // Row 1
            $ws->setCellValue('A' . $row, $i + 1);
            $ws->setCellValue('B' . $row, $p['name'] ?? '');
            $ws->setCellValue('D' . $row, $destination);
            $ws->setCellValue('E' . $row, $this->formatIndoDate($startDate));

            if (!empty($udaraCells)) {
                $ws->setCellValue('H' . $row, '=' . implode('+', $udaraCells));
            } else {
                $ws->setCellValue('H' . $row, $tuSum > 0 ? $tuSum : 0);
            }

            if (!empty($daratCells)) {
                $ws->setCellValue('I' . $row, '=' . implode('+', $daratCells));
            } else {
                $ws->setCellValue('I' . $row, $tpSum > 0 ? $tpSum : 0);
            }

            $ws->setCellValue('J' . $row, "=H{$row}+I{$row}");
            $ws->setCellValue('K' . $row, $uangHarian);
            $ws->setCellValue('L' . $row, $penginapan);
            $ws->setCellValue('M' . $row, "=J{$row}+K{$row}+L{$row}");

            // Row 2: NIP & s/d
            $ws->setCellValue('B' . ($row + 1), 'NIP.');
            $this->setCellText($ws, 'C' . ($row + 1), $this->cleanNip($p['nip'] ?? $p['id'] ?? ''));

            // Row 3: ST & Tanggal selesai
            $sptNumber = $data['nomor_spt'] ?? $data['sptNumber'] ?? '';
            $formattedSpt = $sptNumber;
            if ($formattedSpt && !str_starts_with(trim($formattedSpt), 'ST.') && !str_starts_with(trim($formattedSpt), 'ST ')) {
                $formattedSpt = 'ST. ' . trim($formattedSpt);
            }
            $ws->setCellValue('B' . ($row + 2), $formattedSpt);
            $ws->setCellValue('E' . ($row + 2), $this->formatIndoDate($endDate));

            // Merge cells per recipient across 3 rows for clean alignment and borders
            $r1 = $row;
            $r2 = $row + 1;
            $r3 = $row + 2;

            $ws->mergeCells("A{$r1}:A{$r3}");
            $ws->mergeCells("B{$r1}:C{$r1}");
            $ws->mergeCells("B{$r3}:C{$r3}");
            $ws->mergeCells("D{$r1}:D{$r3}");
            $ws->mergeCells("E{$r1}:G{$r1}");
            $ws->mergeCells("E{$r2}:G{$r2}");
            $ws->setCellValue("E{$r2}", 's/d');
            $ws->mergeCells("E{$r3}:G{$r3}");

            $ws->mergeCells("H{$r1}:H{$r3}");
            $ws->mergeCells("I{$r1}:I{$r3}");
            $ws->mergeCells("J{$r1}:J{$r3}");
            $ws->mergeCells("K{$r1}:K{$r3}");
            $ws->mergeCells("L{$r1}:L{$r3}");
            $ws->mergeCells("M{$r1}:M{$r3}");
            $ws->mergeCells("N{$r1}:N{$r3}");

            $ws->getStyle("A{$r1}:N{$r3}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $ws->getStyle("A{$r1}:A{$r3}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("D{$r1}:D{$r3}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("E{$r1}:G{$r3}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("H{$r1}:M{$r3}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        }

        // Total Row (at 8 + count * 3)
        $totalRowIdx = 8 + count($pegawaiList) * 3;
        $ws->mergeCells("C{$totalRowIdx}:G{$totalRowIdx}");
        $ws->setCellValue('C' . $totalRowIdx, 'TOTAL BIAYA');
        $ws->getStyle("C{$totalRowIdx}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $ws->getStyle("C{$totalRowIdx}")->getFont()->setBold(true);

        $ws->setCellValue('J' . $totalRowIdx, $totalTransport);
        $ws->setCellValue('K' . $totalRowIdx, $totalUangHarian);
        $ws->setCellValue('L' . $totalRowIdx, $totalPenginapan);
        $ws->setCellValue('M' . $totalRowIdx, $totalBiaya);
        $ws->getStyle("J{$totalRowIdx}:M{$totalRowIdx}")->getFont()->setBold(true);

        // Complete full borders for the entire Nominatif table
        $ws->getStyle("A5:N{$totalRowIdx}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $ws->getStyle("A5:N7")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        // Clear existing template signature rows below total row to prevent duplicated PPK / NIP
        for ($r = $totalRowIdx + 1; $r <= $totalRowIdx + 20; $r++) {
            for ($c = 1; $c <= 14; $c++) {
                $coord = Coordinate::stringFromColumnIndex($c) . $r;
                $ws->setCellValue($coord, null);
                $ws->getStyle($coord)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_NONE);
            }
        }
        foreach ($ws->getMergeCells() as $range) {
            if (preg_match('/^[A-Z]+(\d+):[A-Z]+(\d+)$/', $range, $m)) {
                if ((int) $m[1] > $totalRowIdx) {
                    $ws->unmergeCells($range);
                }
            }
        }

        // Single clean signature block
        $sigDate = !empty($dipaConfig['nominatifDate']) ? $this->formatIndoDate($dipaConfig['nominatifDate']) : '';
        $ppk = $data['pejabat_ppk'] ?? [];
        $bendahara = $dipaConfig['bendahara'] ?? $data['pejabat_pdo'] ?? ['name' => 'SOERENDENG, SE', 'nik' => '19790721 200701 2 001'];

        $sigRow = $totalRowIdx + 4;
        $ws->setCellValue('K' . ($sigRow - 1), 'Samarinda, ' . $sigDate);
        $ws->setCellValue('C' . $sigRow, 'Pejabat Pembuat Komitmen,');
        $ws->setCellValue('K' . $sigRow, 'Bendahara Pengeluaran,');

        $ws->setCellValue('C' . ($sigRow + 4), $ppk['name'] ?? 'RUSMANTO, S.Hut');
        $ws->getStyle('C' . ($sigRow + 4))->getFont()->setBold(true)->setUnderline(true);
        $cleanPpkNip = $this->cleanNip($ppk['nik'] ?? '19810907 200012 1 004');
        $ws->setCellValue('C' . ($sigRow + 5), 'NIP. ' . $cleanPpkNip);

        $ws->setCellValue('K' . ($sigRow + 4), $bendahara['name'] ?? 'SOERENDENG, SE');
        $ws->getStyle('K' . ($sigRow + 4))->getFont()->setBold(true)->setUnderline(true);
        $cleanBendaharaNip = $this->cleanNip($bendahara['nik'] ?? '19790721 200701 2 001');
        $ws->setCellValue('K' . ($sigRow + 5), 'NIP. ' . $cleanBendaharaNip);
    }

    protected function populateSptb(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('SPTB');
        if (!$ws) return;

        $dipaConfig = $data['dipaConfig'] ?? [];
        $kodeSatker = $dipaConfig['kodeSatker'] ?? '143.04.16.693614';
        $namaSatker = $dipaConfig['namaSatker'] ?? 'Balai Konservasi Sumber Daya Alam Kalimantan Timur';
        $noSpDipa = $dipaConfig['noSpDipa'] ?? 'No. SP DIPA- 143.04.2.693614/2025 Tanggal 23 Desember 2025';
        $klasifikasiMak = $dipaConfig['klasifikasiMak'] ?? '7273.REA.003.524111';
        $makItems = $dipaConfig['makItems'] ?? [];
        $kodeMak = !empty($dipaConfig['kodeMak'])
            ? $dipaConfig['kodeMak']
            : (!empty($makItems) && is_array($makItems)
                ? ($makItems[0]['kodeMak'] ?? '051.E.770.771.772')
                : '051.E.770.771.772');
        $makDesc = !empty($dipaConfig['makDescription'])
            ? $dipaConfig['makDescription']
            : (!empty($makItems) && is_array($makItems)
                ? ($makItems[0]['description'] ?? 'Uang Harian, Penginapan, Transportasi')
                : 'Uang Harian, Penginapan, Transportasi');

        $ws->setCellValue('C2', ': ' . $kodeSatker);
        $ws->setCellValue('C3', ': ' . $namaSatker);
        $ws->setCellValue('C4', ': ' . $noSpDipa);
        $ws->setCellValue('C5', $klasifikasiMak);
        if (!empty($makItems) && is_array($makItems) && count($makItems) > 1) {
            $ws->setCellValue('C6', ': ' . ($makItems[0]['kodeMak'] ?? $kodeMak));
            $ws->setCellValue('D6', $makItems[0]['description'] ?? $makDesc);
            $ws->setCellValue('C7', ': ' . ($makItems[1]['kodeMak'] ?? ''));
            $ws->setCellValue('D7', $makItems[1]['description'] ?? '');
        } else {
            $ws->setCellValue('C6', ': ' . $kodeMak);
            $ws->setCellValue('D6', $makDesc);
            $ws->setCellValue('C7', null);
            $ws->setCellValue('D7', null);
        }

        // Penerima: Ketua + Dkk
        $primary = $pegawaiList[0] ?? ['name' => '-'];
        $penerima = ($primary['name'] ?? '-') . (count($pegawaiList) > 1 ? ', Dkk' : '');
        $ws->setCellValue('B12', $penerima);

        // Uraian SPTB
        $uraian = $dipaConfig['uraianSptjb'] ?? ($data['nama_kegiatan'] ?? 'Belanja Perjalanan Dinas Biasa');
        $ws->setCellValue('C12', $uraian);

        // Total
        $total = (float) ($data['total_anggaran'] ?? 0);
        $ws->setCellValue('G12', $total);
        $ws->setCellValue('G13', "=SUM(G12:G12)");

        // Bukti Tanggal & Nomor
        $buktiDate = !empty($dipaConfig['sptjbDate']) ? $this->formatIndoDate($dipaConfig['sptjbDate']) : '';
        $ws->setCellValue('D12', $buktiDate);

        $romanMonth = $this->getRomanMonth();
        $currYear = date('Y');
        $defaultBukti = "/{$romanMonth}/{$currYear}";
        $buktiSptjb = isset($dipaConfig['buktiSptjb']) && $dipaConfig['buktiSptjb'] !== ''
            ? $dipaConfig['buktiSptjb']
            : $defaultBukti;
        $ws->setCellValue('F12', $buktiSptjb);

        // Signatures
        $sigDate = !empty($dipaConfig['sptjbDate']) ? $this->formatIndoDate($dipaConfig['sptjbDate']) : '';
        $ppk = $data['pejabat_ppk'] ?? [];
        $bendahara = $dipaConfig['bendahara'] ?? $data['pejabat_pdo'] ?? ['name' => 'SOERENDENG, SE', 'nik' => '19790721 200701 2 001'];

        $ws->setCellValue('B22', 'Samarinda, ' . $sigDate);
        $ws->setCellValue('B27', $ppk['name'] ?? 'RUSMANTO, S.Hut');
        $ws->setCellValue('B28', 'NIP. ' . $this->cleanNip($ppk['nik'] ?? '19810907 200012 1 004'));

        $ws->setCellValue('F27', $bendahara['name'] ?? 'SOERENDENG, SE');
        $ws->setCellValue('F28', 'NIP. ' . $this->cleanNip($bendahara['nik'] ?? '19790721 200701 2 001'));

        // Clear leftover template values & apply clean thin borders to table
        $ws->setCellValue('J12', null);
        $ws->setCellValue('K12', null);
        $ws->getStyle('A10:I13')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
    }

    protected function populateSpby(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('SPBy');
        if (!$ws) return;

        $dipaConfig = $data['dipaConfig'] ?? [];
        $spbNo = $data['spbNumber']['no'] ?? '';
        $spbSuffix = $data['spbNumber']['suffix'] ?? '';
        $romanMonth = $this->getRomanMonth();
        $year = date('Y');

        if (!empty($dipaConfig['spbyNo']) || !empty($dipaConfig['spbyMonth']) || !empty($dipaConfig['spbyYear'])) {
            $no = trim($dipaConfig['spbyNo'] ?? '');
            $month = !empty($dipaConfig['spbyMonth']) ? $dipaConfig['spbyMonth'] : $romanMonth;
            $yr = !empty($dipaConfig['spbyYear']) ? $dipaConfig['spbyYear'] : $year;
            $fullSpby = $no ? ": {$no} / {$month} / {$yr}" : ":      /  {$month}  / {$yr}";
        } elseif (!empty($dipaConfig['noSpby'])) {
            $fullSpby = ': ' . $dipaConfig['noSpby'];
        } else {
            $fullSpby = ":      /  {$romanMonth}  / {$year}";
        }
        $ws->setCellValue('I6', $fullSpby);

        $sigDate = !empty($dipaConfig['spbyDate']) ? $this->formatIndoDate($dipaConfig['spbyDate']) : '';
        $ws->setCellValue('E6', $sigDate ? (': ' . $sigDate) : ':                   ');

        // Total
        $total = (float) ($data['total_anggaran'] ?? 0);
        $ws->setCellValue('C11', $total);
        $ws->setCellValue('C12', $this->formatTerbilang((int) $total));

        // Kepada & Untuk Pembayaran
        $primary = $pegawaiList[0] ?? ['name' => '-'];
        $penerima = ($primary['name'] ?? '-') . (count($pegawaiList) > 1 ? ', Dkk' : '');
        $uraian = !empty(trim((string)($dipaConfig['uraianSptjb'] ?? '')))
            ? trim((string)$dipaConfig['uraianSptjb'])
            : $this->buildDefaultSptjbUraian($data, count($pegawaiList));
        $ws->setCellValue('E17', $uraian);
        $ws->getStyle('E17:L17')->getAlignment()->setWrapText(true);

        // Atas Dasar: Kuitansi & Nota Bukti
        $ws->setCellValue('G20', $dipaConfig['spbyKuitansi'] ?? null);
        $ws->setCellValue('G21', $dipaConfig['spbyNota'] ?? null);

        // Beban MAK
        $makItems = $dipaConfig['makItems'] ?? [];
        $kodeMak = !empty($dipaConfig['kodeMak'])
            ? $dipaConfig['kodeMak']
            : (!empty($makItems) && is_array($makItems)
                ? ($makItems[0]['kodeMak'] ?? '051.E.770.771.772')
                : '051.E.770.771.772');

        $ws->setCellValue('E25', $dipaConfig['klasifikasiMak'] ?? '7273.REA.003.524111');
        $ws->setCellValue('E26', $kodeMak);

        // Signatures
        $ppk = $data['pejabat_ppk'] ?? [];
        $bendahara = $dipaConfig['bendahara'] ?? $data['pejabat_pdo'] ?? ['name' => 'SOERENDENG, SE', 'nik' => '19790721 200701 2 001'];
        $city = !empty($dipaConfig['cityDateText']) ? rtrim($dipaConfig['cityDateText'], " ,") . ',' : 'Samarinda,';
        $ws->setCellValue('J29', $city);
        if (!empty($sigDate)) {
            $ws->setCellValue('A30', 'Tanggal ' . $sigDate);
            $ws->setCellValue('G30', $sigDate);
            $ws->setCellValue('J30', $sigDate);
        } else {
            $ws->setCellValue('A30', 'Tanggal');
            $ws->setCellValue('G30', '');
            $ws->setCellValue('J30', '');
        }
        $ws->setCellValue('A37', $bendahara['name'] ?? 'SOERENDENG, SE');
        $ws->setCellValue('A38', 'NIP. ' . $this->cleanNip($bendahara['nik'] ?? '19790721 200701 2 001'));

        $ws->setCellValue('G37', $primary['name'] ?? '');
        $ws->setCellValue('H38', 'NIP. ' . $this->cleanNip($primary['nip'] ?? $primary['id'] ?? ''));

        $ws->setCellValue('J37', $ppk['name'] ?? 'RUSMANTO, S.Hut');
        $ws->setCellValue('J38', 'NIP. ' . $this->cleanNip($ppk['nik'] ?? '19810907 200012 1 004'));

        // 4 Box Borders matching Web Preview
        $boxes = ['A1:L7', 'A8:L13', 'A14:L27', 'A28:L38'];
        foreach ($boxes as $box) {
            $ws->getStyle($box)->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        }
    }

    protected function populateRinba(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('Rinba');
        if (!$ws) return;

        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $dipaConfig = $data['dipaConfig'] ?? [];
        $sigDate = $dipaConfig['spdDate'] ?? $this->formatIndoDate($startDate);
        $spdNo = $data['spdNumber']['no'] ?? '';
        $spdSuffix = $data['spdNumber']['suffix'] ?? '';
        $fullSpd = $spdNo ? "SPD. {$spdNo}{$spdSuffix}" : '';

        // Column offsets: Person 0 = Col A (1), Person 1 = Col J (10), Person 2 = Col S (19), Person 3 = Col AB (28)
        $offsets = [0 => 1, 1 => 10, 2 => 19, 3 => 28];

        for ($i = 0; $i < count($pegawaiList); $i++) {
            $p = $pegawaiList[$i];
            $baseCol = $this->getRinbaBaseCol($i);
            $dipa = $p['dipa'] ?? [];

            // Convert baseCol to letter
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol);
            $colLetterPlus1 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol + 1);
            $colLetterPlus2 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol + 2);
            $colLetterPlus3 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol + 3);
            $colLetterPlus4 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol + 4);
            $colLetterPlus6 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol + 6);
            $colLetterPlus7 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol + 7);
            $colLetterPlus8 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($baseCol + 8);

            // SPD info
            if ($fullSpd) {
                $ws->setCellValue($colLetterPlus4 . '3', $fullSpd);
            }
            $ws->setCellValue($colLetterPlus4 . '4', $sigDate);

            // Clear item rows 11 to 19 completely first
            for ($r = 11; $r <= 19; $r++) {
                $ws->setCellValue($colLetter . $r, null);
                $ws->setCellValue($colLetterPlus1 . $r, null);
                $ws->setCellValue($colLetterPlus3 . $r, null);
                $ws->setCellValue($colLetterPlus4 . $r, null);
                $ws->setCellValue($colLetterPlus7 . $r, null);
                $ws->removeComment($colLetterPlus4 . $r);
                $ws->removeComment($colLetterPlus7 . $r);
            }

            // 1. Uang Harian
            $days = (int) ($dipa['uangHarianDays'] ?? 3);
            $rate = (float) ($dipa['uangHarianRate'] ?? 360000);
            $this->setCellText($ws, $colLetter . '8', '1.');
            $ws->setCellValue($colLetterPlus1 . '8', 'Uang Harian :');
            $ws->setCellValue($colLetterPlus1 . '9', "{$days} x Rp." . number_format($rate, 0, ',', '.') . ',-');
            $ws->setCellValue($colLetterPlus3 . '9', 'Rp.');
            $ws->setCellValue($colLetterPlus4 . '9', $days * $rate);
            $ws->setCellValue($colLetterPlus7 . '9', '-');

            $currentNo = 2;
            $currentRow = 11;

            // 2. Transportasi (only if participant has transport items)
            $transportItems = $this->getPersonTransportItems($dipa);
            $transportSum = 0;

            if (!empty($transportItems)) {
                $this->setCellText($ws, $colLetter . $currentRow, "{$currentNo}.");
                $ws->setCellValue($colLetterPlus1 . $currentRow, 'Transportasi');
                $currentNo++;

                foreach ($transportItems as $k => $item) {
                    $itemRow = $currentRow + $k;
                    if ($itemRow > 13) break;
                    $amt = (float) ($item['amount'] ?? 0);
                    $transportSum += $amt;
                    $ws->setCellValue($colLetterPlus3 . $itemRow, 'Rp.');
                    $ws->setCellValue($colLetterPlus4 . $itemRow, $amt);
                    $ws->setCellValue($colLetterPlus7 . $itemRow, $item['label'] ?? '');
                }

                $currentRow = 14;
            }

            $extraList = $dipa['extraItems'] ?? [];
            $extraSum = array_reduce($extraList, fn($acc, $it) => $acc + (float) ($it['amount'] ?? 0), 0);
            $transportSum += $extraSum;

            // 3. Penginapan (if hotelSubtotal > 0)
            $hotelRate = (float) ($dipa['penginapanRate'] ?? 0);
            $hotelNights = (int) ($dipa['penginapanNights'] ?? 0);
            $hotelSubtotal = $hotelRate * $hotelNights;
            $isDpRil = ($dipa['dpRilEnabled'] ?? true) !== false && $hotelSubtotal > 0;

            if ($hotelSubtotal > 0) {
                $this->setCellText($ws, $colLetter . $currentRow, "{$currentNo}.");
                $ws->setCellValue($colLetterPlus1 . $currentRow, 'Penginapan');
                $ws->setCellValue($colLetterPlus3 . $currentRow, 'Rp.');
                $ws->setCellValue($colLetterPlus4 . $currentRow, $hotelSubtotal);
                $ws->setCellValue($colLetterPlus7 . $currentRow, $isDpRil ? 'DPRill' : '-');
                $currentNo++;
                $currentRow++;
            }

            // Extra items if any
            foreach ($extraList as $eIdx => $eItem) {
                if ($currentRow > 19) break;
                $this->setCellText($ws, $colLetter . $currentRow, "{$currentNo}.");
                $ws->setCellValue($colLetterPlus1 . $currentRow, $eItem['label'] ?? '');
                $ws->setCellValue($colLetterPlus3 . $currentRow, 'Rp.');
                $ws->setCellValue($colLetterPlus4 . $currentRow, (float) ($eItem['amount'] ?? 0));
                $ws->setCellValue($colLetterPlus7 . $currentRow, '-');
                $currentNo++;
                $currentRow++;
            }

            $ws->getStyle("{$colLetter}8:{$colLetter}19")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

            // Total
            $personTotal = ($days * $rate) + $transportSum + $hotelSubtotal;
            $ws->setCellValue($colLetterPlus3 . '20', 'Rp.');
            $ws->setCellValue($colLetterPlus4 . '20', $personTotal);

            // Terbilang
            $colTerbilang = Coordinate::stringFromColumnIndex($baseCol + 2);
            $ws->setCellValue($colTerbilang . '21', $this->formatTerbilang((int) $personTotal));

            $ws->setCellValue(Coordinate::stringFromColumnIndex($baseCol + 1) . '27', $personTotal);
            $ws->setCellValue($colLetterPlus7 . '27', $personTotal);
            $ws->setCellValue($colLetterPlus4 . '39', $personTotal);

            $colRampungTerbilang = Coordinate::stringFromColumnIndex($baseCol + 6);
            $ws->setCellValue($colRampungTerbilang . '39', $this->formatTerbilang((int) $personTotal));
            $ws->setCellValue($colRampungTerbilang . '40', $this->formatTerbilang((int) $personTotal));

            // Clean borders for table: NO horizontal gridlines on empty rows!
            // First, reset horizontal borders on body rows 7 to 19
            for ($r = 7; $r <= 19; $r++) {
                $ws->getStyle("{$colLetter}{$r}:{$colLetterPlus8}{$r}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_NONE);
                $ws->getStyle("{$colLetter}{$r}:{$colLetterPlus8}{$r}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            }
            // Vertical column dividers for body rows 6 to 20
            $ws->getStyle("{$colLetter}6:{$colLetter}20")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetter}6:{$colLetter}20")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetterPlus2}6:{$colLetterPlus2}20")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetterPlus6}6:{$colLetterPlus6}20")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetterPlus8}6:{$colLetterPlus8}20")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);

            // Header (row 6) and Summary (row 20, 21) borders
            $ws->getStyle("{$colLetter}6:{$colLetterPlus8}6")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetter}6:{$colLetterPlus8}6")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

            $ws->getStyle("{$colLetter}20:{$colLetterPlus8}20")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetter}20:{$colLetterPlus8}20")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

            $ws->getStyle("{$colLetter}21:{$colLetterPlus8}21")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetter}21:{$colLetterPlus8}21")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetter}21:{$colLetterPlus8}21")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colLetter}21:{$colLetterPlus8}21")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);

            // Signatures
            $ws->setCellValue($colLetterPlus7 . '34', $p['name'] ?? '');
            $colNip = Coordinate::stringFromColumnIndex($baseCol + 8);
            $this->setCellText($ws, $colNip . '35', $this->cleanNip($p['nip'] ?? $p['id'] ?? ''));

            // Document Outer Border (Col A to I, Rows 1 to 49)
            $ws->getStyle("{$colLetter}1:{$colLetterPlus8}49")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        }
    }

    protected function populateDpRil(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('DP Ril');
        if (!$ws) return;

        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $endDate = $data['tanggal_selesai'] ?? $data['travel']['endDate'] ?? $startDate;
        $destination = $data['tujuan'] ?? $data['travel']['destination'] ?? 'Provinsi Kalimantan Timur';

        $dipaConfig = $data['dipaConfig'] ?? [];
        $spdDate = !empty($dipaConfig['spdDate']) ? $this->formatIndoDate($dipaConfig['spdDate']) : $this->formatIndoDate($startDate);
        $dpRilDate = !empty($dipaConfig['dpRilDate']) ? $this->formatIndoDate($dipaConfig['dpRilDate']) : '';
        $spdNo = $data['spdNumber']['no'] ?? '';
        $spdSuffix = $data['spdNumber']['suffix'] ?? '';
        $fullSpd = $spdNo ? "SPD. {$spdNo}{$spdSuffix}" : 'SPD.                        /K.18-TU/PROG/08/2026';
        $ppk = $data['pejabat_ppk'] ?? [];

        // Offsets: Person 0 = Col A (1), Person 1 = Col I (9), Person 2 = Col Q (17)...
        for ($i = 0; $i < count($pegawaiList); $i++) {
            $p = $pegawaiList[$i];
            $dipa = $p['dipa'] ?? [];
            $baseCol = 1 + $i * 8;

            $colName = Coordinate::stringFromColumnIndex($baseCol + 4);
            $colNip = Coordinate::stringFromColumnIndex($baseCol + 4);
            $colPos = Coordinate::stringFromColumnIndex($baseCol + 4);
            $colUraian = Coordinate::stringFromColumnIndex($baseCol + 2);
            $colAmount = Coordinate::stringFromColumnIndex($baseCol + 6);

            $ws->setCellValue($colName . '5', $p['name'] ?? '');
            $this->setCellText($ws, $colNip . '6', $this->cleanNip($p['nip'] ?? $p['id'] ?? ''));
            $ws->setCellValue($colPos . '7', $p['position'] ?? 'Pelaksana SPD');

            // Dasar SPD
            $dasarText = "Berdasarkan Surat Perjalanan Dinas (SPD) Nomor : {$fullSpd} tanggal {$spdDate}, dengan ini kami menyatakan dengan sesungguhnya bahwa :";
            $ws->setCellValue(Coordinate::stringFromColumnIndex($baseCol) . '9', $dasarText);

            // Hotel 30%
            $nights = (int) ($dipa['penginapanNights'] ?? 0);
            if ($nights <= 0) {
                $nights = max(1, (int) round((strtotime($endDate) - strtotime($startDate)) / 86400));
            }

            $rate = (float) ($dipa['penginapanRate'] ?? 0);
            if ($rate <= 0) {
                $stdRate = (float) ($dipa['dpRilHotelStandardRate'] ?? 0);
                if ($stdRate <= 0) {
                    $stdRate = $this->getSbmStandardRate($destination, $p['rank'] ?? '');
                }
                $rate = round(0.3 * $stdRate);
            }

            $hotelSubtotal = $rate * $nights;
            $prov = $dipa['dpRilProvince'] ?? ($destination ?: 'Provinsi Kalimantan Timur');

            $terbilangMap = [1 => 'satu', 2 => 'dua', 3 => 'tiga', 4 => 'empat', 5 => 'lima', 6 => 'enam', 7 => 'tujuh', 8 => 'delapan', 9 => 'sembilan', 10 => 'sepuluh'];
            $terbilangMlm = $terbilangMap[$nights] ?? "{$nights}";

            $ws->setCellValue($colUraian . '15', "Biaya penginapan {$nights} ({$terbilangMlm}) malam x 30 % tarif hotel di");
            $ws->setCellValue($colUraian . '16', $prov);
            $ws->setCellValue($colAmount . '15', $hotelSubtotal);

            // Extra DP Ril items if any
            $extraRiil = $dipa['dpRilItems'] ?? [];
            for ($k = 0; $k < 5; $k++) {
                $rRow = 17 + $k;
                if ($rRow > 20) break;
                if (isset($extraRiil[$k])) {
                    $ws->setCellValue($colUraian . $rRow, $extraRiil[$k]['label'] ?? '');
                    $ws->setCellValue($colAmount . $rRow, (float) ($extraRiil[$k]['amount'] ?? 0));
                }
            }

            $ws->setCellValue($colAmount . '21', "=SUM({$colAmount}15:{$colAmount}20)");

            // Clean borders for DP Ril table: NO horizontal gridlines on empty rows!
            $startTableCol = Coordinate::stringFromColumnIndex($baseCol + 1); // Col B or J
            $endTableCol = Coordinate::stringFromColumnIndex($baseCol + 6);   // Col G or O
            $colNo = $startTableCol;
            $colUraianEnd = Coordinate::stringFromColumnIndex($baseCol + 4);
            $colJmlEnd = $endTableCol;

            for ($r = 14; $r <= 20; $r++) {
                $ws->getStyle("{$startTableCol}{$r}:{$endTableCol}{$r}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_NONE);
                $ws->getStyle("{$startTableCol}{$r}:{$endTableCol}{$r}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            }
            // Vertical column dividers for body rows 13 to 21
            $ws->getStyle("{$startTableCol}13:{$startTableCol}21")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colNo}13:{$colNo}21")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colUraianEnd}13:{$colUraianEnd}21")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$colJmlEnd}13:{$colJmlEnd}21")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);

            // Header (row 13) and Total (row 21) borders
            $ws->getStyle("{$startTableCol}13:{$endTableCol}13")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$startTableCol}13:{$endTableCol}13")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

            $ws->getStyle("{$startTableCol}21:{$endTableCol}21")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$startTableCol}21:{$endTableCol}21")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

            // Document Outer Border (Col A to H, Rows 1 to 36)
            $cDocStart = Coordinate::stringFromColumnIndex($baseCol);
            $cDocEnd = Coordinate::stringFromColumnIndex($baseCol + 7);
            $ws->getStyle("{$cDocStart}1:{$cDocEnd}36")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);

            // Signatures
            $colSigDate = Coordinate::stringFromColumnIndex($baseCol + 5);
            $colSigPpk = Coordinate::stringFromColumnIndex($baseCol + 2);

            $ws->setCellValue($colSigDate . '28', 'Samarinda, ' . $dpRilDate);
            $ws->setCellValue($colSigPpk . '34', $ppk['name'] ?? 'RUSMANTO, S.Hut');
            $cleanPpkNip = $this->cleanNip($ppk['nik'] ?? '19810907 200012 1 004');
            $ws->setCellValue($colSigPpk . '35', 'NIP. ' . $cleanPpkNip);

            $ws->setCellValue($colSigDate . '34', $p['name'] ?? '');
            $this->setCellText($ws, $colAmount . '35', $this->cleanNip($p['nip'] ?? $p['id'] ?? ''));
        }
    }

    protected function populateSpd(Spreadsheet $spreadsheet, array $data, array $pegawaiList): void
    {
        $ws = $spreadsheet->getSheetByName('spd');
        if (!$ws) return;

        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $endDate = $data['tanggal_selesai'] ?? $data['travel']['endDate'] ?? $startDate;
        $origin = $data['asal'] ?? $data['travel']['origin'] ?? 'Samarinda';
        $destination = $data['tujuan'] ?? $data['travel']['destination'] ?? '';
        $rawMaksud = $data['dipaConfig']['maksudTujuan'] ?? ($data['nama_kegiatan'] ?? '');
        $maksud = $this->formatMaksudSpd($rawMaksud, $origin, $destination);
        $transportMode = $data['dipaConfig']['transportMode'] ?? 'Kendaraan Dinas';
        $dipaConfig = $data['dipaConfig'] ?? [];
        $sigDate = $dipaConfig['spdDate'] ?? $this->formatIndoDate($startDate);
        $ppk = $data['pejabat_ppk'] ?? [];

        $spdNo = $data['spdNumber']['no'] ?? '';
        $spdSuffix = $data['spdNumber']['suffix'] ?? '';

        $offsets = [0 => 1, 1 => 10, 2 => 19, 3 => 28];

        for ($i = 0; $i < count($pegawaiList); $i++) {
            $p = $pegawaiList[$i];
            $baseCol = $offsets[$i] ?? (1 + $i * 9);

            $cA = Coordinate::stringFromColumnIndex($baseCol);     // Col 1 (No)
            $cB = Coordinate::stringFromColumnIndex($baseCol + 1); // Col 2 (Label start)
            $cD = Coordinate::stringFromColumnIndex($baseCol + 3); // Col 2 (Label end)
            $cE = Coordinate::stringFromColumnIndex($baseCol + 4); // Col 3 (Value start)
            $cF = Coordinate::stringFromColumnIndex($baseCol + 5);
            $cG = Coordinate::stringFromColumnIndex($baseCol + 6);
            $cH = Coordinate::stringFromColumnIndex($baseCol + 7);
            $cI = Coordinate::stringFromColumnIndex($baseCol + 8); // Col 3 (Value end)

            // Nomor SPD
            if ($spdNo) {
                $ws->setCellValue($cE . '10', "/{$spdNo}{$spdSuffix}");
            }

            // Butir 2: Nama & NIP
            $ws->setCellValue($cE . '13', $p['name'] ?? '');
            $this->setCellText($ws, $cE . '14', $this->cleanNip($p['nip'] ?? $p['id'] ?? ''));

            // Butir 3: Pangkat & Jabatan
            $ws->setCellValue($cF . '15', $p['rank'] ?? '-');
            $ws->setCellValue($cF . '16', $p['position'] ?? 'Pelaksana');

            // Butir 4: Maksud
            $ws->setCellValue($cE . '18', $maksud);
            $ws->getStyle("{$cE}18:{$cI}18")->getAlignment()->setWrapText(true);

            // Butir 5: Angkutan
            $ws->setCellValue($cE . '19', $transportMode);

            // Butir 6: Tempat
            $ws->setCellValue($cF . '20', $origin);
            $ws->setCellValue($cF . '21', $destination);

            // Butir 7: Tanggal
            $days = max(1, (int) round((strtotime($endDate) - strtotime($startDate)) / 86400) + 1);
            $ws->setCellValue($cF . '22', $days);
            $ws->setCellValue($cF . '23', $this->formatIndoDate($startDate));
            $ws->setCellValue($cF . '24', $this->formatIndoDate($endDate));

            // Signatures: Dikeluarkan di : Samarinda, Pada tanggal : sigDate
            $ws->setCellValue($cF . '38', 'Dikeluarkan di');
            $ws->setCellValue($cG . '38', ':');
            $ws->setCellValue($cH . '38', $origin ?: 'Samarinda');

            $ws->setCellValue($cF . '39', 'Pada tanggal');
            $ws->setCellValue($cG . '39', ':');
            $ws->setCellValue($cH . '39', $sigDate);

            $ws->setCellValue($cF . '41', 'Pejabat Pembuat Komitmen,');
            $ws->setCellValue($cE . '44', null);
            $ws->setCellValue($cE . '45', null);
            $ws->setCellValue($cF . '45', $ppk['name'] ?? 'RUSMANTO, S.Hut');
            $ws->setCellValue($cF . '46', 'NIP. ' . $this->cleanNip($ppk['nik'] ?? '19810907 200012 1 004'));

            // Complete Table Borders (Rows 12 to 36)
            // Vertical column dividers
            $ws->getStyle("{$cA}12:{$cA}36")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cA}12:{$cA}36")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cB}12:{$cB}36")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cD}12:{$cD}36")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cE}12:{$cE}36")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cI}12:{$cI}36")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);

            // Horizontal borders for all 10 points
            // Top of table
            $ws->getStyle("{$cA}12:{$cI}12")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
            // Point 1 (Row 12)
            $ws->getStyle("{$cA}12:{$cI}12")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 2 (Rows 13-14)
            $ws->getStyle("{$cA}13:{$cI}13")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}14:{$cI}14")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 3 (Rows 15-17)
            $ws->getStyle("{$cA}15:{$cI}15")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}16:{$cI}16")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}17:{$cI}17")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 4 (Row 18)
            $ws->getStyle("{$cA}18:{$cI}18")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 5 (Row 19)
            $ws->getStyle("{$cA}19:{$cI}19")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 6 (Rows 20-21)
            $ws->getStyle("{$cA}20:{$cI}20")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}21:{$cI}21")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 7 (Rows 22-25)
            $ws->getStyle("{$cA}22:{$cI}22")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}23:{$cI}23")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}24:{$cI}24")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}25:{$cI}25")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 8 (Rows 26-31)
            $ws->getStyle("{$cA}26:{$cI}26")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cD}26:{$cD}31")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cE}26:{$cE}31")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cF}26:{$cF}31")->getBorders()->getRight()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cG}26:{$cG}31")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_THIN);
            for ($r = 27; $r <= 30; $r++) {
                $ws->getStyle("{$cA}{$r}:{$cI}{$r}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            }
            $ws->getStyle("{$cA}31:{$cI}31")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 9 (Rows 32-34)
            $ws->getStyle("{$cA}32:{$cI}32")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            $ws->getStyle("{$cA}33:{$cI}33")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}34:{$cI}34")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);
            // Point 10 (Rows 35-36)
            $ws->getStyle("{$cA}35:{$cI}35")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_NONE);
            $ws->getStyle("{$cA}36:{$cI}36")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

            // Document Outer Border (Col A to I, Rows 1 to 46)
            $ws->getStyle("{$cA}1:{$cI}46")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        }
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
        return $clean !== '' ? $clean : (string) $nip;
    }

    protected function formatTextValue($val): string
    {
        if ($val === null || $val === '') {
            return '';
        }
        $str = trim((string) $val);
        if (str_starts_with($str, "'")) {
            $str = substr($str, 1);
        }
        return $str;
    }

    protected function setCellText($ws, string $coord, ?string $value): void
    {
        $val = $this->formatTextValue($value);
        $ws->setCellValueExplicit($coord, $val, DataType::TYPE_STRING);
        $ws->getStyle($coord)->setQuotePrefix(true);
        $ws->getStyle($coord)->getNumberFormat()->setFormatCode('@');
    }

    protected function terbilang(int $number): string
    {
        $words = [
            '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
            'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
        ];

        if ($number < 12) {
            return $words[$number];
        }
        if ($number < 20) {
            return $this->terbilang($number - 10) . ' Belas';
        }
        if ($number < 100) {
            $rem = $number % 10;
            return $this->terbilang((int) ($number / 10)) . ' Puluh' . ($rem > 0 ? ' ' . $this->terbilang($rem) : '');
        }
        if ($number < 200) {
            return 'Seratus' . ($number - 100 > 0 ? ' ' . $this->terbilang($number - 100) : '');
        }
        if ($number < 1000) {
            $rem = $number % 100;
            return $this->terbilang((int) ($number / 100)) . ' Ratus' . ($rem > 0 ? ' ' . $this->terbilang($rem) : '');
        }
        if ($number < 2000) {
            return 'Seribu' . ($number - 1000 > 0 ? ' ' . $this->terbilang($number - 1000) : '');
        }
        if ($number < 1000000) {
            $rem = $number % 1000;
            return $this->terbilang((int) ($number / 1000)) . ' Ribu' . ($rem > 0 ? ' ' . $this->terbilang($rem) : '');
        }
        if ($number < 1000000000) {
            $rem = $number % 1000000;
            return $this->terbilang((int) ($number / 1000000)) . ' Juta' . ($rem > 0 ? ' ' . $this->terbilang($rem) : '');
        }
        $rem = $number % 1000000000;
        return $this->terbilang((int) ($number / 1000000000)) . ' Milyar' . ($rem > 0 ? ' ' . $this->terbilang($rem) : '');
    }

    protected function formatTerbilang(int $number): string
    {
        if ($number <= 0) return 'Nol Rupiah';
        return trim($this->terbilang($number)) . ' Rupiah';
    }

    protected function getSbmStandardRate(string $destination, ?string $rank): float
    {
        $dest = strtolower($destination);
        $isGol4 = false;
        if ($rank) {
            $uRank = strtoupper($rank);
            $isGol4 = str_contains($uRank, 'IV') || str_contains($uRank, 'PEMBINA') || str_contains($uRank, 'GOLONGAN 4') || str_contains($uRank, 'GOL 4') || str_contains($uRank, 'GOL. 4');
        }

        if (str_contains($dest, 'jakarta')) {
            return $isGol4 ? 992000 : 730000;
        } elseif (str_contains($dest, 'jabar') || str_contains($dest, 'jawa barat') || str_contains($dest, 'bandung') || str_contains($dest, 'bogor')) {
            return $isGol4 ? 1201000 : 570000;
        } else {
            return $isGol4 ? 1507000 : 804000;
        }
    }

    protected function getRomanMonth(?string $date = null): string
    {
        $time = $date ? strtotime($date) : time();
        $m = (int) date('n', $time);
        $romanMonths = [
            1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV',
            5 => 'V', 6 => 'VI', 7 => 'VII', 8 => 'VIII',
            9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII'
        ];
        return $romanMonths[$m] ?? 'IX';
    }

    protected function getRinbaBaseCol(int $personIndex): int
    {
        $offsets = [0 => 1, 1 => 10, 2 => 19, 3 => 28];
        return $offsets[$personIndex] ?? (1 + $personIndex * 9);
    }

    protected function getPersonTransportItems(array $dipa): array
    {
        $items = $dipa['transportItems'] ?? null;
        if (!is_array($items)) {
            $items = [];
            $tu = (float) ($dipa['transportUdara'] ?? 0);
            $tp = (float) ($dipa['taksiPp'] ?? 0);
            if ($tp > 0) {
                $items[] = [
                    'category' => 'darat',
                    'label' => 'Taksi Bandara / Stasiun PP',
                    'amount' => $tp,
                ];
            }
            if ($tu > 0) {
                $items[] = [
                    'category' => 'udara',
                    'label' => 'Transportasi Udara PP',
                    'amount' => $tu,
                ];
            }
        }

        $sorted = array_values($items);
        usort($sorted, function ($a, $b) {
            $catA = ($a['category'] ?? 'darat') === 'udara' ? 1 : 0;
            $catB = ($b['category'] ?? 'darat') === 'udara' ? 1 : 0;
            return $catA <=> $catB;
        });

        return $sorted;
    }

    protected function formatMaksudSpd(?string $raw, string $origin = '', string $destination = ''): string
    {
        if (empty(trim((string)$raw))) {
            if (!empty($origin) && !empty($destination)) {
                return "Perjalanan Dinas dari {$origin} ke {$destination}";
            }
            return "-";
        }

        $text = trim($raw);

        // Stop words regex to strip extra instructions/budget notes
        $stopWordRegex = '/[,;.]?\s*(?:\r?\n\s*)*\b(selama\s+\d+|selama\s+\(|selama\b|terhitung\s+mulai|membuat\s+laporan|segala\s+biaya)\b/i';
        if (preg_match($stopWordRegex, $text, $matches, PREG_OFFSET_CAPTURE)) {
            $text = substr($text, 0, $matches[0][1]);
        }

        // Remove leading "Melaksanakan " if present
        $text = preg_replace('/^melaksanakan\s+/i', '', $text);

        // Capitalize "Perjalanan Dinas" if at the start
        $text = preg_replace('/^perjalanan\s+dinas/i', 'Perjalanan Dinas', $text);

        // If text doesn't contain "Perjalanan Dinas" and we have travel info
        if (stripos($text, 'perjalanan dinas') === false && !empty($origin) && !empty($destination)) {
            $text = "Perjalanan Dinas dari {$origin} ke {$destination} dalam rangka {$text}";
        }

        // Clean trailing punctuation
        $text = trim(preg_replace('/[,;.\s]+$/', '', $text));

        return $text;
    }

    protected function cleanMaksudForUraian(?string $text): string
    {
        if (empty(trim((string)$text))) {
            return "kegiatan operasional balai";
        }
        $parts = explode(';', (string)$text);
        $text = trim($parts[0]);
        $text = trim(preg_replace('/,?\s+selama\s+\d+.*$/i', '', $text));
        $text = trim(preg_replace('/,?\s+terhitung\s+mulai.*$/i', '', $text));
        if (preg_match('/dalam\s+rangka\s+(.+)$/i', $text, $m) && !empty($m[1])) {
            $text = trim($m[1]);
        }
        $text = trim(preg_replace('/^(?:perjalanan\s+dinas\s+dari\s+.*?\s+ke\s+.*?\s+)+/i', '', $text));
        $text = trim(preg_replace('/^(?:melaksanakan\s+tugas\s+|melaksanakan\s+|untuk\s+melaksanakan\s+|dalam\s+rangka\s+)+/i', '', $text));
        $text = trim(preg_replace('/[,.;\s]+$/', '', $text));
        return $text ?: "kegiatan operasional balai";
    }

    protected function terbilangWord(int $n): string
    {
        $map = [
            1 => 'Satu', 2 => 'Dua', 3 => 'Tiga', 4 => 'Empat', 5 => 'Lima',
            6 => 'Enam', 7 => 'Tujuh', 8 => 'Delapan', 9 => 'Sembilan', 10 => 'Sepuluh',
            11 => 'Sebelas', 12 => 'Dua Belas'
        ];
        if (isset($map[$n])) return $map[$n];
        if ($n < 20) return $this->terbilangWord($n - 10) . ' Belas';
        if ($n < 100) return $this->terbilangWord((int)($n / 10)) . ' Puluh' . ($n % 10 !== 0 ? ' ' . $this->terbilangWord($n % 10) : '');
        return (string) $n;
    }

    protected function buildDefaultSptjbUraian(array $data, int $recipientCount): string
    {
        $origin = $data['asal'] ?? $data['travel']['origin'] ?? 'Samarinda';
        $destination = $data['tujuan'] ?? $data['travel']['destination'] ?? '';
        $startDate = $data['tanggal_mulai'] ?? $data['travel']['startDate'] ?? date('Y-m-d');
        $endDate = $data['tanggal_selesai'] ?? $data['travel']['endDate'] ?? $startDate;
        $activityName = $data['dipaConfig']['maksudTujuan'] ?? ($data['nama_kegiatan'] ?? '');

        $days = max(1, (int) round((strtotime($endDate) - strtotime($startDate)) / 86400) + 1);
        $daysWords = $this->terbilangWord($days);
        $countWords = $this->terbilangWord($recipientCount ?: 1);
        $startStr = $this->formatIndoDate($startDate);
        $endStr = $this->formatIndoDate($endDate);
        $maksud = $this->cleanMaksudForUraian($activityName);

        return "Belanja Perjalanan Dinas Biasa, Perjalanan Dinas dari {$origin} ke {$destination} sebanyak {$recipientCount} ({$countWords}) orang tugas (OT) dalam rangka {$maksud} selama {$days} ({$daysWords}) hari terhitung mulai tanggal {$startStr} sampai dengan {$endStr}.";
    }
}
