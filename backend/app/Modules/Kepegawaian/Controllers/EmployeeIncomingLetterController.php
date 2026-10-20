<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\EmployeeIncomingLetter;
use App\Modules\Kepegawaian\Models\EmployeeIncomingLetterAttachment;
use App\Modules\Kepegawaian\Requests\EmployeeIncomingLetterRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\Kepegawaian\Exports\EmployeeIncomingLettersExport;

class EmployeeIncomingLetterController extends Controller
{
    private const CATEGORIES = ['Mahasiswa', 'Instansi', 'Internal', 'Masyarakat', 'Lainnya'];

    private function disk(): string
    {
        return (string) config('filesystems.default');
    }

    public function export(Request $request)
    {
        $filters = $request->only(['search', 'kategori', 'start_date', 'end_date']);
        $filename = 'Arsip_Surat_Masuk_Kepegawaian_' . now()->format('Ymd_His') . '.xlsx';

        return Excel::download(new EmployeeIncomingLettersExport($filters), $filename);
    }

    public function index(Request $request): JsonResponse
    {
        $query = EmployeeIncomingLetter::query()
            ->with('attachments:id,incoming_letter_id,type,original_name,mime_type,size,note,created_at')
            ->latest('tanggal_diterima')
            ->latest('id');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($builder) use ($search) {
                $builder->where('no_agenda', 'like', "%{$search}%")
                    ->orWhere('no_surat_masuk', 'like', "%{$search}%")
                    ->orWhere('no_surat_balasan', 'like', "%{$search}%")
                    ->orWhere('asal_surat', 'like', "%{$search}%")
                    ->orWhere('perihal', 'like', "%{$search}%")
                    ->orWhereHas('attachments', fn ($attachments) => $attachments->where('original_name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('kategori') && in_array($request->input('kategori'), self::CATEGORIES, true)) {
            $query->where('kategori', $request->input('kategori'));
        }

        if ($request->filled('start_date')) {
            $query->whereDate('tanggal_diterima', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('tanggal_diterima', '<=', $request->input('end_date'));
        }

        $items = $query->paginate(min(max((int) $request->input('per_page', 20), 1), 100));

        return response()->json([
            'data' => $items->getCollection()
                ->map(fn (EmployeeIncomingLetter $letter) => $this->serializeLetter($letter))
                ->values(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function store(EmployeeIncomingLetterRequest $request): JsonResponse
    {
        return $this->save($request, new EmployeeIncomingLetter(), true);
    }

    public function show(EmployeeIncomingLetter $letter): JsonResponse
    {
        return response()->json(['data' => $this->serializeLetter($letter->load('attachments'))]);
    }

    public function update(EmployeeIncomingLetterRequest $request, EmployeeIncomingLetter $letter): JsonResponse
    {
        return $this->save($request, $letter, false);
    }

    public function destroy(EmployeeIncomingLetter $letter): JsonResponse
    {
        $disk = Storage::disk($this->disk());
        $attachments = $letter->attachments()->get();

        foreach ($attachments as $attachment) {
            if ($attachment->storage_path && $disk->exists($attachment->storage_path)) {
                $disk->delete($attachment->storage_path);
            }
        }

        $letter->attachments()->delete();
        $letter->delete();

        return response()->json(['message' => 'Arsip surat berhasil dihapus.']);
    }

    public function destroyAttachment(EmployeeIncomingLetter $letter, EmployeeIncomingLetterAttachment $attachment): JsonResponse
    {
        abort_unless($attachment->incoming_letter_id === $letter->id, 404);

        $disk = Storage::disk($this->disk());
        if ($attachment->storage_path && $disk->exists($attachment->storage_path)) {
            $disk->delete($attachment->storage_path);
        }

        $attachment->delete();

        return response()->json(['message' => 'Lampiran berhasil dihapus.']);
    }

    public function download(Request $request, EmployeeIncomingLetter $letter, EmployeeIncomingLetterAttachment $attachment)
    {
        abort_unless($attachment->incoming_letter_id === $letter->id, 404);

        $disk = Storage::disk($this->disk());
        abort_unless($disk->exists($attachment->storage_path), 404);

        $filename = str_replace(['"', "\r", "\n", '/', '\\', ':', '*', '?', '<', '>', '|'], '_', basename($attachment->original_name)) ?: 'lampiran';

        // Batas upload 20 MB; respons buffered lebih stabil saat diteruskan
        // oleh proxy Next.js dibanding stream PHP dari dev server.
        $headers = [
            'Content-Disposition' => 'attachment; filename="'.addcslashes($filename, '\\"').'"',
            'Content-Type' => $attachment->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ];

        $origin = $request->headers->get('Origin');
        $allowedOrigins = config('cors.allowed_origins', []);
        if ($origin && is_array($allowedOrigins) && in_array($origin, $allowedOrigins, true)) {
            $headers['Access-Control-Allow-Origin'] = $origin;
            $headers['Access-Control-Allow-Credentials'] = 'true';
            $headers['Vary'] = 'Origin';
        }

        return response($disk->get($attachment->storage_path), 200, $headers);
    }

    public function preview(EmployeeIncomingLetter $letter, EmployeeIncomingLetterAttachment $attachment): JsonResponse
    {
        abort_unless($attachment->incoming_letter_id === $letter->id, 404);

        $mime = $attachment->mime_type;
        abort_unless($mime === 'application/pdf' || in_array($mime, ['image/jpeg', 'image/png'], true), 415);

        $disk = Storage::disk($this->disk());
        abort_unless($disk->exists($attachment->storage_path), 404);

        return response()->json([
            'mime_type' => $mime,
            'data_url' => "data:{$mime};base64,".base64_encode($disk->get($attachment->storage_path)),
        ], 200, ['Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0']);
    }

    private function save(EmployeeIncomingLetterRequest $request, EmployeeIncomingLetter $letter, bool $creating): JsonResponse
    {
        $validated = $request->validated();
        $storedPaths = [];
        $removedPaths = [];

        try {
            $saved = DB::transaction(function () use ($request, $letter, $validated, $creating, &$storedPaths, &$removedPaths) {
                $letter->fill(collect($validated)->except([
                    'attachments',
                    'attachment_types',
                    'attachment_notes',
                    'delete_attachment_ids',
                ])->all());
                if ($creating) {
                    $letter->created_by = $request->user()?->id;
                }
                $letter->save();

                $diskName = $this->disk();
                $directory = "private/kepegawaian/surat-masuk/{$letter->id}";
                $files = $request->file('attachments', []);
                $types = $request->input('attachment_types', []);
                $notes = $request->input('attachment_notes', []);

                foreach ($files as $index => $file) {
                    $type = $types[$index] ?? 'supporting';
                    $extension = strtolower($file->extension() ?: 'bin');
                    $path = $file->storeAs($directory, Str::uuid().'.'.$extension, $diskName);
                    $storedPaths[] = $path;

                    $letter->attachments()->create([
                        'type' => $type,
                        'original_name' => basename(str_replace('\\', '/', $file->getClientOriginalName())),
                        'storage_path' => $path,
                        'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                        'size' => $file->getSize() ?: 0,
                        'note' => $notes[$index] ?? null,
                    ]);
                }

                $deleteIds = array_map('intval', $request->input('delete_attachment_ids', []));
                if ($deleteIds) {
                    $attachments = $letter->attachments()->whereIn('id', $deleteIds)->get();
                    foreach ($attachments as $attachment) {
                        $removedPaths[] = $attachment->storage_path;
                        $attachment->delete();
                    }
                }

                return $letter->load('attachments');
            });

            $disk = Storage::disk($this->disk());
            foreach ($removedPaths as $path) {
                if ($path && $disk->exists($path)) {
                    $disk->delete($path);
                }
            }

            return response()->json([
                'message' => $creating ? 'Arsip surat berhasil dibuat.' : 'Arsip surat berhasil diperbarui.',
                'data' => $this->serializeLetter($saved),
            ], $creating ? 201 : 200);
        } catch (\Throwable $exception) {
            $disk = Storage::disk($this->disk());
            foreach ($storedPaths as $path) {
                if ($path && $disk->exists($path)) {
                    $disk->delete($path);
                }
            }

            report($exception);
            return response()->json(['message' => 'Gagal menyimpan arsip surat.'], 500);
        }
    }

    private function serializeLetter(EmployeeIncomingLetter $letter): array
    {
        return [
            'id' => $letter->id,
            'no_agenda' => $letter->no_agenda,
            'no_surat_masuk' => $letter->no_surat_masuk,
            'tanggal_surat' => $letter->tanggal_surat?->format('Y-m-d'),
            'tanggal_diterima' => $letter->tanggal_diterima?->format('Y-m-d'),
            'asal_surat' => $letter->asal_surat,
            'kategori' => $letter->kategori,
            'perihal' => $letter->perihal,
            'catatan' => $letter->catatan,
            'no_surat_balasan' => $letter->no_surat_balasan,
            'tanggal_surat_balasan' => $letter->tanggal_surat_balasan?->format('Y-m-d'),
            'has_reply' => (bool) ($letter->no_surat_balasan || $letter->attachments->contains('type', 'reply')),
            'attachments' => $letter->attachments->map(fn (EmployeeIncomingLetterAttachment $attachment) => [
                'id' => $attachment->id,
                'type' => $attachment->type,
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size' => $attachment->size,
                'note' => $attachment->note,
                'download_url' => "/api/kepegawaian/surat-masuk/{$letter->id}/attachments/{$attachment->id}/download",
                'preview_url' => "/api/kepegawaian/surat-masuk/{$letter->id}/attachments/{$attachment->id}/preview",
            ])->values()->all(),
        ];
    }
}
