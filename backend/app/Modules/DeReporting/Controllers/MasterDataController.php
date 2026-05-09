<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\DeReporting\Models\Anggaran;
// Panggil seluruh 7 Jaringan Otak Eloquent
use App\Modules\DeReporting\Models\Bidang;
use App\Modules\DeReporting\Models\Jenis;
use App\Modules\DeReporting\Models\JenisData;
use App\Modules\DeReporting\Models\Kategori;
use App\Modules\DeReporting\Models\Koordinator;
use App\Modules\DeReporting\Models\Tahun;
use Illuminate\Http\Request;

class MasterDataController extends Controller
{
    /**
     * Kunci Rahasia Pemetaan Tipe Permintaan ke Kelas Model.
     * Jika Frontend meminta 'bidang', Laravel akan memanggil Model Bidang::class.
     */
    private array $modelMap = [
        'tahun' => Tahun::class,
        'bidang' => Bidang::class,
        'jenis' => Jenis::class,
        'kategori' => Kategori::class,
        'jenis-data' => JenisData::class,
        'koordinator' => Koordinator::class,
        'anggaran' => Anggaran::class,
    ];

    /**
     * Resolver Mesin: Memvalidasi apakah tipe data yang diminta aman.
     */
    private function resolveModel(string $type): string
    {
        if (! array_key_exists($type, $this->modelMap)) {
            abort(404, "Tipe Master Data '{$type}' tidak dikenali oleh sistem BKSDA.");
        }

        return $this->modelMap[$type];
    }

    /**
     * GET /api/dereporting/master/{type}
     * Membaca Daftar Master Data (Bersifat Publik untuk Dropdown Form Eksternal)
     */
    public function index(Request $request, string $type)
    {
        $modelClass = $this->resolveModel($type);
        $query = $modelClass::query();

        // [Sihir Hierarki]: Frontend sering butuh "Tampilkan Jenis HANYA untuk Bidang X"
        if ($request->filled('bidang_id')) {
            $query->where('bidang_id', $request->bidang_id);
        }
        if ($request->filled('jenis_id')) {
            $query->where('jenis_id', $request->jenis_id);
        }
        if ($request->filled('kategori_id')) {
            $query->where('kategori_id', $request->kategori_id);
        }

        // Jika Frontend memaksa tanpa Paging (Untuk Dropdown <select>)
        if ($request->query('paginate') === 'false') {
            return response()->json([
                'data' => $query->latest()->get(),
            ]);
        }

        // Output Default Wajib Paging sesuai Project Rule 3.1
        return response()->json($query->latest()->paginate(15));
    }

    /**
     * POST /api/dereporting/master/{type}
     * Menambah Master Data (Terkunci Auth & Admin)
     */
    public function store(Request $request, string $type)
    {
        $modelClass = $this->resolveModel($type);

        // Filter Sanitasi Ekstrem: Hanya membiarkan kolom yang ada di $fillable model masuk!
        $modelInstance = new $modelClass;
        $fillableAttributes = $request->only($modelInstance->getFillable());

        $record = $modelClass::create($fillableAttributes);

        return response()->json([
            'message' => "Master Data {$type} berhasil diciptakan.",
            'data' => $record,
        ], 201);
    }

    /**
     * PUT /api/dereporting/master/{type}/{id}
     * Mengubah Master Data (Terkunci Auth & Admin)
     */
    public function update(Request $request, string $type, string $id)
    {
        $modelClass = $this->resolveModel($type);
        $record = $modelClass::findOrFail($id);

        $fillableAttributes = $request->only($record->getFillable());
        $record->update($fillableAttributes);

        return response()->json([
            'message' => "Master Data {$type} berhasil dimutakhirkan.",
            'data' => $record,
        ]);
    }

    /**
     * DELETE /api/dereporting/master/{type}/{id}
     * Menghapus Master Data (Terkunci Auth & Admin)
     */
    public function destroy(string $type, string $id)
    {
        $modelClass = $this->resolveModel($type);
        $record = $modelClass::findOrFail($id);

        try {
            $record->delete(); // Akan memicu SoftDeletes jika tersetting

            return response()->json([
                'message' => "Master Data {$type} telah diputihkan.",
            ]);
        } catch (\Exception $e) {
            // Menangkap potensi Error Integrity Constraint (onDelete restrict dari Issue 077)
            return response()->json([
                'error' => 'Restriction Protocol',
                'message' => "Tidak dapat menghapus data {$type} ini karena masih terkait dengan laporan masyarakat.",
            ], 422);
        }
    }
}
