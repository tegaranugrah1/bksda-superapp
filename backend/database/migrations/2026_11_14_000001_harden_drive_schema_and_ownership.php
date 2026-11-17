<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drive_uploads', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'drive_uploads_user_status_idx');
            $table->index(['unit_id', 'status'], 'drive_uploads_unit_status_idx');
        });

        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('drive_shares', function (Blueprint $table) {
                $table->foreign('folder_id')
                    ->references('id')
                    ->on('drive_folders')
                    ->cascadeOnDelete();
            });

            Schema::table('drive_folders', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
            });

            Schema::table('drive_files', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('drive_files', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });

            Schema::table('drive_folders', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });

            Schema::table('drive_shares', function (Blueprint $table) {
                $table->dropForeign(['folder_id']);
            });
        }

        Schema::table('drive_uploads', function (Blueprint $table) {
            $table->dropIndex('drive_uploads_user_status_idx');
            $table->dropIndex('drive_uploads_unit_status_idx');
        });
    }
};
