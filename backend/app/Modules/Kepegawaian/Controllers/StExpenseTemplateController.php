<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\StExpenseTemplate;
use App\Modules\Kepegawaian\Requests\StoreStExpenseTemplateRequest;
use App\Modules\Kepegawaian\Requests\UpdateStExpenseTemplateRequest;
use App\Modules\Kepegawaian\Resources\StExpenseTemplateResource;
use App\Modules\Kepegawaian\Services\StExpenseTemplateService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StExpenseTemplateController extends Controller
{
    public function __construct(private readonly StExpenseTemplateService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->all();
        // If not super_admin or admin requesting inactive, only show active
        if ($request->user()?->role !== 'super_admin' && $request->user()?->role !== 'admin') {
            $filters['active_only'] = true;
        }

        return StExpenseTemplateResource::collection(
            $this->service->paginate($filters)
        );
    }

    public function show(Request $request, int $id): StExpenseTemplateResource
    {
        $query = StExpenseTemplate::query();
        if ($request->user()?->role !== 'super_admin' && $request->user()?->role !== 'admin') {
            $query->where('is_active', true);
        }

        return new StExpenseTemplateResource($query->findOrFail($id));
    }

    public function store(StoreStExpenseTemplateRequest $request): JsonResponse
    {
        try {
            $template = $this->service->create($request->validated(), (int) $request->user()->id);

            return (new StExpenseTemplateResource($template))
                ->response()
                ->setStatusCode(201);
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function update(UpdateStExpenseTemplateRequest $request, int $id): StExpenseTemplateResource|JsonResponse
    {
        try {
            $template = StExpenseTemplate::findOrFail($id);

            return new StExpenseTemplateResource(
                $this->service->update($template, $request->validated(), (int) $request->user()->id)
            );
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function setDefault(Request $request, int $id): StExpenseTemplateResource|JsonResponse
    {
        try {
            $template = StExpenseTemplate::findOrFail($id);

            return new StExpenseTemplateResource(
                $this->service->setDefault($template, (int) $request->user()->id)
            );
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function toggleActive(Request $request, int $id): StExpenseTemplateResource|JsonResponse
    {
        try {
            $validated = $request->validate(['is_active' => ['required', 'boolean']]);
            $template = StExpenseTemplate::findOrFail($id);

            return new StExpenseTemplateResource(
                $this->service->toggleActive($template, (bool) $validated['is_active'], (int) $request->user()->id)
            );
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function duplicate(Request $request, int $id): JsonResponse
    {
        $template = StExpenseTemplate::findOrFail($id);
        $copy = $this->service->duplicate($template, (int) $request->user()->id);

        return (new StExpenseTemplateResource($copy))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->service->delete(StExpenseTemplate::findOrFail($id));

            return response()->json(['message' => 'Template biaya berhasil dihapus.']);
        } catch (DomainException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
