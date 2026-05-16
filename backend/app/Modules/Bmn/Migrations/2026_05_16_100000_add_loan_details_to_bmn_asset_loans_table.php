<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add new columns
        Schema::table('bmn_asset_loans', function (Blueprint $table) {
            $table->date('due_date')->nullable()->after('tanggal_pinjam')->comment('Tanggal jatuh tempo pengembalian');
            $table->text('purpose')->nullable()->comment('Tujuan peminjaman');
            $table->text('notes')->nullable()->comment('Catatan tambahan');
            $table->string('return_condition', 50)->nullable()->comment('Kondisi saat dikembalikan: Baik, Rusak Ringan, Rusak Berat');
        });

        // 2. Convert status from enum to varchar for flexibility (PostgreSQL)
        // First check if it's an enum type and convert
        DB::statement("ALTER TABLE bmn_asset_loans ALTER COLUMN status TYPE VARCHAR(20)");
        DB::statement("ALTER TABLE bmn_asset_loans ALTER COLUMN status SET DEFAULT 'dipinjam'");
    }

    public function down(): void
    {
        Schema::table('bmn_asset_loans', function (Blueprint $table) {
            $table->dropColumn(['due_date', 'purpose', 'notes', 'return_condition']);
        });
    }
};
