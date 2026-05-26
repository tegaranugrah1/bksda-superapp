<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->string('template_type', 50)->nullable()->after('kode_surat')->comment('Tag template ST, contoh: bmn-pemeriksaan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->dropColumn('template_type');
        });
    }
};
