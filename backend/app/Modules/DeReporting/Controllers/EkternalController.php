<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use App\Modules\DeReporting\Models\Eksternal;
use App\Modules\DeReporting\Requests\StoreEksternalRequest;

class EksternalController extends Controller
{
    /**
     * KONSTRUKTOR PERTAHANAN (SECURITY CONSTRUCTOR)
     * Perisai DDoS langsung di Controller agar tak lupa di Routes!
     */
    public function __construct()
    {
        // Membatasi metode storePublic maksimal 10 request per 1 menit (Rule 6.4)
        $this->middleware('throttle:10,1')->only('storePublic');
    }

    /**
     * GET /api/dereporting/eksternal
     * ADMIN ONLY: Membaca Daftar Laporan Masuk dari Masyarakat
     */
    public function index(Request $request)
    {
        $query = Eksternal::latest();

        // Fitur Pencarian Cerdas untuk Operator
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('judul_laporan', 'ilike', "%{$search}%")
                  ->orWhere('nama_pelapor', 'ilike', "%{$search}%")
                  ->orWhere('instansi', 'ilike', "%{$search}%");
        }

        // Filter Berdasarkan Status (Cari yang 'Menunggu Tinjauan')
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * POST /api/dereporting/eksternal/public
     * PUBLIC ROUTE: Gerbang penerimaan berkas masyarakat dunia
     */
    public function storePublic(StoreEksternalRequest $request)
    {
        $filePath = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            // Menghancurkan nama asli (Mencegah serangan skrip .php.pdf)
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            // Mengarantina file di dalam Brankas Isolasi Publik
            $filePath = $file->storeAs('private/dereporting/eksternal', $filename);
        }

        $report = Eksternal::create([
            'nama_pelapor'  => $request->nama_pelapor,
            'instansi'      => $request->instansi,
            'email'         => $request->email,
            'no_hp'         => $request->no_hp,
            'judul_laporan' => $request->judul_laporan,
            'deskripsi'     => $request->deskripsi,
            'file_path'     => $filePath,
        ]);

        // JEJAK FORENSIK RAHASIA (Rule 4.6) — diisi oleh sistem, bukan fillable
        $report->ip_address = $request->ip();
        $report->status = 'Menunggu Tinjauan';
        $report->save();

        return response()->json([
            'message' => 'Laporan Anda berhasil dikirim ke Markas BKSDA. Kami telah mencatat tiket Anda.',
            // JANGAN mengirimkan IP Address balik ke layar pengguna!
            'data'    => $report->only(['id', 'nama_pelapor', 'status', 'created_at'])
        ], 201);
    }

    /**
     * PUT /api/dereporting/eksternal/{id}/status
     * ADMIN ONLY: Memverifikasi / Menolak laporan masyarakat
     */
    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:Menunggu Tinjauan,Diterima,Ditolak',
        ]);

        $report = Eksternal::findOrFail($id);
        $report->update(['status' => $request->status]);

        return response()->json([
            'message' => "Status laporan berhasil diubah menjadi: {$request->status}",
            'data'    => $report
        ]);
    }

    /**
     * GET /api/dereporting/eksternal/{id}/download
     * ADMIN ONLY: Pintu ekstraksi berkas masyarakat yang aman
     */
    public function downloadFile(string $id)
    {
        $report = Eksternal::findOrFail($id);

        if (!$report->file_path || !Storage::exists($report->file_path)) {
            return response()->json(['message' => 'Berkas laporan gagal ditemukan di karantina.'], 404);
        }

        return Storage::download($report->file_path, $report->judul_laporan . '_Pelapor_Eksternal.' . pathinfo($report->file_path, PATHINFO_EXTENSION));
    }
}

    /**
     * GET /api/dereporting/ekternals
     * ADMIN ONLY: Membaca Daftar Laporan Masuk dari Masyarakat
     */
    public function index(Request $request)
    {
        $query = Ekternal::latest();

        // Fitur Pencarian Cerdas untuk Operator
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('judul_laporan', 'ilike', "%{$search}%")
                  ->orWhere('nama_pelapor', 'ilike', "%{$search}%")
                  ->orWhere('instansi', 'ilike', "%{$search}%");
        }

        // Filter Berdasarkan Status (Cari yang 'Menunggu Tinjauan')
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * POST /api/dereporting/ekternals/public
     * PUBLIC ROUTE: Gerbang penerimaan berkas masyarakat dunia
     */
    public function storePublic(Request $request)
    {
        $request->validate([
            'nama_pelapor'  => 'required|string|max:150',
            'instansi'      => 'nullable|string|max:150',
            'email'         => 'nullable|email|max:100',
            'no_hp'         => 'nullable|string|max:20',
            'judul_laporan' => 'required|string|max:255',
            'deskripsi'     => 'nullable|string',
            'file'          => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,zip,rar,jpg,png,jpeg',
        ]);

        $filePath = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            // Menghancurkan nama asli (Mencegah serangan skrip .php.pdf)
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            // Mengarantina file di dalam Brankas Isolasi Publik
            $filePath = $file->storeAs('private/dereporting/ekternals', $filename);
        }

        $report = Ekternal::create([
            'nama_pelapor'  => $request->nama_pelapor,
            'instansi'      => $request->instansi,
            'email'         => $request->email,
            'no_hp'         => $request->no_hp,
            'judul_laporan' => $request->judul_laporan,
            'deskripsi'     => $request->deskripsi,
            'file_path'     => $filePath,
        ]);

        // JEJAK FORENSIK RAHASIA (Rule 4.6) — diisi oleh sistem, bukan fillable
        $report->ip_address = $request->ip();
        $report->status = 'Menunggu Tinjauan';
        $report->save();

        return response()->json([
            'message' => 'Laporan Anda berhasil dikirim ke Markas BKSDA. Kami telah mencatat tiket Anda.',
            // JANGAN mengirimkan IP Address balik ke layar pengguna!
            'data'    => $report->only(['id', 'nama_pelapor', 'status', 'created_at'])
        ], 201);
    }

    /**
     * PUT /api/dereporting/ekternals/{id}/status
     * ADMIN ONLY: Memverifikasi / Menolak laporan masyarakat
     */
    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:Menunggu Tinjauan,Diterima,Ditolak',
        ]);

        $report = Ekternal::findOrFail($id);
        $report->update(['status' => $request->status]);

        return response()->json([
            'message' => "Status laporan berhasil diubah menjadi: {$request->status}",
            'data'    => $report
        ]);
    }

    /**
     * GET /api/dereporting/ekternals/{id}/download
     * ADMIN ONLY: Pintu ekstraksi berkas masyarakat yang aman
     */
    public function downloadFile(string $id)
    {
        $report = Ekternal::findOrFail($id);

        if (!$report->file_path || !Storage::exists($report->file_path)) {
            return response()->json(['message' => 'Berkas laporan gagal ditemukan di karantina.'], 404);
        }

        return Storage::download($report->file_path, $report->judul_laporan . '_Pelapor_Eksternal.' . pathinfo($report->file_path, PATHINFO_EXTENSION));
    }
}
