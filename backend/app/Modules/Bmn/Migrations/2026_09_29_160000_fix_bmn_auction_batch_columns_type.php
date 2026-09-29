<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Ensures user/employee reference columns in bmn_auction_batches and bmn_auction_batch_events
     * are BIGINT instead of legacy UUID (fixing 500 error on production PostgreSQL).
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                DO $$ 
                BEGIN 
                    -- bmn_auction_batches.created_by
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'bmn_auction_batches' AND column_name = 'created_by' AND data_type = 'uuid'
                    ) THEN
                        ALTER TABLE bmn_auction_batches ALTER COLUMN created_by TYPE BIGINT USING NULL;
                    END IF;

                    -- bmn_auction_batches.updated_by
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'bmn_auction_batches' AND column_name = 'updated_by' AND data_type = 'uuid'
                    ) THEN
                        ALTER TABLE bmn_auction_batches ALTER COLUMN updated_by TYPE BIGINT USING NULL;
                    END IF;

                    -- bmn_auction_batches.kepala_balai_id
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'bmn_auction_batches' AND column_name = 'kepala_balai_id' AND data_type = 'uuid'
                    ) THEN
                        ALTER TABLE bmn_auction_batches ALTER COLUMN kepala_balai_id TYPE BIGINT USING NULL;
                    END IF;

                    -- bmn_auction_batch_events.actor_id
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'bmn_auction_batch_events' AND column_name = 'actor_id' AND data_type = 'uuid'
                    ) THEN
                        ALTER TABLE bmn_auction_batch_events ALTER COLUMN actor_id TYPE BIGINT USING NULL;
                    END IF;
                END $$;
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to revert BIGINT back to incompatible UUID.
    }
};
