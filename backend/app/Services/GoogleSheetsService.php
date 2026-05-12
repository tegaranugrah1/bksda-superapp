<?php

namespace App\Services;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleSheetsService
{
    private string $spreadsheetId;
    private string $sheetName;
    private ?string $credentialsPath;

    public function __construct()
    {
        $this->spreadsheetId = config('services.google_sheets.spreadsheet_id', '11Hv27vqC_pvk9YqcT3vzkEkP5RqdVFTmI4-dNs8EjLQ');
        $this->sheetName = config('services.google_sheets.sheet_name', 'Form Responses 1');
        $this->credentialsPath = base_path('../service-account.json');
    }

    /**
     * Build row data from surat tugas.
     * Mapping:
     * A(0): Timestamp | B(1): Unit Kerja | C-F(2-5): Nama Pegawai 1-4
     * G(6): Nama Pegawai overflow | H(7): Nama PLH
     * I-O(8-14): skip
     * P(15): Nama Kegiatan | Q(16): Tanggal dari | R(17): Tanggal sampai
     * S(18): Sumber Dana | T(19): Upload Dasar Surat | U(20): Keterangan
     * V(21): Tanda Setuju | W(22): skip | X(23): skip
     * Y(24): UUID Surat Tugas (ID unik untuk update)
     */
    private function buildRow(array $data): array
    {
        $employees = $data['employees'] ?? [];
        $employeeNames = array_map(fn($e) => $e['nama_lengkap'] ?? $e['name'] ?? '', $employees);

        // Build row: A to Y (25 columns)
        $row = array_fill(0, 25, '');
        $row[0] = $data['timestamp'] ?? now()->format('Y-m-d H:i:s'); // A: Timestamp
        $row[1] = $data['unit_kerja'] ?? ''; // B: Unit Kerja
        // C-F: First 4 employees
        for ($i = 0; $i < min(4, count($employeeNames)); $i++) {
            $row[2 + $i] = $employeeNames[$i];
        }
        // G: All employees comma separated
        $row[6] = implode(', ', $employeeNames);
        $row[7] = $data['nama_plh'] ?? ''; // H: Nama PLH
        // I-O: skip
        $row[15] = $data['nama_kegiatan'] ?? ''; // P: Nama Kegiatan
        $row[16] = $data['tanggal_mulai'] ?? ''; // Q: Tanggal dari
        $row[17] = $data['tanggal_selesai'] ?? ''; // R: Tanggal sampai
        $row[18] = $data['sumber_dana'] ?? ''; // S: Sumber Dana
        $row[19] = $data['file_path'] ?? ''; // T: Upload Dasar Surat
        $row[20] = $data['keterangan'] ?? ''; // U: Keterangan
        $row[21] = $data['tanda_setuju'] ?? ''; // V: Tanda Setuju
        // W, X: skip
        $row[24] = $data['id'] ?? ''; // Y: UUID Surat Tugas

        return $row;
    }

    /**
     * Append a new row (saat pertama kali submit).
     */
    public function appendSuratTugas(array $data): bool
    {
        try {
            $token = $this->getAccessToken();
            if (!$token) {
                Log::error('GoogleSheets: Failed to get access token');
                return false;
            }

            $row = $this->buildRow($data);
            $range = "{$this->sheetName}!A:Y";
            $url = "https://sheets.googleapis.com/v4/spreadsheets/{$this->spreadsheetId}/values/{$range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";

            $response = Http::withoutVerifying()->withToken($token)->post($url, [
                'range' => $range,
                'majorDimension' => 'ROWS',
                'values' => [$row],
            ]);

            if ($response->successful()) {
                Log::info('GoogleSheets: Row appended', ['id' => $data['id'] ?? '']);
                return true;
            }

            Log::error('GoogleSheets: Append failed', ['status' => $response->status(), 'body' => $response->body()]);
            return false;

        } catch (\Exception $e) {
            Log::error('GoogleSheets: Append exception', ['message' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Update existing row by searching UUID in column Y.
     * If not found, append as new row.
     */
    public function updateSuratTugas(array $data): bool
    {
        try {
            $token = $this->getAccessToken();
            if (!$token) {
                Log::error('GoogleSheets: Failed to get access token');
                return false;
            }

            $id = $data['id'] ?? '';
            if (!$id) {
                return $this->appendSuratTugas($data);
            }

            // Search for existing row by UUID in column Y
            $rowNumber = $this->findRowById($token, $id);

            if ($rowNumber) {
                // Update existing row
                $row = $this->buildRow($data);
                $range = "{$this->sheetName}!A{$rowNumber}:Y{$rowNumber}";
                $url = "https://sheets.googleapis.com/v4/spreadsheets/{$this->spreadsheetId}/values/{$range}?valueInputOption=USER_ENTERED";

                $response = Http::withoutVerifying()->withToken($token)->put($url, [
                    'range' => $range,
                    'majorDimension' => 'ROWS',
                    'values' => [$row],
                ]);

                if ($response->successful()) {
                    Log::info('GoogleSheets: Row updated', ['id' => $id, 'row' => $rowNumber]);
                    return true;
                }

                Log::error('GoogleSheets: Update failed', ['status' => $response->status(), 'body' => $response->body()]);
                return false;
            }

            // Not found — append as new
            return $this->appendSuratTugas($data);

        } catch (\Exception $e) {
            Log::error('GoogleSheets: Update exception', ['message' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Find row number by UUID in column Y.
     * Returns row number (1-indexed) or null if not found.
     */
    private function findRowById(string $token, string $id): ?int
    {
        $range = "{$this->sheetName}!Y:Y";
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$this->spreadsheetId}/values/{$range}";

        $response = Http::withoutVerifying()->withToken($token)->get($url);

        if (!$response->successful()) {
            return null;
        }

        $values = $response->json('values') ?? [];
        foreach ($values as $index => $row) {
            if (isset($row[0]) && $row[0] === $id) {
                return $index + 1; // 1-indexed
            }
        }

        return null;
    }

    private function getAccessToken(): ?string
    {
        if (!file_exists($this->credentialsPath)) {
            Log::error('GoogleSheets: service-account.json not found at ' . $this->credentialsPath);
            return null;
        }

        $credentials = new ServiceAccountCredentials(
            ['https://www.googleapis.com/auth/spreadsheets'],
            $this->credentialsPath
        );

        $httpHandler = function ($request, $options = []) {
            $options['verify'] = false;
            $client = new \GuzzleHttp\Client();
            return $client->send($request, $options);
        };

        $token = $credentials->fetchAuthToken($httpHandler);
        return $token['access_token'] ?? null;
    }
}
