<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_auction_batch_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('bmn_auction_batch_id');
            $table->uuid('bmn_asset_id')->nullable();
            $table->uuid('actor_id')->nullable();
            $table->string('action', 80);
            $table->jsonb('previous_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('bmn_auction_batch_id')
                ->references('id')
                ->on('bmn_auction_batches')
                ->cascadeOnDelete();

            $table->foreign('bmn_asset_id')
                ->references('id')
                ->on('bmn_assets')
                ->nullOnDelete();

            $table->index('bmn_auction_batch_id');
            $table->index('bmn_asset_id');
            $table->index('actor_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_auction_batch_events');
    }
};
