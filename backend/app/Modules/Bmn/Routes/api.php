<?php

use App\Modules\Bmn\Controllers\AssetController;
use App\Modules\Bmn\Controllers\AssetDocumentController;
use App\Modules\Bmn\Controllers\AssetPhotoController;
use App\Modules\Bmn\Controllers\CoveringLetterController;
use App\Modules\Bmn\Controllers\DashboardController;
use App\Modules\Bmn\Controllers\DocumentHistoryController;
use App\Modules\Bmn\Controllers\ExportController;
use App\Modules\Bmn\Controllers\HandoverAgreementController;
use App\Modules\Bmn\Controllers\ImportReviewController;
use App\Modules\Bmn\Controllers\LoanController;
use App\Modules\Bmn\Controllers\MaintenanceController;
use App\Modules\Bmn\Controllers\PowerOfAttorneyController;
use App\Modules\Bmn\Controllers\UsageAgreementController;
use App\Modules\Bmn\Controllers\AuctionBatchController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| BMN (Barang Milik Negara) Routes
|--------------------------------------------------------------------------
| Base URL Prefix: /api/bmn
| Perlindungan: auth:sanctum, module.access:bmn
|--------------------------------------------------------------------------
*/

Route::get('/dashboard/stats', [DashboardController::class, 'stats'])->middleware('permission:bmn.view');

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'module' => 'BMN',
        'message' => '🏛️ Sirkuit Keuangan Barang Milik Negara Aktif & Terlindungi!',
    ]);
});

// 4. EXPORT EXCEL (harus sebelum apiResource/custom routes agar tidak conflict)
Route::get('assets/export', [ExportController::class, 'assets'])->middleware('permission:bmn.view');
Route::get('loans/export', [ExportController::class, 'loans'])->middleware('permission:bmn.view');
Route::get('maintenances/export', [ExportController::class, 'maintenances'])->middleware('permission:bmn.view');
Route::get('document-histories', [DocumentHistoryController::class, 'index'])->middleware('permission:bmn.document.history.view');

// 4b. BERITA ACARA PEMAKAIAN BMN
Route::get('usage-agreements', [UsageAgreementController::class, 'index'])->middleware('permission:bmn.document.history.view');
Route::post('usage-agreements', [UsageAgreementController::class, 'store'])->middleware('permission:bmn.document.generate');
Route::get('usage-agreements/{agreement}', [UsageAgreementController::class, 'show'])->middleware('permission:bmn.document.history.view');

// 4c. BERITA ACARA SERAH TERIMA BMN
Route::get('handover-agreements', [HandoverAgreementController::class, 'index'])->middleware('permission:bmn.document.history.view');
Route::post('handover-agreements', [HandoverAgreementController::class, 'store'])->middleware('permission:bmn.document.generate');
Route::get('handover-agreements/{agreement}', [HandoverAgreementController::class, 'show'])->middleware('permission:bmn.document.history.view');

// 4d. SURAT KUASA KENDARAAN BMN
Route::get('power-of-attorneys', [PowerOfAttorneyController::class, 'index'])->middleware('permission:bmn.document.history.view');
Route::post('power-of-attorneys', [PowerOfAttorneyController::class, 'store'])->middleware('permission:bmn.document.generate');
Route::get('power-of-attorneys/{agreement}', [PowerOfAttorneyController::class, 'show'])->middleware('permission:bmn.document.history.view');

// 4e. SURAT PENGANTAR BMN
Route::get('covering-letters', [CoveringLetterController::class, 'index'])->middleware('permission:bmn.document.history.view');
Route::post('covering-letters', [CoveringLetterController::class, 'store'])->middleware('permission:bmn.document.generate');
Route::get('covering-letters/{letter}', [CoveringLetterController::class, 'show'])->middleware('permission:bmn.document.history.view');

// 1. JALUR MASTER ASET (Didefinisikan manual agar granular)
Route::get('assets', [AssetController::class, 'index'])->middleware('permission:bmn.view');
Route::get('assets/{asset}', [AssetController::class, 'show'])->middleware('permission:bmn.view');
Route::post('assets', [AssetController::class, 'store'])->middleware('permission:bmn.asset.create');
Route::match(['put', 'patch'], 'assets/{asset}', [AssetController::class, 'update'])->middleware('permission:bmn.asset.update');
Route::post('assets/{asset}/verify', [AssetController::class, 'verify'])->middleware('permission:bmn.asset.update');

