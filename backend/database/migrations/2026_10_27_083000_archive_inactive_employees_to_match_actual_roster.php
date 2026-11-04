<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * NIP dan nama pegawai non-aktif / di luar daftar aktual 147 pegawai:
     * - Djunaib Ahmad (198007132000031002) - tidak ada di daftar aktual
     * - Muhamad Rafli Reskiadi (MMP-032) - tidak ada di daftar aktual
     * - Didimus (197509192006041011) - pegawai lama di live/staging
     * - Dwi Suriyanto (197504192007101002) - pegawai lama di live/staging
     * - Khairul Falah (197708081998031004) - pegawai lama di live/staging
     */
    protected array $targetNips = [
        '198007132000031002', // Djunaib Ahmad
        'MMP-032',            // Muhamad Rafli Reskiadi
        '197509192006041011', // Didimus
        '197504192007101002', // Dwi Suriyanto
        '197708081998031004', // Khairul Falah
    ];

    protected array $targetNames = [
        'Djunaib Ahmad',
        'Muhamad Rafli Reskiadi',
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

        // 1. Soft-delete and deactivate employees in kpg_employees
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

        // 2. Deactivate corresponding user accounts
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
