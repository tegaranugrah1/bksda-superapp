<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * NIP dan nama 3 personil PNS legacy di database produksi yang sudah tidak aktif /
     * tidak tercantum dalam Daftar Riil 147 Personil Resmi Kepegawaian BKSDA Kaltim:
     * 1. Didimus (197509192006041011) - Pengolah Data dan Informasi
     * 2. Dwi Suriyanto (197504192007101002) - Polisi Kehutanan Mahir
     * 3. Khairul Falah (197708081998031004) - Pengolah Data dan Informasi
     */
    protected array $targetNips = [
        '197509192006041011', // Didimus
        '197504192007101002', // Dwi Suriyanto
        '197708081998031004', // Khairul Falah
    ];

    protected array $targetNames = [
        'Didimus',
        'Dwi Suriyanto',
        'Khairul Falah',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = Carbon::now();

        // 1. Soft-delete dan nonaktifkan di kpg_employees
        DB::table('kpg_employees')
            ->where(function ($query) {
                $query->whereIn('nip', $this->targetNips)
                    ->orWhereIn('nama_lengkap', $this->targetNames);
            })
            ->whereNull('deleted_at')
            ->update([
                'is_active' => false,
                'deleted_at' => $now,
                'updated_at' => $now,
            ]);

        // 2. Nonaktifkan akun user terkait jika ada
        DB::table('users')
            ->whereIn('username', $this->targetNips)
            ->orWhereIn('name', $this->targetNames)
            ->update([
                'is_active' => false,
                'updated_at' => $now,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $now = Carbon::now();

        DB::table('kpg_employees')
            ->where(function ($query) {
                $query->whereIn('nip', $this->targetNips)
                    ->orWhereIn('nama_lengkap', $this->targetNames);
            })
            ->update([
                'is_active' => true,
                'deleted_at' => null,
                'updated_at' => $now,
            ]);

        DB::table('users')
            ->whereIn('username', $this->targetNips)
            ->orWhereIn('name', $this->targetNames)
            ->update([
                'is_active' => true,
                'updated_at' => $now,
            ]);
    }
};
