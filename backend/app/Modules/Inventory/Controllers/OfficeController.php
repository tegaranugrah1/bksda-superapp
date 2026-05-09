<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Models\Office;
use App\Modules\Inventory\Requests\StoreOfficeRequest;

class OfficeController extends Controller
{
    public function index()
    {
        // Pagination Wajib (Rule 3.1) + Relasi Penanggung Jawab (Lompat Modul)
        $offices = Office::with('penanggungJawab:id,nama_lengkap,nip')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($offices);
    }

    public function store(StoreOfficeRequest $request)
    {
        $office = Office::create($request->validated());

        return response()->json([
            'message' => 'Kantor penyimpanan baru sukses dibentuk.',
            'data' => $office,
        ], 201);
    }
}
