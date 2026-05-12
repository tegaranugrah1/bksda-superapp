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
        $this->sheetName = config('services.google_sheets.sheet_name', 'Sheet1');
        $this->credentialsPath = base_path('service-account.json');
    }

    /**
     * Append a row to the Google Spreadsheet.
     * Mapping:
     * A: Timestamp
     * B: Unit Kerja
     * C-F: Nama Pegawai (max 4 kolom)
     * G: Nama Pegawai overflow (koma separated)
     * H: Nama PLH
     * P: Nama Kegiatan
     * Q: Tanggal dari
     * R: Tanggal sampai
     * S: Sumber Dana
     * T: Upload Dasar Surat (link/path)
     * U: Keterangan
     * V: Tanda Setuju
     */
    public function appendSuratTugas(array $data): bool
    {
        try {
            $token = $this->getAccessToken();
            if (!$token) {
                Log::error('GoogleSheets: Failed to get access token');
                return false;
            }

            $employees = $data['employees'] ?? [];
            $employeeNames = array_map(fn($e) => $e['nama_lengkap'] ?? $e['name'] ?? '', $employees);

            // Build row: A to V (22 columns)
            $row = array_fill(0, 22, '');
            $row[0] = now()->format('Y-m-d H:i:s'); // A: Timestamp
            $row[1] = $data['unit_kerja'] ?? ''; // B: Unit Kerja
            // C-F: First 4 employees
            for ($i = 0; $i < min(4, count($employeeNames)); $i++) {
                $row[2 + $i] = $employeeNames[$i]; // C=2, D=3, E=4, F=5
            }
            // G: Overflow employees (5th onwards, comma separated)
            if (count($employeeNames) > 4) {
                $row[6] = implode(', ', array_slice($employeeNames, 4));
            } elseif (count($employeeNames) > 0 && count($employeeNames) <= 4) {
                // If <= 4, put all in G as well for easy reading
                $row[6] = implode(', ', $employeeNames);
            }
            $row[7] = $data['nama_plh'] ?? ''; // H: Nama PLH
            // I-O: skip (empty)
            $row[15] = $data['nama_kegiatan'] ?? ''; // P: Nama Kegiatan
            $row[16] = $data['tanggal_mulai'] ?? ''; // Q: Tanggal dari
            $row[17] = $data['tanggal_selesai'] ?? ''; // R: Tanggal sampai
            $row[18] = $data['sumber_dana'] ?? ''; // S: Sumber Dana
            $row[19] = $data['file_path'] ?? ''; // T: Upload Dasar Surat
            $row[20] = $data['keterangan'] ?? ''; // U: Keterangan
            $row[21] = $data['tanda_setuju'] ?? ''; // V: Tanda Setuju

            $range = "{$this->sheetName}!A:V";
            $url = "https://sheets.googleapis.com/v4/spreadsheets/{$this->spreadsheetId}/values/{$range}:append";

            $response = Http::withToken($token)
                ->post($url, [
                    'range' => $range,
                    'majorDimension' => 'ROWS',
                    'values' => [$row],
                ], [
                    'query' => [
                        'valueInputOption' => 'USER_ENTERED',
                        'insertDataOption' => 'INSERT_ROWS',
                    ],
                ]);

            // Google Sheets API needs query params in URL
            $response = Http::withToken($token)
                ->post($url . '?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS', [
                    'range' => $range,
                    'majorDimension' => 'ROWS',
                    'values' => [$row],
                ]);

            if ($response->successful()) {
                Log::info('GoogleSheets: Row appended successfully');
                return true;
            }

            Log::error('GoogleSheets: Failed to append row', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return false;

        } catch (\Exception $e) {
            Log::error('GoogleSheets: Exception', ['message' => $e->getMessage()]);
            return false;
        }
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

        $token = $credentials->fetchAuthToken();
        return $token['access_token'] ?? null;
    }
}