// 6. IMPORT REVIEW/DIFF/APPROVE
Route::prefix('import-review')->group(function () {
    Route::get('/', [ImportReviewController::class, 'index'])->middleware('permission:bmn.import.review');
    Route::get('/{batchId}', [ImportReviewController::class, 'show'])->middleware('permission:bmn.import.review');
    Route::post('/toggle-selection', [ImportReviewController::class, 'toggleSelection'])->middleware('permission:bmn.import.review');
    Route::post('/toggle-field-selection', [ImportReviewController::class, 'toggleFieldSelection'])->middleware('permission:bmn.import.review');
    Route::post('/bulk-selection', [ImportReviewController::class, 'bulkSelection'])->middleware('permission:bmn.import.review');
});

// Aksi mutasi besar/destruktif BMN yang memerlukan permission khusus
Route::delete('usage-agreements/{agreement}', [UsageAgreementController::class, 'destroy'])->middleware('permission:bmn.document.delete');
Route::delete('handover-agreements/{agreement}', [HandoverAgreementController::class, 'destroy'])->middleware('permission:bmn.document.delete');
Route::delete('power-of-attorneys/{agreement}', [PowerOfAttorneyController::class, 'destroy'])->middleware('permission:bmn.document.delete');
Route::delete('covering-letters/{letter}', [CoveringLetterController::class, 'destroy'])->middleware('permission:bmn.document.delete');

Route::post('assets/import', [AssetController::class, 'import'])->middleware('permission:bmn.import.review');
Route::delete('assets/{asset}/dispose', [AssetController::class, 'dispose'])->middleware('permission:bmn.asset.dispose');
Route::post('assets/bulk-dispose', [AssetController::class, 'bulkDispose'])->middleware('permission:bmn.asset.dispose');
Route::post('assets/bulk-restore', [AssetController::class, 'bulkRestore'])->middleware('permission:bmn.asset.dispose');
Route::post('assets/bulk-force-delete', [AssetController::class, 'bulkForceDelete'])->middleware('permission:bmn.asset.force_delete');
Route::post('assets/bulk-update-kondisi', [AssetController::class, 'bulkUpdateKondisi'])->middleware('permission:bmn.asset.update');

Route::prefix('import-review')->group(function () {
    Route::post('/upload', [ImportReviewController::class, 'upload'])->middleware('permission:bmn.import.review');
    Route::post('/{batchId}/approve', [ImportReviewController::class, 'approve'])->middleware('permission:bmn.import.approve');
    Route::post('/{batchId}/reject', [ImportReviewController::class, 'reject'])->middleware('permission:bmn.import.approve');
});

// 5. FOTO ASET
Route::post('assets/{asset}/photo', [AssetPhotoController::class, 'upload'])->middleware('permission:bmn.asset.update');
Route::post('assets/{asset}/geotag', [AssetPhotoController::class, 'updateGeotag'])->middleware('permission:bmn.asset.update');
Route::post('assets/{asset}/document', [AssetDocumentController::class, 'upload'])->middleware('permission:bmn.asset.update');
Route::delete('assets/{asset}/document/{type}', [AssetDocumentController::class, 'delete'])->middleware('permission:bmn.asset.update');
Route::get('assets/{asset}/document/{type}/view', [AssetDocumentController::class, 'view'])->middleware('permission:bmn.view');
Route::get('assets/{asset}/document/{type}/preview', [AssetDocumentController::class, 'preview'])->middleware('permission:bmn.view');
Route::get('assets/{asset}/document/{type}/preview/{page}', [AssetDocumentController::class, 'previewPage'])->whereNumber('page')->middleware('permission:bmn.view');
Route::get('assets/{asset}/document/{type}/download', [AssetDocumentController::class, 'download'])->middleware('permission:bmn.view');
Route::delete('assets/{asset}/photo/{type}', [AssetPhotoController::class, 'delete'])->middleware('permission:bmn.asset.update');
Route::get('assets/{asset}/photo/{type}/download', [AssetPhotoController::class, 'download'])->middleware('permission:bmn.view');
Route::get('assets/{asset}/photo/{type}/view', [AssetPhotoController::class, 'view'])->name('bmn.photos.view')->middleware('permission:bmn.view');
Route::get('assets/{asset}/photos/download-all', [AssetPhotoController::class, 'downloadAll'])->middleware('permission:bmn.view');

