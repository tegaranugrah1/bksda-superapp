<?php

namespace App\Modules\SuratTugas\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\SuratTugas\Requests\AssignmentLetterRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Exception;

class AssignmentLetterController extends Controller
{
    public function index(Request $request)
    {
        $query = AssignmentLetter::with(['creator:id,name', 'approver:id,name', 'employees:id,nama_lengkap']);

        if ($search = $request->query('search')) {
            $query->where('tempat_tujuan', 'ilike', "%{$search}%")
                  ->orWhere('maksud_tujuan', 'ilike', "%{$search}%");
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($request->query('trashed') === 'true') {
            $query->onlyTrashed();
        }

        $letters = $query->latest()->paginate(10);

        return response()->json([
            'data' => $letters->items(),
            'meta' => [
                'current_page' => $letters->currentPage(),
                'last_page' => $letters->lastPage(),
                'per_page' => $letters->perPage(),
                'total' => $letters->total(),
            ]
        ]);
    }

    public function store(AssignmentLetterRequest $request)
    {
        $validated = $request->validated();

        DB::beginTransaction();
        try {
            $surat = AssignmentLetter::create([
                'maksud_tujuan' => $validated['maksud_tujuan'],
                'dasar_hukum' => $validated['dasar_hukum'] ?? null,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'tempat_tujuan' => $validated['tempat_tujuan'],
                'status' => 'pending',
                'created_by' => auth()->id(),
            ]);

            $pivotData = [];
            foreach ($validated['employees'] as $emp) {
                $pivotData[$emp['id']] = ['peran' => $emp['peran'] ?? null];
            }
            $surat->employees()->sync($pivotData);

            if ($request->hasFile('file_surat')) {
                $path = $request->file('file_surat')->store('private/surat_tugas');
                $surat->update(['file_surat_path' => $path]);
            }

            DB::commit();
            $surat->load('employees');

            return response()->json([
                'message' => 'Pengajuan Surat Tugas berhasil direkam.',
                'data' => $surat
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Terjadi kegagalan sistem: ' . $e->getMessage()], 500);
        }
    }

    public function show(string $id)
    {
        $surat = AssignmentLetter::with(['creator:id,name', 'approver:id,name', 'employees'])->findOrFail($id);
        return response()->json(['data' => $surat]);
    }

    public function update(AssignmentLetterRequest $request, string $id)
    {
        $validated = $request->validated();
        $surat = AssignmentLetter::findOrFail($id);

        DB::beginTransaction();
        try {
            $surat->update([
                'maksud_tujuan' => $validated['maksud_tujuan'],
                'dasar_hukum' => $validated['dasar_hukum'] ?? null,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'tempat_tujuan' => $validated['tempat_tujuan'],
            ]);

            $pivotData = [];
            foreach ($validated['employees'] as $emp) {
                $pivotData[$emp['id']] = ['peran' => $emp['peran'] ?? null];
            }
            $surat->employees()->sync($pivotData);

            if ($request->hasFile('file_surat')) {
                if ($surat->file_surat_path) {
                    Storage::delete($surat->file_surat_path);
                }
                $path = $request->file('file_surat')->store('private/surat_tugas');
                $surat->update(['file_surat_path' => $path]);
            }

            DB::commit();
            $surat->load('employees');

            return response()->json([
                'message' => 'Data Surat Tugas berhasil diperbarui.',
                'data' => $surat
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Terjadi kegagalan sistem: ' . $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected,completed',
            'nomor_surat' => 'nullable|string|unique:st_assignment_letters,nomor_surat,' . $id
        ]);

        $surat = AssignmentLetter::findOrFail($id);
        $surat->status = $request->status;
        $surat->approved_by = auth()->id();

        if ($request->has('nomor_surat')) {
            $surat->nomor_surat = $request->nomor_surat;
        }

        $surat->save();

        return response()->json([
            'message' => 'Status Surat Tugas telah diperbarui menjadi ' . strtoupper($request->status),
            'data' => $surat
        ]);
    }

    public function destroy(string $id)
    {
        $surat = AssignmentLetter::findOrFail($id);
        $surat->delete();
        return response()->json(['message' => 'Dokumen dipindahkan ke Arsip Sampah.']);
    }

    public function restore(string $id)
    {
        $surat = AssignmentLetter::onlyTrashed()->findOrFail($id);
        $surat->restore();
        return response()->json(['message' => 'Dokumen berhasil dipulihkan.']);
    }

    public function forceDestroy(string $id)
    {
        $surat = AssignmentLetter::onlyTrashed()->findOrFail($id);

        if ($surat->file_surat_path) {
            Storage::delete($surat->file_surat_path);
        }

        $surat->forceDelete();
        return response()->json(['message' => 'Dokumen dihapus permanen dari arsip.']);
    }

    public function downloadPdf(string $id)
    {
        $surat = AssignmentLetter::withTrashed()->findOrFail($id);

        if (!$surat->file_surat_path || !Storage::exists($surat->file_surat_path)) {
            return response()->json(['message' => 'Berkas PDF fisik tidak ditemukan di brankas server.'], 404);
        }

        return Storage::download(
            $surat->file_surat_path,
            'ST_BKSDA_' . ($surat->nomor_surat ?? 'Draft') . '.pdf'
        );
    }
}
