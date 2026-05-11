<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->date('tanggal_surat')->nullable()->after('status');
            $table->string('sumber_dana')->nullable()->after('tanggal_surat');
            $table->text('sumber_dana_other')->nullable()->after('sumber_dana');
            $table->json('menimbang')->nullable()->after('sumber_dana_other');
            $table->json('dasar')->nullable()->after('menimbang');
            $table->string('kode_surat')->nullable()->after('nomor_surat');
        });
    }

    public function down(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->dropColumn([
                'tanggal_surat',
                'sumber_dana',
                'sumber_dana_other',
                'menimbang',
                'dasar',
                'kode_surat'
            ]);
        });
    }
};
