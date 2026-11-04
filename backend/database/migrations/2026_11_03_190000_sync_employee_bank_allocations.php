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
        // 43 Mandiri Employees (39 PNS + 4 PPPK)
        $mandiriIds = [
            2, 5, 13, 14, 16, 25, 27, 28, 29, 31, 33, 35, 36, 42, 47, 49, 50, 51, 52, 55,
            57, 59, 60, 61, 62, 67, 68, 69, 70, 71, 72, 73, 74, 76, 78, 82, 83, 85, 110,
            121, 122, 123, 135
        ];

        // 70 BRI Employees (53 PNS + 17 PPPK)
        $briIds = [
            1, 3, 4, 6, 7, 8, 9, 10, 11, 12, 15, 17, 18, 19, 20, 21, 22, 24, 26, 30,
            32, 34, 37, 38, 39, 40, 41, 43, 44, 45, 46, 48, 53, 54, 56, 63, 64, 65, 66,
            75, 77, 79, 80, 81, 84, 87, 107, 108, 109, 111, 112, 114, 116, 117, 118, 119,
            120, 124, 125, 126, 127, 128, 129, 136, 137, 138, 148, 149, 150, 151
        ];

        DB::table('kpg_employees')
            ->whereIn('id', $mandiriIds)
            ->update(['nama_bank' => 'Mandiri']);

        DB::table('kpg_employees')
            ->whereIn('id', $briIds)
            ->update(['nama_bank' => 'BRI']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reset back if needed
    }
};
