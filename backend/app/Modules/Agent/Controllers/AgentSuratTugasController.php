<?php

namespace App\Modules\Agent\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentSuratTugasController extends Controller
{
    /**
     * Membaca Surat Tugas aktif yang melibatkan pegawai tertentu.
     */
    public function getActiveSuratTugas(string $nip): JsonResponse
    {
        $employee = Employee::where('nip', trim($nip))->where('is_active', true)->first();

        if (!$employee) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pegawai tidak ditemukan.',
            ], 404);
        }

        $letters = AssignmentLetter::whereHas('employees', function ($q) use ($employee) {
            $q->where('employee_id', $employee->id);
        })
        ->whereIn('status', ['DITERBITKAN', 'DISETUJUI', 'diterbitkan', 'disetujui', 'draft', 'DRAFT'])
        ->where('tanggal_selesai', '>=', Carbon::now()->subDays(7)->format('Y-m-d'))
        ->orderBy('tanggal_mulai', 'desc')
        ->take(10)
        ->get(['id', 'nomor_surat', 'maksud_tujuan', 'tanggal_mulai', 'tanggal_selesai', 'tempat_tujuan', 'status']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'employee' => [
                    'id' => $employee->id,
                    'nip' => $employee->nip,
                    'nama_lengkap' => $employee->nama_lengkap,
                ],
                'surat_tugas' => $letters,
            ],
        ]);
    }

    /**
     * Pembuatan draf Surat Tugas awal secara percakapan melalui WhatsApp.
     */
    public function createDraftSuratTugas(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'maksud_tujuan' => 'required|string|max:1000',
            'tempat_tujuan' => 'required|string|max:500',
            'tanggal_mulai' => 'required|date_format:Y-m-d',
            'tanggal_selesai' => 'required|date_format:Y-m-d|after_or_equal:tanggal_mulai',
            'personil_nips' => 'nullable|array',
            'personil_nips.*' => 'string',
            'sumber_dana' => 'nullable|string|max:255',
        ]);

        $letter = AssignmentLetter::create([
            'maksud_tujuan' => strip_tags(trim($validated['maksud_tujuan'])),
            'tempat_tujuan' => strip_tags(trim($validated['tempat_tujuan'])),
            'tanggal_mulai' => $validated['tanggal_mulai'],
            'tanggal_selesai' => $validated['tanggal_selesai'],
            'status' => 'DRAFT',
            'sumber_dana' => $validated['sumber_dana'] ?? 'DIPA BKSDA Kalimantan Timur',
            'sertakan_laporan' => true,
        ]);

        // Attach personil jika NIP diberikan
        if (!empty($validated['personil_nips'])) {
            $employeeIds = Employee::whereIn('nip', $validated['personil_nips'])->pluck('id')->toArray();
            if (!empty($employeeIds)) {
                $letter->employees()->sync($employeeIds);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Draf Surat Tugas berhasil dibuat via WhatsApp dan siap ditinjau pimpinan di SuperApp.',
            'data' => [
                'id' => $letter->id,
                'status' => $letter->status,
                'maksud_tujuan' => $letter->maksud_tujuan,
                'tempat_tujuan' => $letter->tempat_tujuan,
                'tanggal_mulai' => $letter->tanggal_mulai,
                'tanggal_selesai' => $letter->tanggal_selesai,
            ],
        ], 201);
    }
}
