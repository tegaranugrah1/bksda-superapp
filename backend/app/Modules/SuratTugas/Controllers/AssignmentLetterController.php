<?php

namespace App\Modules\SuratTugas\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\SuratTugas\Requests\AssignmentLetterRequest;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
            ],
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
                'tempat_tujuan' => $validated['tempat_tujuan'] ?? null,
                'sumber_dana' => $validated['sumber_dana'] ?? 'dipa',
                'sumber_dana_other' => $validated['sumber_dana_other'] ?? null,
                'nama_plh' => $request->input('nama_plh'),
                'has_seksi_employee' => (bool) $request->input('has_seksi_employee', false),
                'tanda_setuju' => $request->input('tanda_setuju'),
                'status' => 'draft',
                'created_by' => auth()->id() ? (int) auth()->id() : null,
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
                'data' => $surat,
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Terjadi kegagalan sistem: '.$e->getMessage()], 500);
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
                'data' => $surat,
            ]);

        } catch (Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Terjadi kegagalan sistem: '.$e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:pending,approved,rejected,completed',
            'nomor_surat' => 'nullable|string|unique:st_assignment_letters,nomor_surat,'.$id,
        ]);

        $surat = AssignmentLetter::findOrFail($id);
        $surat->status = $request->status;
        
        if (in_array($request->status, ['approved', 'completed'])) {
            $surat->approved_by = (int) auth()->id();
        }

        if ($request->has('nomor_surat')) {
            $surat->nomor_surat = $request->nomor_surat;
        }

        $surat->save();

        return response()->json([
            'message' => 'Status Surat Tugas telah diperbarui menjadi '.strtoupper($request->status),
            'data' => $surat,
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

        if (! $surat->file_surat_path || ! Storage::exists($surat->file_surat_path)) {
            return response()->json(['message' => 'Berkas PDF fisik tidak ditemukan di brankas server.'], 404);
        }

        return Storage::download(
            $surat->file_surat_path,
            'ST_BKSDA_'.($surat->nomor_surat ?? 'Draft').'.pdf'
        );
    }

    public function verify(string $id)
    {
        $surat = AssignmentLetter::with(['employees:id,nama_lengkap'])->findOrFail($id);

        if ($surat->status !== 'approved' && $surat->status !== 'completed') {
            return response()->json([
                'valid' => false,
                'message' => 'Dokumen ini tidak memiliki ketetapan hukum yang sah atau statusnya belum disetujui.',
            ], 403);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Dokumen ini terverifikasi SAH dan TERCATAT di database.',
            'data' => [
                'nomor_surat' => $surat->nomor_surat,
                'maksud_tujuan' => $surat->maksud_tujuan,
                'tanggal_berlaku' => $surat->tanggal_mulai->format('d M Y').' s/d '.$surat->tanggal_selesai->format('d M Y'),
                'tempat_tujuan' => $surat->tempat_tujuan,
                'personil' => $surat->employees->pluck('nama_lengkap'),
            ],
        ]);
    }

    public function approve(Request $request, string $id)
    {
        $request->validate([
            'nomor_surat' => 'nullable|string|unique:st_assignment_letters,nomor_surat,'.$id,
            'kode_surat' => 'nullable|string',
            'nama_kegiatan' => 'nullable|string',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date',
            'tanggal_surat' => 'nullable|date',
            'sumber_dana' => 'nullable|string',
            'sumber_dana_other' => 'nullable|string',
            'menimbang' => 'nullable|array',
            'dasar' => 'nullable|array',
            'employee_ids' => 'nullable|array',
            'status' => 'nullable|in:pending,approved',
        ]);

        $surat = AssignmentLetter::findOrFail($id);

        $targetStatus = $request->input('status'); // null if not provided

        DB::beginTransaction();
        try {
            $updateData = array_filter([
                'nomor_surat' => $request->nomor_surat,
                'kode_surat' => $request->kode_surat,
                'maksud_tujuan' => $request->nama_kegiatan,
                'tanggal_mulai' => $request->tanggal_mulai,
                'tanggal_selesai' => $request->tanggal_selesai,
                'tanggal_surat' => $request->tanggal_surat,
                'sumber_dana' => $request->sumber_dana,
                'sumber_dana_other' => $request->sumber_dana_other,
                'menimbang' => $request->menimbang,
                'dasar' => $request->dasar,
            ], fn($v) => $v !== null);

            // Only update status if explicitly provided
            if ($targetStatus) {
                $updateData['status'] = $targetStatus;
                if ($targetStatus === 'approved') {
                    $updateData['approved_by'] = auth()->id();
                }
            }

            $surat->update($updateData);

            if ($request->has('employee_ids') && is_array($request->employee_ids)) {
                $surat->employees()->sync($request->employee_ids);
            }

            DB::commit();

            $statusLabel = $targetStatus === 'pending' ? 'diajukan untuk persetujuan' : ($targetStatus === 'approved' ? 'berhasil diterbitkan' : 'berhasil disimpan');
            return response()->json([
                'message' => "Surat Tugas {$statusLabel}.",
                'data' => $surat->load('employees'),
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal memproses surat: '.$e->getMessage()], 500);
        }
    }

    public function getNextNumber()
    {
        $year = now()->year;
        $lastLetter = AssignmentLetter::whereYear('tanggal_surat', $year)
            ->orWhereYear('created_at', $year)
            ->whereNotNull('nomor_surat')
            ->orderBy('nomor_surat', 'desc')
            ->first();

        $nextNumber = 1;
        if ($lastLetter && preg_match('/ST\.(\d+)/', $lastLetter->nomor_surat, $matches)) {
            $nextNumber = (int) $matches[1] + 1;
        }

        return response()->json([
            'next_number' => str_pad($nextNumber, 3, '0', STR_PAD_LEFT),
            'current_year' => $year,
        ]);
    }

    public function directStore(Request $request)
    {
        $request->validate([
            'nomor_surat' => 'required|string|unique:st_assignment_letters,nomor_surat',
            'kode_surat' => 'nullable|string',
            'maksud_tujuan' => 'required|string',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date',
            'tanggal_surat' => 'required|date',
            'tempat_tujuan' => 'required|string',
            'sumber_dana' => 'required|string',
            'sumber_dana_other' => 'nullable|string',
            'menimbang' => 'nullable|array',
            'dasar' => 'nullable|array',
            'employee_ids' => 'required|array',
        ]);

        DB::beginTransaction();
        try {
            $surat = AssignmentLetter::create([
                'nomor_surat' => $request->nomor_surat,
                'kode_surat' => $request->kode_surat,
                'maksud_tujuan' => $request->maksud_tujuan,
                'tanggal_mulai' => $request->tanggal_mulai,
                'tanggal_selesai' => $request->tanggal_selesai,
                'tanggal_surat' => $request->tanggal_surat,
                'tempat_tujuan' => $request->tempat_tujuan,
                'sumber_dana' => $request->sumber_dana,
                'sumber_dana_other' => $request->sumber_dana_other,
                'menimbang' => $request->menimbang,
                'dasar' => $request->dasar,
                'status' => 'approved',
                'created_by' => (int) auth()->id(),
                'approved_by' => (int) auth()->id(),
            ]);

            $surat->employees()->sync($request->employee_ids);

            DB::commit();

            return response()->json([
                'message' => 'Surat Tugas berhasil diterbitkan langsung.',
                'data' => $surat->load('employees'),
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menerbitkan surat: '.$e->getMessage()], 500);
        }
    }
}
