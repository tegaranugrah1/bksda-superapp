<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\StTemplate;
use App\Modules\Kepegawaian\Requests\StoreStTemplateRequest;
use App\Modules\Kepegawaian\Requests\UpdateStTemplateRequest;
use App\Modules\Kepegawaian\Resources\StTemplateResource;
use App\Modules\Kepegawaian\Services\StTemplateService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StTemplateController extends Controller
{
    public function __construct(private readonly StTemplateService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $includeInactive = $request->user()?->role === 'super_admin'
            && $request->boolean('include_inactive');

        return StTemplateResource::collection(
            $this->service->list($includeInactive, (int) $request->query('per_page', 50))
        );
    }

    public function show(Request $request, int $id): StTemplateResource
    {
        $query = StTemplate::with('defaultSigner');
        if ($request->user()?->role !== 'super_admin') {
            $query->where('is_active', true);
        }

        return new StTemplateResource($query->findOrFail($id));
    }

    public function store(StoreStTemplateRequest $request): JsonResponse
    {
        try {
            $template = $this->service->create($request->validated(), (int) $request->user()->id);

            return (new StTemplateResource($template))
                ->response()
                ->setStatusCode(201);
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function update(UpdateStTemplateRequest $request, int $id): StTemplateResource|JsonResponse
    {
        try {
            $template = StTemplate::with('defaultSigner')->findOrFail($id);

            return new StTemplateResource(
                $this->service->update($template, $request->validated(), (int) $request->user()->id)
            );
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function setDefault(Request $request, int $id): StTemplateResource|JsonResponse
    {
        try {
            $template = StTemplate::findOrFail($id);

            return new StTemplateResource(
                $this->service->setDefault($template, (int) $request->user()->id)
            );
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function toggleActive(Request $request, int $id): StTemplateResource|JsonResponse
    {
        try {
            $validated = $request->validate(['is_active' => ['required', 'boolean']]);
            $template = StTemplate::findOrFail($id);

            return new StTemplateResource(
                $this->service->toggleActive($template, (bool) $validated['is_active'], (int) $request->user()->id)
            );
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function duplicate(Request $request, int $id): JsonResponse
    {
        $template = StTemplate::findOrFail($id);
        $copy = $this->service->duplicate($template, (int) $request->user()->id);

        return (new StTemplateResource($copy))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->service->delete(StTemplate::findOrFail($id));

            return response()->json(['message' => 'Template berhasil dihapus.']);
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
