<?php

namespace Tests\Feature;

use App\Modules\Kepegawaian\Services\SikadirParserService;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;
use ZipArchive;

/** Bounded proposal: parent installs/runs offline. No large data is expanded. */
class Wave3SikadirNativeParserTest extends TestCase
{
    private function workbook(array $extra = [], ?callable $edit = null): array
    {
        $book = new Spreadsheet;
        $book->getActiveSheet()->fromArray([
            ['NIP', '900000000000000001'], ['NAMA', 'Dummy Workbook'],
            ['BULAN', 'September 2026'], ['01/09/2026', 'Wfo', '07:30', '16:00'],
        ]);
        $book->createSheet()->fromArray([['NIP', '900000000000000002'], ['NAMA', 'Dummy Second Sheet']]);
        $book->setActiveSheetIndex(0);
        foreach ($extra as $cell => $value) {
            $book->getActiveSheet()->setCellValue($cell, $value);
        }
        $handle = tmpfile();
        try {
            $path = stream_get_meta_data($handle)['uri'];
            (new Xlsx($book))->setPreCalculateFormulas(false)->save($path);
            if ($edit) {
                $edit($path);
            }
            return (new SikadirParserService)->parse(new UploadedFile($path, 'dummy.xlsx', null, null, true));
        } finally {
            fclose($handle);
            $book->disconnectWorksheets();
        }
    }

    private function rejected(callable $parse, string $message): void
    {
        try {
            $parse();
            $this->fail('Expected validation failure: '.$message);
        } catch (ValidationException $exception) {
            $this->assertStringContainsString($message, implode(' ', $exception->errors()['files']));
        }
    }

    public function test_native_formula_is_literal_and_only_first_sheet_is_imported(): void
    {
        $parsed = $this->workbook(['B2' => '=1+1'], function ($path) {
            // Extra unused entry also confirms the reader ignores unrelated small members.
            $zip = new ZipArchive;
            $this->assertTrue($zip->open($path) === true);
            $zip->addFromString('unused-small-entry.txt', 'x');
            $zip->close();
        });
        $this->assertCount(1, $parsed);
        $this->assertSame('=1+1', $parsed[0]['nama_lengkap']);
        $this->assertSame('H', $parsed[0]['daily_records'][1]['status_sikadir']);
    }

    public function test_exact_row_column_bounds_and_first_over_limit_are_enforced(): void
    {
        $this->assertCount(1, $this->workbook(['AF500' => 'edge']));
        $this->rejected(fn () => $this->workbook(['A501' => 'over']), '500');
        $this->rejected(fn () => $this->workbook(['AG1' => 'over']), '32');
    }

    public function test_200_archive_entries_accept_and_201_reject(): void
    {
        foreach ([200, 201] as $count) {
            $run = fn () => $this->workbook([], function ($path) use ($count) {
                $zip = new ZipArchive;
                $this->assertTrue($zip->open($path) === true);
                $start = $zip->numFiles;
                for ($i = $start; $i < $count; ++$i) {
                    $zip->addFromString('padding-'.$i.'.txt', 'x');
                }
                $zip->close();
            });
            if ($count === 200) {
                $this->assertCount(1, $run());
            } else {
                $this->rejected($run, '200');
            }
        }
    }

    public function test_expanded_budget_uses_zip_metadata_without_expanding_large_data(): void
    {
        foreach ([20 * 1024 * 1024, 20 * 1024 * 1024 + 1] as $total) {
            $run = fn () => $this->workbook([], function ($path) use ($total) {
                $zip = new ZipArchive;
                $this->assertTrue($zip->open($path) === true);
                $sum = 0;
                for ($i = 0; $i < $zip->numFiles; ++$i) {
                    $sum += $zip->statIndex($i)['size'];
                }
                $zip->addFromString('budget-unused.bin', 'x');
                $zip->close();
                $bytes = file_get_contents($path);
                $name = 'budget-unused.bin';
                $offset = strpos($bytes, "PK\x01\x02", strpos($bytes, $name) + strlen($name));
                while ($offset !== false && substr($bytes, $offset + 46, strlen($name)) !== $name) {
                    $offset = strpos($bytes, "PK\x01\x02", $offset + 4);
                }
                $this->assertNotFalse($offset);
                // Advertise size only in an unused member. Actual archive remains a few KiB.
                $bytes = substr_replace($bytes, pack('V', $total - $sum), $offset + 24, 4);
                file_put_contents($path, $bytes);
                $this->assertLessThan(65536, filesize($path));
                $this->assertTrue($zip->open($path) === true);
                $this->assertSame($total - $sum, $zip->statName($name)['size']);
                $zip->close();
            });
            if ($total === 20 * 1024 * 1024) {
                $this->assertCount(1, $run());
            } else {
                $this->rejected($run, '20 MiB');
            }
        }
    }

