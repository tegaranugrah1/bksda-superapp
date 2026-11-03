<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('kpg_registered_banks')) {
            Schema::create('kpg_registered_banks', function (Blueprint $table) {
                $table->id();
                $table->string('nama_bank', 50)->unique();
                $table->timestamps();
            });
        }

        // Seed default banks: BRI & Mandiri
        $defaults = ['BRI', 'Mandiri'];

        // Juga masukkan bank aktif yang sudah dipakai pegawai jika ada
        try {
            $existingEmpBanks = DB::table('kpg_employees')
                ->whereNotNull('nama_bank')
                ->where('nama_bank', '<>', '')
                ->distinct()
                ->pluck('nama_bank');

            foreach ($existingEmpBanks as $b) {
                $clean = trim($b);
                if ($clean !== '') {
                    $found = false;
                    foreach ($defaults as $d) {
                        if (strcasecmp($d, $clean) === 0) {
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        $defaults[] = $clean;
                    }
                }
            }
        } catch (\Throwable $e) {}

        foreach ($defaults as $bank) {
            DB::table('kpg_registered_banks')->updateOrInsert(
                ['nama_bank' => $bank],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpg_registered_banks');
    }
};
