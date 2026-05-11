<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kpg_employees', function (Blueprint $table) {
            $table->string('resor')->nullable()->after('satuan_kerja')->comment('Detail penempatan resor (untuk Seksi) atau urusan (untuk Kantor Balai)');
        });
    }

    public function down(): void
    {
        Schema::table('kpg_employees', function (Blueprint $table) {
            $table->dropColumn('resor');
        });
    }
};
