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

    public function import(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv'
        ]);

        \Maatwebsite\Excel\Facades\Excel::import(new \App\Modules\Inventory\Imports\ItemImport, $request->file('file'));

        return response()->json([
            'message' => 'Data katalog barang sukses diimpor secara massal.'
        ]);
    }

    public function trash()
    {
        $items = Item::onlyTrashed()
            ->with('category:id,nama_kategori')
            ->orderBy('deleted_at', 'desc')
            ->paginate(20);

        return response()->json($items);
    }

    public function destroy($id)
    {
        $item = Item::findOrFail($id);
        $item->delete();

        return response()->json([
            'message' => 'Barang berhasil dipindahkan ke tempat sampah.'
        ]);
    }

    public function restore($id)
    {
        $item = Item::onlyTrashed()->findOrFail($id);
        $item->restore();

        return response()->json([
            'message' => 'Barang berhasil dikembalikan ke katalog aktif.'
        ]);
    }

    public function forceDelete($id)
    {
        $item = Item::onlyTrashed()->findOrFail($id);
        $item->forceDelete();

        return response()->json([
            'message' => 'Barang telah dihapus secara permanen dari basis data.'
        ]);
    }
}
