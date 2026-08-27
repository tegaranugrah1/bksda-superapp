<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\CoveringLetter;
use App\Modules\Bmn\Resources\CoveringLetterResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoveringLetterController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = CoveringLetter::with(['senderEmployee', 'generator'])
            ->latest('document_date')
            ->latest();

        if ($request->filled('employee_id')) {
            $query->where('sender_employee_id', $request->integer('employee_id'));
        }

        return CoveringLetterResource::collection($query->paginate($request->integer('per_page', 10)));
    }

    public function show(CoveringLetter|string $letter): JsonResponse
    {
        $model = $letter instanceof CoveringLetter
            ? $letter->load(['senderEmployee', 'generator'])
            : CoveringLetter::with(['senderEmployee', 'generator'])->findOrFail($letter);

        return response()->json(['data' => new CoveringLetterResource($model)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'number' => ['required', 'string', 'max:120'],
            'regarding' => ['required', 'string', 'max:255'],
            'document_date' => ['required', 'date'],
            'recipient_title' => ['required', 'string', 'max:255'],
            'recipient_location' => ['required', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.title' => ['required', 'string'],
            'items.*.quantity' => ['nullable', 'string', 'max:100'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'closing_phrase' => ['required', 'string'],
            'received_date' => ['nullable', 'date'],
            'show_signatures' => ['boolean'],
            'sender_employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'sender' => ['required', 'array'],
            'sender.name' => ['required', 'string', 'max:255'],
            'sender.nip' => ['nullable', 'string', 'max:100'],
            'sender.role' => ['nullable', 'string', 'max:255'],
            'receiver' => ['nullable', 'array'],
            'receiver.name' => ['nullable', 'string', 'max:255'],
            'receiver.nip' => ['nullable', 'string', 'max:100'],
            'receiver.role' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $letter = CoveringLetter::create([
            'sender_employee_id' => $validated['sender_employee_id'] ?? null,
            'generated_by' => $request->user()?->id,
            'number' => $validated['number'],
            'regarding' => $validated['regarding'],
            'document_date' => $validated['document_date'],
            'recipient_title' => $validated['recipient_title'],
            'recipient_location' => $validated['recipient_location'],
            'items_snapshot' => $validated['items'],
            'closing_phrase' => $validated['closing_phrase'],
            'received_date' => $validated['received_date'] ?? null,
            'show_signatures' => $validated['show_signatures'] ?? true,
            'sender_snapshot' => $validated['sender'],
            'receiver_snapshot' => $validated['receiver'] ?? null,
            'metadata' => $validated['metadata'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        $letter->load(['senderEmployee', 'generator']);

        return response()->json([
            'message' => 'Surat Pengantar berhasil disimpan.',
            'data' => new CoveringLetterResource($letter),
        ], 201);
    }

    public function destroy(CoveringLetter|string $letter): JsonResponse
    {
        $model = $letter instanceof CoveringLetter
            ? $letter
            : CoveringLetter::findOrFail($letter);

        $model->delete();

        return response()->json([
            'message' => 'Riwayat Surat Pengantar berhasil dihapus.',
        ]);
    }
}
