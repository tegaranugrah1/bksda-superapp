<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Anonymous official submissions have no user owner; DriveAccess denies
        // ordinary users unless an explicit folder/unit/share grants access.
        Schema::table('drive_files', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::table('drive_files')->whereNull('user_id')->exists()) {
            throw new RuntimeException('Assign owners to system archives before restoring the NOT NULL constraint.');
        }

        Schema::table('drive_files', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }
};
