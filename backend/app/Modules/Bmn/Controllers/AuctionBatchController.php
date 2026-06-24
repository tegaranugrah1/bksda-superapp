<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use App\Modules\Bmn\Support\AuctionBatchEventAction;
use App\Modules\Bmn\Services\AuctionBatchService;
use App\Modules\Bmn\Services\AuctionBatchCompletenessChecker;
use App\Modules\Bmn\Requests\CreateAuctionBatchRequest;
use App\Modules\Bmn\Requests\AddAuctionAssetsRequest;
use App\Modules\Bmn\Requests\UpdateAuctionAssetOrderRequest;
use App\Modules\Bmn\Requests\UpdateAuctionValuationRequest;
use App\Modules\Bmn\Requests\UpdateAuctionBatchDraftMetadataRequest;
use App\Modules\Bmn\Requests\TransitionAuctionBatchRequest;
use App\Modules\Bmn\Requests\FirstAuctionResultsRequest;
use App\Modules\Bmn\Requests\ReauctionResultsRequest;
use App\Modules\Bmn\Requests\PrintAuctionDocumentEventRequest;
use App\Modules\Bmn\Resources\AuctionBatchResource;
use App\Modules\Bmn\Resources\AuctionBatchAssetResource;
use App\Modules\Bmn\Resources\AuctionBatchEventResource;
use App\Modules\Bmn\Resources\AuctionCandidateAssetResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuctionBatchController extends Controller
{
    public function __construct(
        private AuctionBatchService $service
    ) {}

    /**
     * List all auction batches (Task 35).
     *
     * @param Request $request
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public function index(Request $request)
    {
        $query = AuctionBatch::query()->withCount('assets');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'ilike', "%{$search}%")
                  ->orWhere('batch_number', 'ilike', "%{$search}%");
        }

        $query->latest();

        return AuctionBatchResource::collection($query->paginate(15));
    }

    /**
     * Store a new draft batch (Task 35).
     *
     * @param CreateAuctionBatchRequest $request
     * @return JsonResponse
     */
    public function store(CreateAuctionBatchRequest $request): JsonResponse
    {
        $batch = $this->service->createBatch($request->validated());

        return (new AuctionBatchResource($batch))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Show details of a batch (Task 35).
     *
     * @param string $id
     * @return AuctionBatchResource
     */
    public function show(string $id): AuctionBatchResource
    {
        $batch = AuctionBatch::with(['assets' => function ($q) {
            $q->orderBy('bmn_asset_auction_batch.sort_order');
        }])->findOrFail($id);

        return new AuctionBatchResource($batch);
    }

    /**
     * Delete a draft batch (Task 35).
     *
     * @param string $id
     * @return JsonResponse
     * @throws ValidationException
     */
    public function destroy(string $id): JsonResponse
    {
        $batch = AuctionBatch::findOrFail($id);

        if (!$batch->isDraft()) {
            throw ValidationException::withMessages([
                'status' => 'Hanya paket lelang berstatus DRAFT yang dapat dihapus.',
            ]);
        }

        $batch->delete();

        return response()->json([
            'message' => 'Paket lelang berhasil dihapus.',
        ]);
    }

    /**
     * List candidates for lelang (Task 35).
     *
     * @param Request $request
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public function candidates(Request $request)
    {
        $candidates = $this->service->getCandidates($request->all());
        return AuctionCandidateAssetResource::collection($candidates);
    }

    /**
     * Check completeness checklist (Task 35).
     *
     * @param string $id
     * @return JsonResponse
     */
    public function checklist(string $id): JsonResponse
    {
        $batch = AuctionBatch::findOrFail($id);
        $checker = app(AuctionBatchCompletenessChecker::class);
        $checklist = $checker->check($batch);

        return response()->json($checklist);
    }

    /**
     * Add assets to draft batch (Task 35).
     *
     * @param string $id
     * @param AddAuctionAssetsRequest $request
     * @return AuctionBatchResource
     */
    public function addAssets(string $id, AddAuctionAssetsRequest $request): AuctionBatchResource
    {
        $batch = $this->service->addAssets($id, $request->input('asset_ids'));
        return new AuctionBatchResource($batch);
    }

    /**
     * Remove asset from draft batch (Task 35).
     *
     * @param string $id
     * @param string $assetId
     * @return AuctionBatchResource
     */
    public function removeAsset(string $id, string $assetId): AuctionBatchResource
    {
        $batch = $this->service->removeAsset($id, $assetId);
        return new AuctionBatchResource($batch);
    }

    /**
     * Update ordered assets (Task 35).
     *
     * @param string $id
     * @param UpdateAuctionAssetOrderRequest $request
     * @return JsonResponse
     */
    public function updateOrder(string $id, UpdateAuctionAssetOrderRequest $request): JsonResponse
    {
        $this->service->updateSortOrder($id, $request->input('ordered_asset_ids'));

        return response()->json([
            'message' => 'Urutan aset berhasil diperbarui.',
        ]);
    }

    /**
     * Update asset valuation in draft (Task 35).
     *
     * @param string $id
     * @param string $assetId
     * @param UpdateAuctionValuationRequest $request
     * @return JsonResponse
     */
    public function updateValuation(string $id, string $assetId, UpdateAuctionValuationRequest $request): JsonResponse
    {
        $pivot = $this->service->updateValuation($id, $assetId, $request->validated());

        return response()->json([
            'message' => 'Nilai taksiran aset berhasil diperbarui.',
            'data' => $pivot,
        ]);
    }

    /**
     * Update draft metadata without transitioning status.
     *
     * @param string $id
     * @param UpdateAuctionBatchDraftMetadataRequest $request
     * @return AuctionBatchResource
     */
    public function updateDraftMetadata(string $id, UpdateAuctionBatchDraftMetadataRequest $request): AuctionBatchResource
    {
        $batch = $this->service->updateDraftMetadata($id, $request->validated(), Auth::id());

        return new AuctionBatchResource($batch);
    }

    /**
     * Transition batch status (Task 35).
     *
     * @param string $id
     * @param TransitionAuctionBatchRequest $request
     * @return AuctionBatchResource
     */
    public function transition(string $id, TransitionAuctionBatchRequest $request): AuctionBatchResource
    {
        $status = $request->input('status');
        $validated = $request->validated();
        $actorId = Auth::id();

        if ($status === 'DIAJUKAN') {
            $batch = $this->service->lockAndSubmit($id, $validated, $actorId);
        } elseif ($status === 'JADWAL_DITETAPKAN') {
            $batch = $this->service->recordSchedule($id, $validated, $actorId);
        } elseif ($status === 'LELANG_ULANG') {
            $batch = $this->service->startReauction($id, $validated, $actorId);
        } elseif ($status === 'REALISASI') {
            $batch = $this->service->realize($id, $actorId);
        } elseif ($status === 'BATAL') {
            $batch = $this->service->cancel($id, $request->input('notes'), $actorId);
        } else {
            throw ValidationException::withMessages([
                'status' => 'Status transisi tidak didukung.',
            ]);
        }

        return new AuctionBatchResource($batch);
    }

    /**
     * Record first auction results (Task 35).
     *
     * @param string $id
     * @param FirstAuctionResultsRequest $request
     * @return AuctionBatchResource
     */
    public function recordFirstAuctionResults(string $id, FirstAuctionResultsRequest $request): AuctionBatchResource
    {
        $batch = $this->service->recordFirstAuctionResults($id, $request->input('assets'));
        return new AuctionBatchResource($batch);
    }

    /**
     * Record reauction results (Task 35).
     *
     * @param string $id
     * @param ReauctionResultsRequest $request
     * @return AuctionBatchResource
     */
    public function recordReauctionResults(string $id, ReauctionResultsRequest $request): AuctionBatchResource
    {
        $batch = $this->service->recordReauctionResults($id, $request->input('assets'));
        return new AuctionBatchResource($batch);
    }

    /**
     * Realize batch (Task 35).
     *
     * @param string $id
     * @return AuctionBatchResource
     */
    public function realize(string $id): AuctionBatchResource
    {
        $batch = $this->service->realize($id);
        return new AuctionBatchResource($batch);
    }

    /**
     * Get document printing context of the batch (Task 35 & Task 53).
     *
     * @param string $id
     * @return JsonResponse
     */
    public function documentContext(string $id): JsonResponse
    {
        $batch = AuctionBatch::with(['assets' => function ($q) {
            $q->orderBy('bmn_asset_auction_batch.sort_order');
        }])->findOrFail($id);

        $context = [
            'metadata_schema_version' => $batch->metadata['schema_version'] ?? 1,
            'batch_id' => $batch->id,
            'batch_number' => $batch->batch_number,
            'name' => $batch->name,
            'status' => $batch->status instanceof AuctionBatchStatus ? $batch->status->value : $batch->status,
            'no_surat_persetujuan' => $batch->no_surat_persetujuan,
            'tanggal_surat_persetujuan' => $batch->tanggal_surat_persetujuan ? $batch->tanggal_surat_persetujuan->toDateString() : null,
            'no_surat_penetapan' => $batch->no_surat_penetapan,
            'tanggal_lelang' => $batch->tanggal_lelang ? $batch->tanggal_lelang->toDateString() : null,
            'no_surat_jadwal_ulang' => $batch->no_surat_jadwal_ulang,
            'tanggal_lelang_ulang' => $batch->tanggal_lelang_ulang ? $batch->tanggal_lelang_ulang->toDateString() : null,
            'reauction_count' => $batch->reauction_count,
            'metadata' => $batch->metadata,
            'assets' => AuctionBatchAssetResource::collection($batch->assets),
        ];

        return response()->json([
            'data' => $context,
        ]);
    }

    /**
     * Record document printing event (Task 35 & Task 53).
     *
     * @param string $id
     * @param string $documentKey
     * @param PrintAuctionDocumentEventRequest $request
     * @return JsonResponse
     */
    public function recordPrintEvent(string $id, string $documentKey, PrintAuctionDocumentEventRequest $request): JsonResponse
    {
        $actorId = Auth::id();
        $batch = AuctionBatch::findOrFail($id);

        $notes = $request->input('notes') ?? "Dokumen {$documentKey} berhasil dicetak.";

        $this->service->auditLogger->log(
            $id,
            AuctionBatchEventAction::DOCUMENT_PRINTED,
            $actorId,
            null,
            null,
            ['document_key' => $documentKey],
            $notes
        );

        return response()->json([
            'message' => 'Event cetak dokumen berhasil dicatat.',
        ]);
    }

    /**
     * Get audit events for the batch (Task 35).
     *
     * @param string $id
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public function events(string $id)
    {
        $batch = AuctionBatch::findOrFail($id);
        $events = $batch->events()->with(['actor', 'asset'])->latest('created_at')->get();

        return AuctionBatchEventResource::collection($events);
    }
}
