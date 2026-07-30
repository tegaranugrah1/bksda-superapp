<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Regulasi;
use App\Modules\CMS\Traits\AdminCrudTrait;
use Illuminate\Http\Request;

class RegulasiController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Regulasi::class;

    /** Override index: Eager load jenis + filter tahun */
    public function index(Request $request)
    {
        $query = Regulasi::with('jenis:id,nama')->latest();

        if ($request->filled('search')) {
            $query->where('judul', 'LIKE', '%'.$request->search.'%');
        }
        if ($request->filled('tahun')) {
            $query->where('tahun', $request->tahun);
        }

        return response()->json($query->paginate(20));
    }
}
