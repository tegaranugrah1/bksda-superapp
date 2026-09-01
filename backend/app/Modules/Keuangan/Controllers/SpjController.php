<?php

namespace App\Modules\Keuangan\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Keuangan\Models\Spj;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SpjController extends Controller
{
    /**
     * Display a listing of SPJ records.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Spj::query();

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('nomor_spj', 'like', "%{$s}%")
                  ->orWhere('nama_kegiatan', 'like', "%{$s}%")
                  ->orWhere('nomor_spt', 'like', "%{$s}%")
                  ->orWhere('creator_name', 'like', "%{$s}%")
                  ->orWhere('tujuan', 'like', "%{$s}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'Semua') {
            $query->where('status', $request->status);
        }

        if ($request->filled('tipe_anggaran') && $request->tipe_anggaran !== 'Semua') {
            $query->where('tipe_anggaran', strtoupper($request->tipe_anggaran));
        }

        $perPage = (int) $request->get('per_page', 20);
        $paginator = $query->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * Store a newly created SPJ.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_kegiatan' => 'required|string|max:500',
            'nomor_spj' => 'nullable|string|max:255',
            'tipe_anggaran' => 'nullable|string|in:FOLU,DIPA',
            'nomor_spt' => 'nullable|string|max:255',
            'surat_tugas_id' => 'nullable|string|max:255',
            'sumber_dana' => 'nullable|string|max:255',
            'kode_awp' => 'nullable|string|max:255',
            'satuan_kerja' => 'nullable|string|max:255',
            'asal' => 'nullable|string|max:255',
            'tujuan' => 'nullable|string|max:255',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date',
            'pejabat_ppk' => 'nullable|array',
            'pejabat_pdo' => 'nullable|array',
            'pejabat_verifikator' => 'nullable|array',
            'pejabat_kasubbag' => 'nullable|array',
            'recipients' => 'required|array|min:1',
            'total_anggaran' => 'nullable|numeric',
            'employee_count' => 'nullable|integer',
            'status' => 'nullable|string|in:Draft,Diajukan,Diproses,Disetujui,Selesai',
        ]);

        $user = $request->user();
        $tipeAnggaran = strtoupper($validated['tipe_anggaran'] ?? 'FOLU');

        // Calculate totals from recipients if not explicitly provided
        $recipients = $validated['recipients'];
        $calculatedTotal = 0;
        foreach ($recipients as $rec) {
            $calculatedTotal += (float) ($rec['amount'] ?? 0);
        }

        $totalAnggaran = $validated['total_anggaran'] ?? $calculatedTotal;
        $employeeCount = $validated['employee_count'] ?? count($recipients);

        // Auto-generate nomor_spj if empty
        $nomorSpj = $validated['nomor_spj'] ?? null;
        if (empty($nomorSpj)) {
            $now = Carbon::now();
            $monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][$now->month - 1];
            $count = Spj::whereYear('created_at', $now->year)->count() + 1;
            $suffix = $tipeAnggaran === 'FOLU' ? 'FOLU-NC-23' : 'DIPA';
            $nomorSpj = sprintf('SPJ.%03d/K.18/TU/%s/%s/%s', $count, $suffix, $monthRoman, $now->year);
        }

        $spj = Spj::create([
            'nomor_spj' => $nomorSpj,
            'tipe_anggaran' => $tipeAnggaran,
            'nama_kegiatan' => $validated['nama_kegiatan'],
            'nomor_spt' => $validated['nomor_spt'] ?? null,
            'surat_tugas_id' => $validated['surat_tugas_id'] ?? null,
            'sumber_dana' => $validated['sumber_dana'] ?? ($tipeAnggaran === 'FOLU' ? 'FOLU-NC-23' : 'DIPA'),
            'kode_awp' => $validated['kode_awp'] ?? null,
            'satuan_kerja' => $validated['satuan_kerja'] ?? 'Balai Konservasi Sumber Daya Alam Kalimantan Timur',
            'asal' => $validated['asal'] ?? 'Samarinda',
            'tujuan' => $validated['tujuan'] ?? 'Kabupaten Kutai Barat',
            'tanggal_mulai' => $validated['tanggal_mulai'] ?? null,
            'tanggal_selesai' => $validated['tanggal_selesai'] ?? null,
            'pejabat_ppk' => $validated['pejabat_ppk'] ?? null,
            'pejabat_pdo' => $validated['pejabat_pdo'] ?? null,
            'pejabat_verifikator' => $validated['pejabat_verifikator'] ?? null,
            'pejabat_kasubbag' => $validated['pejabat_kasubbag'] ?? null,
            'recipients' => $recipients,
            'total_anggaran' => $totalAnggaran,
            'employee_count' => $employeeCount,
            'status' => $validated['status'] ?? 'Draft',
            'created_by_user_id' => $user?->id,
            'creator_name' => $user?->name ?? 'Admin Keuangan',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'SPJ berhasil disimpan.',
            'data' => $spj,
        ], 201);
    }

    /**
     * Display the specified SPJ.
     */
    public function show($id): JsonResponse
    {
        $spj = Spj::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $spj,
        ]);
    }

    /**
     * Update the specified SPJ.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $spj = Spj::findOrFail($id);

        $validated = $request->validate([
            'nama_kegiatan' => 'sometimes|required|string|max:500',
            'nomor_spj' => 'sometimes|nullable|string|max:255',
            'tipe_anggaran' => 'sometimes|nullable|string|in:FOLU,DIPA',
            'nomor_spt' => 'sometimes|nullable|string|max:255',
            'kode_awp' => 'sometimes|nullable|string|max:255',
            'satuan_kerja' => 'sometimes|nullable|string|max:255',
            'asal' => 'sometimes|nullable|string|max:255',
            'tujuan' => 'sometimes|nullable|string|max:255',
            'tanggal_mulai' => 'sometimes|nullable|date',
            'tanggal_selesai' => 'sometimes|nullable|date',
            'pejabat_ppk' => 'sometimes|nullable|array',
            'pejabat_pdo' => 'sometimes|nullable|array',
            'pejabat_verifikator' => 'sometimes|nullable|array',
            'pejabat_kasubbag' => 'sometimes|nullable|array',
            'recipients' => 'sometimes|required|array|min:1',
            'total_anggaran' => 'sometimes|nullable|numeric',
            'employee_count' => 'sometimes|nullable|integer',
            'status' => 'sometimes|nullable|string|in:Draft,Diajukan,Diproses,Disetujui,Selesai',
        ]);

        if (isset($validated['recipients'])) {
            $calculatedTotal = 0;
            foreach ($validated['recipients'] as $rec) {
                $calculatedTotal += (float) ($rec['amount'] ?? 0);
            }
            $validated['total_anggaran'] = $validated['total_anggaran'] ?? $calculatedTotal;
            $validated['employee_count'] = $validated['employee_count'] ?? count($validated['recipients']);
        }

        $spj->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'SPJ berhasil diperbarui.',
            'data' => $spj,
        ]);
    }

    /**
     * Remove the specified SPJ from storage.
     */
    public function destroy($id): JsonResponse
    {
        $spj = Spj::findOrFail($id);
        $spj->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'SPJ berhasil dihapus.',
        ]);
    }

    /**
     * Update the status of the specified SPJ.
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|string|in:Draft,Diajukan,Diproses,Disetujui,Selesai',
        ]);

        $spj = Spj::findOrFail($id);
        $spj->status = $request->status;
        $spj->save();

        return response()->json([
            'status' => 'success',
            'message' => "Status SPJ diperbarui menjadi {$request->status}.",
            'data' => $spj,
        ]);
    }
}
