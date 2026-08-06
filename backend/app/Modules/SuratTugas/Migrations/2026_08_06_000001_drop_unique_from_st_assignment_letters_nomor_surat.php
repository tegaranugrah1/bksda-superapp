<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->dropUnique('st_assignment_letters_nomor_surat_unique');
        });
    }

    public function down(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->unique('nomor_surat');
        });
    }
};
