<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use App\Modules\DeReporting\Models\Internal;
use App\Modules\DeReporting\Requests\StoreInternalRequest;

class InternalController extends Controller
{
    /**
     * GET /api/dereporting/internals
     * Membaca Daftar Laporan Internal (Wajib Pagination & Eager Loading)
     */
    public function index(Request $request)
    {
        // Sihir Eager Loading: Mencegah N+1 Database Explosion
        $query = Internal::with([
            'uploader:id,nama_lengkap,nip',
            'tahun',
            'bidang',
            'jenis',
            'kategori',
            'jenisData',
            'koordinator',
            'anggaran'
        ])->latest();

        // Implementasi Fitur Pencarian Cerdas
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('judul_laporan', 'ilike', "%{$search}%")
                  ->orWhere('keterangan', 'ilike', "%{$search}%");
        }

        // Tembak menggunakan aturan Project Rule 3.1: Wajib Paging
        return response()->json($query->paginate(20));
    }

    /**
     * POST /api/dereporting/internals
     * Mengunggah Laporan Baru (Terkunci Auth)
     */
    public function store(StoreInternalRequest $request)
    {
        $filePath = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            // Menghancurkan nama asli, menggantinya dengan Enkripsi Acak UUID (Rule 4.3)
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            // Mengubur file ke dalam Brankas Privat (Rule 4.4)
            $filePath = $file->storeAs('private/dereporting/internals', $filename);
        }

        $report = Internal::create([
            'user_id'        => $request->user()->id,
            'tahun_id'       => $request->tahun_id,
            'bidang_id'      => $request->bidang_id,
            'jenis_id'       => $request->jenis_id,
            'kategori_id'    => $request->kategori_id,
            'jenis_data_id'  => $request->jenis_data_id,
            'koordinator_id' => $request->koordinator_id,
            'anggaran_id'    => $request->anggaran_id,
            'judul_laporan'  => $request->judul_laporan,
            'keterangan'     => $request->keterangan,
            'file_path'      => $filePath,
        ]);

        return response()->json([
            'message' => 'Laporan berhasil disandikan dan dikunci dalam brankas.',
            'data'    => $report
        ], 201);
    }

    /**
     * GET /api/dereporting/internals/{id}/download
     * Pintu Gaib Penyalur Berkas Rahasia (Private Streaming)
     */
    public function downloadFile(string $id)
    {
        $report = Internal::findOrFail($id);

        if (!$report->file_path || !Storage::exists($report->file_path)) {
            return response()->json(['message' => 'Berkas fisik tidak ditemukan di dalam brankas server.'], 404);
        }

        return Storage::download($report->file_path, $report->judul_laporan . '.' . pathinfo($report->file_path, PATHINFO_EXTENSION));
    }

    /**
     * DELETE /api/dereporting/internals/{id}
     * Menghapus Laporan Internal (SoftDeletes)
     */
    public function destroy(string $id)
    {
        $report = Internal::findOrFail($id);

        // File fisik tetap tersimpan untuk keperluan Audit Forensik (SoftDeletes)
        $report->delete();

        return response()->json([
            'message' => 'Laporan telah ditarik dari peredaran publik (Archived).'
        ]);
    }
}
