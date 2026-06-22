<?php

namespace App\Modules\Bmn\Services;

use Illuminate\Support\Facades\Log;

class PdfPreviewService
{
    public function firstPageJpeg(string $pdfBytes): ?string
    {
        return $this->jpegPages($pdfBytes, firstPageOnly: true)[0] ?? null;
    }

    /**
     * @return array<int, string>
     */
    public function jpegPages(string $pdfBytes, bool $firstPageOnly = false): array
    {
        $workingDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'bmn-pdf-preview-'.bin2hex(random_bytes(6));

        if (! mkdir($workingDir, 0700, true) && ! is_dir($workingDir)) {
            return null;
        }

        $pdfPath = $workingDir.DIRECTORY_SEPARATOR.'source.pdf';
        $outputBase = $workingDir.DIRECTORY_SEPARATOR.'preview';

        try {
            file_put_contents($pdfPath, $pdfBytes);

            $command = sprintf(
                '%s -jpeg %s -scale-to 1400 %s %s 2>&1',
                escapeshellarg($this->pdftoppmBinary()),
                $firstPageOnly ? '-singlefile -f 1 -l 1' : '',
                escapeshellarg($pdfPath),
                escapeshellarg($outputBase)
            );

            exec($command, $output, $exitCode);

            $previewPaths = $firstPageOnly
                ? [$outputBase.'.jpg']
                : glob($outputBase.'-*.jpg');

            if ($exitCode !== 0 || ! $previewPaths) {
                Log::warning('BMN PDF preview generation skipped.', [
                    'exit_code' => $exitCode,
                    'output' => implode("\n", $output),
                ]);

                return [];
            }

            sort($previewPaths, SORT_NATURAL);

            return array_values(array_filter(array_map(
                fn (string $path) => file_get_contents($path) ?: null,
                $previewPaths
            )));
        } finally {
            foreach (glob($workingDir.DIRECTORY_SEPARATOR.'*') ?: [] as $file) {
                @unlink($file);
            }
            @rmdir($workingDir);
        }
    }

    private function pdftoppmBinary(): string
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return 'pdftoppm';
        }

        $localAppData = getenv('LOCALAPPDATA');
        if (! $localAppData) {
            return 'pdftoppm';
        }

        $matches = glob($localAppData.'/Microsoft/WinGet/Packages/*Poppler*/poppler-*/Library/bin/pdftoppm.exe') ?: [];

        return $matches[0] ?? 'pdftoppm';
    }
}
