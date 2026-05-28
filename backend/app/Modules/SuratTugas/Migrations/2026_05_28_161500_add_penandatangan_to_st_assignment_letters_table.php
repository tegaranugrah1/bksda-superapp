<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->string('penandatangan_nama')->nullable()->after('tembusan');
            $table->string('penandatangan_nip', 50)->nullable()->after('penandatangan_nama');
        });
    }

    public function down(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->dropColumn(['penandatangan_nama', 'penandatangan_nip']);
        });
    }
};
