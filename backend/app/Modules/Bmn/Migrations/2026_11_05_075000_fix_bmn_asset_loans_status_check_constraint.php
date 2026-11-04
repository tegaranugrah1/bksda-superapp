<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE bmn_asset_loans DROP CONSTRAINT IF EXISTS bmn_asset_loans_status_check");
            DB::statement("ALTER TABLE bmn_asset_loans ADD CONSTRAINT bmn_asset_loans_status_check CHECK (status::text = ANY (ARRAY['dipinjam'::text, 'dikembalikan'::text, 'terlambat'::text]))");
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
