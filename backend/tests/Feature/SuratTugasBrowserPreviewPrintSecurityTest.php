<?php

namespace Tests\Feature;

use Tests\TestCase;

class SuratTugasBrowserPreviewPrintSecurityTest extends TestCase
{
    /**
     * ST-12: Stored input / renderer and print verification using real Chromium browser.
     * Proves that stored markup payloads in maksud_tujuan, menimbang, dasar, tembusan, and approver
     * remain inert text in the preview DOM and print window and never execute in browser executing sinks.
     */
    public function test_st12_stored_markup_remains_inert_in_chromium_browser(): void
    {
        $chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        if (! file_exists($chromePath)) {
            $this->markTestSkipped('Google Chrome binary not found on this host.');
        }

        $pythonScript = base_path('tests/security/st12_chromium_preview_print_test.py');
        $this->assertFileExists($pythonScript);

        $command = 'python ' . escapeshellarg($pythonScript);
        $output = [];
        $returnVar = 0;
        exec($command, $output, $returnVar);

        $outputStr = implode("\n", $output);
        $this->assertSame(0, $returnVar, 'Chromium ST-12 test script failed: ' . $outputStr);
        $this->assertStringContainsString('CHROMIUM_HEADLESS_ST12_TEST_PASSED', $outputStr);
        $this->assertStringContainsString('window.__ST12_EXECUTED_SINKS is empty []', $outputStr);
    }
}
