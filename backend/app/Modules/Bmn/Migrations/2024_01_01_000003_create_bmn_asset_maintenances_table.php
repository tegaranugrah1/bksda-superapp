<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_asset_maintenances', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('asset_id')->constrained('bmn_assets')->cascadeOnDelete();

            $table->date('tanggal_service');
            $table->decimal('biaya', 15, 2)->default(0);
            $table->text('deskripsi');
            $table->string('bukti_nota_url', 1000)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_maintenances');
    }
};
