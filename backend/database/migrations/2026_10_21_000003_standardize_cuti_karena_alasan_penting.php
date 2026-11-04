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
            // 1. Correct record with Anak Sakit which was previously misclassified as Cuti Sakit
            DB::table('kpg_employee_leave_requests')
                ->where('alasan_cuti', 'like', '%ANAK SAKIT%')
                ->update([
                    'jenis_cuti' => 'Cuti Karena Alasan Penting',
                    'alasan_cuti' => 'Anak Sakit',
                ]);

            // 2. Map SUKET IZIN SIKADIR to Cuti Karena Alasan Penting
            DB::table('kpg_employee_leave_requests')
                ->where('jenis_cuti', 'like', '%SIKADIR%')
                ->orWhere('nomor_pengajuan', 'like', '%ND.690/K.18/SKWIII/06/2026%')
                ->update([
                    'jenis_cuti' => 'Cuti Karena Alasan Penting',
                    'alasan_cuti' => 'Suket Izin SIKADIR',
                ]);

            // 3. Normalize all Cuti Alasan Penting records to official Cuti Karena Alasan Penting
            $records = DB::table('kpg_employee_leave_requests')
                ->where('jenis_cuti', 'Cuti Alasan Penting')
                ->orWhere('jenis_cuti', 'like', '%Alasan Penting%')
                ->get();

            foreach ($records as $r) {
                $rawAlasan = trim((string) ($r->alasan_cuti ?? ''));
                $lowerAlasan = strtolower($rawAlasan);

                $newAlasan = 'Cuti Karena Alasan Penting';
                if (str_contains($lowerAlasan, 'pernikahan')) {
                    $newAlasan = 'Pernikahan';
                } elseif (str_contains($lowerAlasan, 'ayah wafat')) {
                    $newAlasan = 'Ayah Wafat';
                } elseif (str_contains($lowerAlasan, 'anak sakit')) {
                    $newAlasan = 'Anak Sakit';
                } elseif (str_contains($lowerAlasan, '2022')) {
                    $newAlasan = 'Cuti Karena Alasan Penting Th 2022';
                } elseif (str_contains($lowerAlasan, '2020')) {
                    $newAlasan = 'Cuti Karena Alasan Penting Th 2020';
                } elseif (str_contains($lowerAlasan, '2018')) {
                    $newAlasan = 'Cuti Karena Alasan Penting Th 2018';
                } elseif (str_contains($lowerAlasan, '2023')) {
                    $newAlasan = 'Cuti Karena Alasan Penting Th 2023';
                }

                DB::table('kpg_employee_leave_requests')
                    ->where('id', $r->id)
                    ->update([
                        'jenis_cuti' => 'Cuti Karena Alasan Penting',
                        'alasan_cuti' => $newAlasan,
                    ]);
            }

            // 4. Normalize Cuti Besar (Haji) reason
            DB::table('kpg_employee_leave_requests')
                ->where('jenis_cuti', 'Cuti Besar')
                ->where('alasan_cuti', 'like', '%Haji%')
                ->update([
                    'alasan_cuti' => 'Menunaikan Ibadah Haji',
                ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // One-way data standardization
    }
};
