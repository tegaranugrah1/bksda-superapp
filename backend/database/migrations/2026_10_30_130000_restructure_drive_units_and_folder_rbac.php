<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Tambah kolom hierarki & otorisasi pada drive_folders
        Schema::table('drive_folders', function (Blueprint $table) {
            $table->boolean('is_restricted')->default(false);
            $table->string('folder_scope', 32)->nullable(); // 'resor' | 'ruangan' | 'submission' | 'general'
            $table->string('resor_code', 32)->nullable()->index();
            $table->string('room_code', 32)->nullable()->index();
        });

        // 2. Tambah kolom drive_folder_id pada dr_form_responses
        Schema::table('dr_form_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('drive_folder_id')->nullable()->index();
        });

        // 3. Tambah folder_id pada drive_shares dan jadikan file_id nullable
        Schema::table('drive_shares', function (Blueprint $table) {
            $table->unsignedBigInteger('folder_id')->nullable()->index();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE drive_shares ALTER COLUMN file_id DROP NOT NULL');
        }

        // 4. Bersihkan unit lama ID > 4 (terverifikasi 0 berkas & 0 folder)
        DB::table('drive_units')->where('id', '>', 4)->delete();
    }

    public function down(): void
    {
        Schema::table('drive_shares', function (Blueprint $table) {
            $table->dropColumn('folder_id');
        });

        Schema::table('dr_form_responses', function (Blueprint $table) {
            $table->dropColumn('drive_folder_id');
        });

        Schema::table('drive_folders', function (Blueprint $table) {
            $table->dropColumn(['is_restricted', 'folder_scope', 'resor_code', 'room_code']);
        });
    }
};
