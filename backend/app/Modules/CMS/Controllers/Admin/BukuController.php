<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Buku;
use App\Modules\CMS\Traits\AdminCrudTrait;
use Illuminate\Http\Request;

class BukuController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Buku::class;

    /** Override index: Eager load jenis publikasi */
    public function index(Request $request)
    {
        $query = Buku::with('jenis:id,nama')->latest();

        if ($request->filled('search')) {
            $query->where('judul', 'ilike', '%'.$request->search.'%');
        }

        return response()->json($query->paginate(20));
    }
}
