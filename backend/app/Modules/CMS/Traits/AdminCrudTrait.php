<?php

namespace App\Modules\CMS\Traits;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * TRAIT SERBAGUNA UNTUK ADMIN CRUD
 *
 * Cara Penggunaan:
 * 1. Di Controller, tulis: use AdminCrudTrait;
 * 2. Buat properti: protected string $model = \App\Modules\CMS\Models\Profil::class;
 * 3. (Opsional) Override metode jika butuh logika khusus.
 */
trait AdminCrudTrait
{
    /**
     * GET — Daftar semua data (termasuk draft, karena ini Admin)
     */
    public function index(Request $request)
    {
        $query = $this->model::query()->latest();

        if ($request->filled('search')) {
            // Cari di kolom 'judul' atau 'nama' (keduanya umum di CMS)
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('judul', 'ilike', "%{$search}%")
                    ->orWhere('nama', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * GET — Detail satu data
     */
    public function show(string $id)
    {
        $record = $this->model::findOrFail($id);

        return response()->json(['data' => $record]);
    }

    /**
     * POST — Buat data baru
     */
    public function store(Request $request)
    {
        $modelInstance = new $this->model;
        $data = $request->only($modelInstance->getFillable());

        // Auto-generate slug jika ada kolom 'judul'
        if (isset($data['judul']) && ! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['judul']).'-'.Str::random(5);
        }

        // Handle file upload jika ada
        $data = $this->handleFileUpload($request, $data);

        $record = $this->model::create($data);

        return response()->json([
            'message' => 'Data berhasil ditambahkan.',
            'data' => $record,
        ], 201);
    }

    /**
     * PUT — Perbarui data
     */
    public function update(Request $request, string $id)
    {
        $record = $this->model::findOrFail($id);
        $data = $request->only($record->getFillable());

        // Regenerate slug jika judul berubah
        if (isset($data['judul']) && $data['judul'] !== $record->judul) {
            $data['slug'] = Str::slug($data['judul']).'-'.Str::random(5);
        }

        $data = $this->handleFileUpload($request, $data);
        $record->update($data);

        return response()->json([
            'message' => 'Data berhasil diperbarui.',
            'data' => $record,
        ]);
    }

    /**
     * DELETE — Hapus Lunak (SoftDelete)
     */
    public function destroy(string $id)
    {
        $record = $this->model::findOrFail($id);

        try {
            $record->delete();

            return response()->json(['message' => 'Data berhasil dihapus.']);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Data tidak dapat dihapus karena masih terkait data lain.',
            ], 422);
        }
    }

    /**
     * Pemroses File Upload Otomatis
     * Mendeteksi field umum: thumbnail, file, foto, cover, logo
     */
    protected function handleFileUpload(Request $request, array $data): array
    {
        $fileFields = [
            'thumbnail' => 'thumbnail_path',
            'file' => 'file_path',
            'foto' => 'foto_path',
            'cover' => 'cover_path',
            'logo' => 'logo_path',
            'favicon' => 'favicon_path',
        ];

        foreach ($fileFields as $inputName => $dbColumn) {
            if ($request->hasFile($inputName)) {
                $file = $request->file($inputName);
                $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
                $path = $file->storeAs('cms', $filename, 'public');
                $data[$dbColumn] = $path;
            }
        }

        return $data;
    }
}
