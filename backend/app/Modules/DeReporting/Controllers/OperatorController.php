<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\DeReporting\Models\Bidang;
use App\Modules\DeReporting\Requests\StoreOperatorRequest;
// KUNCI ARSITEKTUR: Kita memanggil Model Pusat IAM, bukan model DeReporting!
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperatorController extends Controller
{
    /**
     * GET /api/dereporting/operators
     * Menampilkan daftar Pegawai yang telah diangkat menjadi Operator Laporan
     */
    public function index(Request $request): JsonResponse
    {
        // 1. Ambil HANYA User yang memiliki jabatan Operator DeReporting
        // 2. Gunakan Eager Loading (with) untuk menempelkan nama Bidang tugasnya
        $query = User::where('dereporting_role', 'operator')
            ->with('dereportingBidang:id,nama') // Asumsi fungsi relasi 'dereportingBidang' ada di Model User
            ->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'ilike', "%{$search}%")
                ->orWhere('username', 'ilike', "%{$search}%");
        }

        // Project Rule 3.1: Wajib Paging
        return response()->json($query->paginate(20));
    }

    /**
     * POST /api/dereporting/operators
     * Mengangkat Pegawai Menjadi Operator Bidang
     */
    public function store(StoreOperatorRequest $request): JsonResponse
    {
        $user = User::findOrFail($request->user_id);

        // Manuver Promosi Jabatan (Promote)
        $user->update([
            'dereporting_role' => 'operator',
            'dereporting_bidang_id' => $request->bidang_id,
        ]);

        return response()->json([
            'message' => "Pegawai {$user->name} berhasil diangkat menjadi Operator Laporan.",
            'data' => $user,
        ], 201);
    }

    /**
     * PUT /api/dereporting/operators/{id}
     * Memutasi (Memindah) Operator ke Bidang Lain
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'bidang_id' => 'required|uuid|exists:dr_bidang,id',
        ]);

        $user = User::findOrFail($id);

        // Peringatan Keamanan: Pastikan yang diupdate memang benar seorang operator
        if ($user->dereporting_role !== 'operator') {
            return response()->json(['message' => 'Pegawai ini bukan seorang operator.'], 403);
        }

        $user->update([
            'dereporting_bidang_id' => $request->bidang_id,
        ]);

        return response()->json([
            'message' => "Wilayah tugas Operator {$user->name} berhasil dimutasi.",
            'data' => $user,
        ]);
    }

    /**
     * DELETE /api/dereporting/operators/{id}
     * Mencabut Jabatan Operator (Pemecatan Damai)
     */
    public function destroy(string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Manuver Pemecatan (Demote): Kembalikan ke titik Nol (Null)
        // Kita TIDAK BOLEH memanggil $user->delete() karena itu akan menghapus Pegawai tersebut dari BKSDA!
        $user->update([
            'dereporting_role' => null,
            'dereporting_bidang_id' => null,
        ]);

        return response()->json([
            'message' => "Jabatan Operator untuk {$user->name} telah resmi dicabut.",
        ]);
    }
}
