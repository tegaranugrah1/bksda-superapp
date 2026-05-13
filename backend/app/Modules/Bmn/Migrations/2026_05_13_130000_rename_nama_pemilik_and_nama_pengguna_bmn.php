<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->renameColumn('nama_pemilik', 'nama');
            $table->renameColumn('nama_pengguna_bmn', 'nama_pengguna');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->renameColumn('nama', 'nama_pemilik');
            $table->renameColumn('nama_pengguna', 'nama_pengguna_bmn');
        });
    }
};
