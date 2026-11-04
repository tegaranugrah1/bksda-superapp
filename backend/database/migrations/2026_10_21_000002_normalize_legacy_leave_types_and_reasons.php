<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::transaction(function () {
            $records = DB::table('kpg_employee_leave_requests')->get();

            foreach ($records as $r) {
                $rawJenis = trim((string) $r->jenis_cuti);
                $lowerJenis = strtolower($rawJenis);
                $rawAlasan = trim((string) ($r->alasan_cuti ?? ''));
                $year = $r->tanggal_mulai ? (int) date('Y', strtotime($r->tanggal_mulai)) : 2026;

                $newJenis = $rawJenis;
                $newAlasan = $rawAlasan;

                // 1. Standardize jenis_cuti to official Master Leave Types
                if (str_contains($lowerJenis, 'tahunan') || str_contains($lowerJenis, 'tahuanan') || str_contains($lowerJenis, 'cuti th.') || str_contains($lowerJenis, 'cuti tahun')) {
                    $newJenis = 'Cuti Tahunan';
                    if ($year >= 2026) {
                        // For year 2026 and newer, set alasan to clean "Cuti Tahunan"
                        if ($rawAlasan === '' || str_contains(strtolower($rawAlasan), 'tahunan') || str_contains(strtolower($rawAlasan), 'tahuanan') || str_contains(strtolower($rawAlasan), 'sisa cuti')) {
                            $newAlasan = 'Cuti Tahunan';
                        }
                    } else {
                        // For 2025 and older, record the year detail in alasan_cuti
                        if ($rawAlasan === '' || str_contains(strtolower($rawAlasan), 'sisa cuti') || strtolower($rawAlasan) === 'cuti tahunan') {
                            $newAlasan = $rawJenis;
                        }
                    }
                } elseif (str_contains($lowerJenis, 'sakit')) {
                    $newJenis = 'Cuti Sakit';
                    if ($rawAlasan === '' || str_contains(strtolower($rawAlasan), 'sisa cuti') || str_contains(strtolower($rawAlasan), 'sakit')) {
                        $newAlasan = $year < 2026 ? $rawJenis : 'Cuti Sakit';
                    }
                } elseif (str_contains($lowerJenis, 'alasan penting')) {
                    $newJenis = 'Cuti Alasan Penting';
                    if ($rawAlasan === '' || str_contains(strtolower($rawAlasan), 'sisa cuti') || str_contains(strtolower($rawAlasan), 'alasan penting')) {
                        $newAlasan = $year < 2026 ? $rawJenis : 'Cuti Alasan Penting';
                    }
                } elseif (str_contains($lowerJenis, 'bersalin') || str_contains($lowerJenis, 'melahirkan')) {
                    $newJenis = 'Cuti Melahirkan';
                    if ($rawAlasan === '' || str_contains(strtolower($rawAlasan), 'sisa cuti')) {
                        $newAlasan = 'Cuti Melahirkan';
                    }
                } elseif (str_contains($lowerJenis, 'besar') || str_contains($lowerJenis, 'haji')) {
                    $newJenis = 'Cuti Besar';
                    if ($rawAlasan === '' || str_contains(strtolower($rawAlasan), 'sisa cuti')) {
                        $newAlasan = 'Cuti Besar';
                    }
                } elseif (str_contains($lowerJenis, 'bersama')) {
                    $newJenis = 'Cuti Bersama';
                    if ($rawAlasan === '' || str_contains(strtolower($rawAlasan), 'sisa cuti')) {
                        $newAlasan = 'Cuti Bersama';
                    }
                } elseif (str_contains($lowerJenis, 'luar tanggungan')) {
                    $newJenis = 'Cuti di Luar Tanggungan Negara';
                    if ($rawAlasan === '' || str_contains(strtolower($rawAlasan), 'sisa cuti')) {
                        $newAlasan = 'Cuti di Luar Tanggungan Negara';
                    }
                }

                // If alasan only had legacy spreadsheet text "Sisa Cuti=...", fallback to clean jenis
                if (str_starts_with(strtolower($newAlasan), 'sisa cuti')) {
                    $newAlasan = $newJenis;
                }

                DB::table('kpg_employee_leave_requests')
                    ->where('id', $r->id)
                    ->update([
                        'jenis_cuti' => $newJenis,
                        'alasan_cuti' => $newAlasan,
                    ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // One-way data normalization
    }
};
