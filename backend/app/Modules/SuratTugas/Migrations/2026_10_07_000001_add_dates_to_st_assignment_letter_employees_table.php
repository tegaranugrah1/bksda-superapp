<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_assignment_letter_employees', function (Blueprint $table) {
            $table->date('tanggal_mulai')->nullable()->after('peran');
            $table->date('tanggal_selesai')->nullable()->after('tanggal_mulai');
        });
    }

    public function down(): void
    {
        Schema::table('st_assignment_letter_employees', function (Blueprint $table) {
            $table->dropColumn(['tanggal_mulai', 'tanggal_selesai']);
        });
    }
};
