<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->string('tempat_tujuan')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->string('tempat_tujuan')->nullable(false)->change();
        });
    }
};
