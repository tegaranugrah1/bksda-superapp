<?php

namespace Tests\Feature;

use App\Modules\Kepegawaian\Services\AdaptiveTariffResolver;
use App\Modules\Kepegawaian\Services\MealAllowanceExcelExport;
use App\Modules\Kepegawaian\Services\SikadirParserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use App\Models\User;
use Tests\TestCase;

class MealAllowanceContractRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_pppk_fallback_reads_the_metadata_shape_returned_by_the_parser(): void
    {
        $parsed = (new SikadirParserService)->parseHtmlContent('<html><table>'
            .'<tr><td>NIP</td><td>900000000000000001</td></tr><tr><td>NAMA</td><td>Dummy PPPK</td></tr>'
            .'<tr><td>KELAS JABATAN</td><td>9</td></tr><tr><td>BULAN</td><td>September 2026</td></tr>'
            .'</table></html>');
        $this->assertSame(9, $parsed['kelas_jabatan']);
        $tariff = AdaptiveTariffResolver::resolve('', 'PPPK', $parsed);
        $this->assertEquals(37000, $tariff['tarif']);
        $this->assertEquals(5, $tariff['persen_pph']);
    }

    public function test_workbook_counts_canonical_and_legacy_absence_codes(): void
    {
        $items = array_map(fn ($status) => ['nama_lengkap' => 'Dummy '.$status, 'nip' => '900000000000000001',
            'daily_matrix' => [1 => ['status' => $status]], 'jml_hari_kerja' => 22], ['TK', 'A']);
        $sheet = (new MealAllowanceExcelExport)->generate($items, '2026-09')->getSheetByName('PNS_BRI');
        $this->assertSame(1, $sheet->getCell('AI6')->getCalculatedValue());
        $this->assertSame(1, $sheet->getCell('AI7')->getCalculatedValue());
    }

    public function test_same_employee_in_different_periods_is_not_silently_deduplicated(): void
    {
        $files = array_map(fn ($month) => UploadedFile::fake()->createWithContent($month.'.xls',
            '<table><tr><td>NIP</td><td>900000000000000001</td></tr><tr><td>NAMA</td><td>Dummy</td></tr>'
            .'<tr><td>BULAN</td><td>'.$month.' 2026</td></tr></table>'), ['September', 'Oktober']);
        $this->assertCount(2, (new SikadirParserService)->parseMultiple($files), 'Different periods must reach the period validator.');
        $admin = User::factory()->create(['role' => 'super_admin']);
        $this->actingAs($admin, 'sanctum')->postJson('/api/kepegawaian/uang-makan/reconcile', ['files' => $files])
            ->assertUnprocessable()->assertJsonPath('error_code', 'MISMATCHED_PERIODS');
        $this->assertCount(1, (new SikadirParserService)->parseMultiple([$files[0], $files[0]]));
    }

    public function test_daily_dates_must_be_real_and_match_the_file_period(): void
    {
        foreach (['01/10/2026', '31/09/2026'] as $date) {
            try {
                (new SikadirParserService)->parseHtmlContent('<table><tr><td>NIP</td><td>900000000000000001</td></tr>'
                    .'<tr><td>BULAN</td><td>September 2026</td></tr></table><table class="wbo"><tbody>'
                    .'<tr><td>'.$date.'</td><td>Wfo</td><td>07:30</td></tr></tbody></table>', 'dummy.xls');
                $this->fail('Invalid or different-period date was accepted: '.$date);
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('files', $exception->errors());
            }
        }
        $parsed = (new SikadirParserService)->parseHtmlContent('<table><tr><td>NIP</td><td>900000000000000001</td></tr>'
            .'<tr><td>01/09/2026</td><td>Wfo</td><td>07:30</td></tr></table>');
        $this->assertSame('2026-09', $parsed['periode_bulan']);
        $this->assertSame('H', $parsed['daily_records'][1]['status_sikadir']);
    }

    public function test_real_xlsx_import_preserves_the_existing_attendance_contract(): void
    {
        $workbook = new \PhpOffice\PhpSpreadsheet\Spreadsheet;
        $sheet = $workbook->getActiveSheet();
        $sheet->fromArray([['NIP', '900000000000000001'], ['NAMA', 'Dummy Workbook'], ['BULAN', 'September 2026'],
            ['01/09/2026', 'Wfo', '07:30', '16:00']]);
        $file = tmpfile();
        try {
            $path = stream_get_meta_data($file)['uri'];
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($workbook))->save($path);
            $uploaded = UploadedFile::fake()->createWithContent('dummy.xlsx', file_get_contents($path));
            $parsed = (new SikadirParserService)->parse($uploaded);
            $this->assertCount(1, $parsed);
            $this->assertSame('900000000000000001', $parsed[0]['clean_nip']);
            $this->assertSame('2026-09', $parsed[0]['periode_bulan']);
            $this->assertSame('H', $parsed[0]['daily_records'][1]['status_sikadir']);
            $sheet->setCellValue('A501', 'Outside attendance bounds');
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($workbook))->save($path);
            try {
                (new SikadirParserService)->parse(UploadedFile::fake()->createWithContent('dummy-too-many-rows.xlsx', file_get_contents($path)));
                $this->fail('Excess rows must be rejected, not silently dropped.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('files', $exception->errors());
            }
        } finally {
            fclose($file);
            $workbook->disconnectWorksheets();
        }
    }
}
