<?php

namespace App\Modules\Bmn\Support;

final class AuctionBatchEventAction
{
    public const BATCH_CREATED = 'batch.created';
    public const BATCH_UPDATED = 'batch.updated';
    public const BATCH_CANCELED = 'batch.canceled';
    public const STATUS_CHANGED = 'status.changed';
    public const ASSET_ADDED = 'asset.added';
    public const ASSET_REMOVED = 'asset.removed';
    public const ASSET_ORDER_UPDATED = 'asset.order.updated';
    public const ASSET_VALUATION_UPDATED = 'asset.valuation.updated';
    public const DRAFT_METADATA_UPDATED = 'draft.metadata.updated';
    public const BATCH_LOCKED = 'batch.locked';
    public const ASSET_FREEZE_SNAPSHOT_CREATED = 'asset.freeze_snapshot.created';
    public const SCHEDULE_RECORDED = 'schedule.recorded';
    public const DOCUMENT_PRINTED = 'document.printed';
    public const FIRST_AUCTION_RESULT_RECORDED = 'first_auction.result.recorded';
    public const REAUCTION_STARTED = 'reauction.started';
    public const REAUCTION_RESULT_RECORDED = 'reauction.result.recorded';
    public const REALIZATION_FINALIZED = 'realization.finalized';
    public const ASSET_DISPOSED = 'asset.disposed';
    public const ASSET_RESTORED = 'asset.restored';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return [
            self::BATCH_CREATED,
            self::BATCH_UPDATED,
            self::BATCH_CANCELED,
            self::STATUS_CHANGED,
            self::ASSET_ADDED,
            self::ASSET_REMOVED,
            self::ASSET_ORDER_UPDATED,
            self::ASSET_VALUATION_UPDATED,
            self::DRAFT_METADATA_UPDATED,
            self::BATCH_LOCKED,
            self::ASSET_FREEZE_SNAPSHOT_CREATED,
            self::SCHEDULE_RECORDED,
            self::DOCUMENT_PRINTED,
            self::FIRST_AUCTION_RESULT_RECORDED,
            self::REAUCTION_STARTED,
            self::REAUCTION_RESULT_RECORDED,
            self::REALIZATION_FINALIZED,
            self::ASSET_DISPOSED,
            self::ASSET_RESTORED,
        ];
    }
}