    public function test_malformed_xlsx_and_internal_doctype_fail_as_validation(): void
    {
        $handle = tmpfile();
        try {
            fwrite($handle, 'invalid workbook');
            $path = stream_get_meta_data($handle)['uri'];
            $this->rejected(fn () => (new SikadirParserService)->parse(new UploadedFile($path, 'dummy.xlsx', null, null, true)), 'tidak valid');
        } finally {
            fclose($handle);
        }
        $this->rejected(fn () => $this->workbook([], function ($path) {
            $zip = new ZipArchive;
            $this->assertTrue($zip->open($path) === true);
            $xml = $zip->getFromName('xl/workbook.xml');
            $xml = preg_replace('/(<\?xml[^?]*\?>)/', '$1<!DOCTYPE workbook [<!ENTITY dummy "safe">]>', $xml, 1);
            $zip->addFromString('xl/workbook.xml', $xml);
            $zip->close();
        }), 'tidak dapat dibaca');
    }

    public function test_malformed_sheet_xml_returns_validation_instead_of_framework_error(): void
    {
        foreach (['<broken', '', ' '] as $xml) {
            $this->rejected(fn () => $this->workbook([], function ($path) use ($xml) {
                $zip = new ZipArchive;
                $this->assertTrue($zip->open($path) === true);
                $zip->addFromString('xl/worksheets/sheet1.xml', $xml);
                $zip->close();
            }), 'tidak dapat dibaca');
        }
    }
    public function test_sparse_cell_row_501_cannot_hide_behind_row_attribute_4(): void
    {
        // Only one sparse out-of-bound cell, bounded to row 501; no extreme coordinates.
        $this->rejected(fn () => $this->workbook(['B501' => 'bounded over-limit'], function ($path) {
            $zip = new ZipArchive;
            $this->assertTrue($zip->open($path) === true);
            $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
            $xml = preg_replace('/(<row[^>]*\br=")501(")/', '${1}4${2}', $xml);
            $zip->addFromString('xl/worksheets/sheet1.xml', $xml);
            $zip->close();
        }), '500');
    }

    public function test_column_dimension_33_does_not_hide_from_cell_only_preflight(): void
    {
        // Exactly one out-of-bound column dimension, never a large or reversed range.
        $this->rejected(fn () => $this->workbook([], function ($path) {
            $zip = new ZipArchive;
            $this->assertTrue($zip->open($path) === true);
            $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
            $xml = preg_replace('/<cols>.*?<\/cols>/s', '', $xml);
            $xml = str_replace('<sheetData>', '<cols><col min="33" max="33" width="10" customWidth="1"/></cols><sheetData>', $xml);
            $zip->addFromString('xl/worksheets/sheet1.xml', $xml);
            $zip->close();
        }), '32');
    }
    public function test_outer_zip_member_filter_and_first_200_limit(): void
    {
        $handle = tmpfile();
        try {
            $path = stream_get_meta_data($handle)['uri'];
            $zip = new ZipArchive;
            $this->assertTrue($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true);
            $html = '<table><tr><td>NIP</td><td>900000000000000001</td></tr><tr><td>NAMA</td><td>Dummy</td></tr></table>';
            $zip->addFromString('../visible.xls', $html);
            $zip->addFromString('__MACOSX/ignored.xls', $html);
            $zip->addFromString('.hidden.xls', $html);
            $zip->addFromString('ignored.xlsx', 'not a workbook');
            for ($i = 4; $i < 200; ++$i) {
                $zip->addFromString('skip-'.$i.'.txt', 'x');
            }
            $zip->addFromString('after-limit.xls', $html);
            $zip->close();
            $parsed = (new SikadirParserService)->parse(new UploadedFile($path, 'dummy.zip', null, null, true));
            $this->assertCount(1, $parsed);
            $this->assertSame('visible.xls', $parsed[0]['filename']);
        } finally {
            fclose($handle);
        }
    }
}