// 2. LALU LINTAS PEMINJAMAN (LOAN)
Route::get('loans', [LoanController::class, 'index'])->middleware('permission:bmn.view');
Route::post('loans', [LoanController::class, 'store'])->middleware('permission:bmn.asset.update');
Route::put('loans/{loan}', [LoanController::class, 'update'])->middleware('permission:bmn.asset.update');
Route::delete('loans/{loan}', [LoanController::class, 'destroy'])->middleware('permission:bmn.asset.update');
Route::post('assets/{asset}/loans', [LoanController::class, 'borrow'])->middleware('permission:bmn.asset.update');
Route::post('loans/{loan}/return', [LoanController::class, 'return'])->middleware('permission:bmn.asset.update');

// 3. REKAM MEDIS PEMELIHARAAN (MAINTENANCE)
Route::get('maintenances', [MaintenanceController::class, 'index'])->middleware('permission:bmn.view');
Route::post('assets/{asset}/maintenances', [MaintenanceController::class, 'record'])->middleware('permission:bmn.asset.update');

// 7. PAKET DOKUMEN LELANG BMN
Route::get('/auction-candidates', [AuctionBatchController::class, 'candidates'])
    ->middleware('permission:bmn.auction.view');

Route::prefix('auction-batches')->group(function () {
    Route::get('/', [AuctionBatchController::class, 'index'])->middleware('permission:bmn.auction.view');
    Route::post('/', [AuctionBatchController::class, 'store'])->middleware('permission:bmn.auction.create');
    Route::get('/{id}', [AuctionBatchController::class, 'show'])->middleware('permission:bmn.auction.view');
    Route::delete('/{id}', [AuctionBatchController::class, 'destroy'])->middleware('permission:bmn.auction.delete');

    Route::get('/{id}/checklist', [AuctionBatchController::class, 'checklist'])->middleware('permission:bmn.auction.view');
    Route::post('/{id}/assets', [AuctionBatchController::class, 'addAssets'])->middleware('permission:bmn.auction.update');
    Route::delete('/{id}/assets/{assetId}', [AuctionBatchController::class, 'removeAsset'])->middleware('permission:bmn.auction.update');
    Route::put('/{id}/assets/order', [AuctionBatchController::class, 'updateOrder'])->middleware('permission:bmn.auction.update');
    Route::put('/{id}/assets/{assetId}/valuation', [AuctionBatchController::class, 'updateValuation'])->middleware('permission:bmn.auction.update');
    Route::patch('/{id}/draft-metadata', [AuctionBatchController::class, 'updateDraftMetadata'])->middleware('permission:bmn.auction.update');
    Route::post('/{id}/transition', [AuctionBatchController::class, 'transition']);
    Route::post('/{id}/first-auction-results', [AuctionBatchController::class, 'recordFirstAuctionResults'])->middleware('permission:bmn.auction.finalize');
    Route::post('/{id}/reauction-results', [AuctionBatchController::class, 'recordReauctionResults'])->middleware('permission:bmn.auction.finalize');
    Route::post('/{id}/realize', [AuctionBatchController::class, 'realize'])->middleware('permission:bmn.auction.finalize');
    Route::get('/{id}/documents/context', [AuctionBatchController::class, 'documentContext'])->middleware('permission:bmn.auction.print');
    Route::post('/{id}/documents/{documentKey}/print-event', [AuctionBatchController::class, 'recordPrintEvent'])->middleware('permission:bmn.auction.print');
    Route::get('/{id}/events', [AuctionBatchController::class, 'events'])->middleware('permission:bmn.auction.view');
});
