<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_asset_auction_batch', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('bmn_auction_batch_id');
            $table->uuid('bmn_asset_id');

            $table->string('lot_number', 50)->nullable();
            $table->decimal('nilai_taksiran', 15, 2)->nullable();
            $table->jsonb('kertas_kerja_data')->nullable();
            $table->integer('sort_order')->default(0);

            $table->jsonb('asset_snapshot')->nullable();
            $table->jsonb('freeze_snapshot')->nullable();

            $table->boolean('first_auction_is_sold')->nullable();
            $table->decimal('first_auction_price', 15, 2)->nullable();
            $table->boolean('reauction_is_sold')->nullable();
            $table->decimal('reauction_price', 15, 2)->nullable();

            $table->string('final_result', 30)->nullable();
            $table->decimal('final_price', 15, 2)->nullable();
            $table->date('final_auction_date')->nullable();
            $table->timestamp('disposed_at')->nullable();

            $table->timestamps();

            $table->foreign('bmn_auction_batch_id')
                ->references('id')
                ->on('bmn_auction_batches')
                ->cascadeOnDelete();

            $table->foreign('bmn_asset_id')
                ->references('id')
                ->on('bmn_assets')
                ->restrictOnDelete();

            $table->unique(['bmn_auction_batch_id', 'bmn_asset_id'], 'batch_asset_unique');
            $table->index('bmn_asset_id');
            $table->index('lot_number');
            $table->index('final_result');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_auction_batch');
    }
};
