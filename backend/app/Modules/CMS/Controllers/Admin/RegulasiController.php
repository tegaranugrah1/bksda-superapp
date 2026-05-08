<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Regulasi;
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
            $query->where('judul', 'ilike', '%' . $request->search . '%');
        }
        if ($request->filled('tahun')) {
            $query->where('tahun', $request->tahun);
        }

        return response()->json($query->paginate(20));
    }
}
