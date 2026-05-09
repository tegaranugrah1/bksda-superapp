<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Models\Item;
use App\Modules\Inventory\Requests\StoreItemRequest;

class ItemController extends Controller
{
    public function index()
    {
        $items = Item::with('category:id,nama_kategori')
            ->orderBy('nama_barang', 'asc')
            ->paginate(20);

        return response()->json($items);
    }

    public function store(StoreItemRequest $request)
    {
        $item = Item::create($request->validated());

        return response()->json([
            'message' => 'Barang logistik baru sukses ditambahkan ke katalog.',
            'data' => $item,
        ], 201);
    }
}
