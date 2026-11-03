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
        if (!Schema::hasColumn('kpg_employees', 'email')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->string('email', 100)->nullable()->index()->after('telepon');
            });
        }

        // Backfill email dari tabel users berdasarkan NIP (username)
        try {
            $users = DB::table('users')
                ->whereNotNull('email')
                ->where('email', '<>', '')
                ->select('username', 'email')
                ->get();

            foreach ($users as $u) {
                if (!empty($u->username) && !empty($u->email)) {
                    DB::table('kpg_employees')
                        ->where('nip', $u->username)
                        ->whereNull('email')
                        ->update(['email' => trim($u->email)]);
                }
            }
        } catch (\Throwable $e) {
            // Ignore during fresh test setups
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('kpg_employees', 'email')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->dropColumn('email');
            });
        }
    }
};
