<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Informasi;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Support\Security\UploadValidationRules;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InformasiController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Informasi::class;

    /**
     * Override index: Eager load category + author
     */
    public function index(Request $request)
    {
        $query = Informasi::with('category:id,nama', 'author:id,name')->latest();

        if ($request->filled('search')) {
            $query->where('judul', 'LIKE', '%'.$request->search.'%');
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Override store: Inject user_id dan published_at
     */
    public function store(Request $request)
    {
        $request->validate([
            'judul' => 'required|string|max:500',
            'konten' => 'required|string',
            'thumbnail' => UploadValidationRules::image(required: false),
        ]);

        $data = $request->only((new Informasi)->getFillable());
        $data['user_id'] = $request->user()->id;
        $data['slug'] = Str::slug($data['judul']).'-'.Str::random(5);

        // Jika langsung dipublikasi
        if ($request->boolean('is_published')) {
            $data['published_at'] = now();
        }

        $data = $this->handleFileUpload($request, $data);
        $record = Informasi::create($data);

        return response()->json([
            'message' => 'Berita berhasil disimpan.',
            'data' => $record,
        ], 201);
    }

    /**
     * Endpoint khusus: Toggle status Publikasi (Terbitkan / Tarik)
     */
    public function togglePublish(string $id)
    {
        $berita = Informasi::findOrFail($id);
        $berita->update([
            'is_published' => ! $berita->is_published,
            'published_at' => ! $berita->is_published ? now() : $berita->published_at,
        ]);

        $status = $berita->is_published ? 'diterbitkan' : 'ditarik dari publikasi';

        return response()->json(['message' => "Berita berhasil {$status}.", 'data' => $berita]);
    }
}
