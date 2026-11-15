<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE bmn_asset_loans DROP CONSTRAINT IF EXISTS bmn_asset_loans_status_check");
            DB::statement("ALTER TABLE bmn_asset_loans ADD CONSTRAINT bmn_asset_loans_status_check CHECK (status::text = ANY (ARRAY['dipinjam'::text, 'dikembalikan'::text, 'terlambat'::text]))");
        } elseif (DB::getDriverName() === 'sqlite') {
            Schema::table('bmn_asset_loans', function (Blueprint $table) {
                $table->enum('status', ['dipinjam', 'dikembalikan', 'terlambat'])->default('dipinjam')->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE bmn_asset_loans DROP CONSTRAINT IF EXISTS bmn_asset_loans_status_check");
            DB::statement("ALTER TABLE bmn_asset_loans ADD CONSTRAINT bmn_asset_loans_status_check CHECK (status::text = ANY (ARRAY['dipinjam'::text, 'dikembalikan'::text]))");
        }
    }
};
