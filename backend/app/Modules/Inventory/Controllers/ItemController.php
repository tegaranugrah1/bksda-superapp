<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Imports\ItemImport;
use App\Modules\Inventory\Models\Item;
use App\Modules\Inventory\Requests\StoreItemRequest;
use App\Support\Security\UploadValidationRules;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ItemController extends Controller
{
    public function index(): \Illuminate\Http\JsonResponse
    {
        $items = Item::with('category:id,nama_kategori')
            ->orderBy('nama_barang', 'asc')
            ->paginate(20);

        return response()->json($items);
    }

    public function store(StoreItemRequest $request): \Illuminate\Http\JsonResponse
    {
        $item = Item::create($request->validated());

        return response()->json([
            'message' => 'Barang logistik baru sukses ditambahkan ke katalog.',
            'data' => $item,
        ], 201);
    }

    public function import(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'file' => UploadValidationRules::spreadsheet(),
        ]);

        Excel::import(new ItemImport, $request->file('file'));

        return response()->json([
            'message' => 'Data katalog barang sukses diimpor secara massal.',
        ]);
    }

    public function trash(): \Illuminate\Http\JsonResponse
    {
        $items = Item::onlyTrashed()
            ->with('category:id,nama_kategori')
            ->orderBy('deleted_at', 'desc')
            ->paginate(20);

        return response()->json($items);
    }

    public function destroy($id): \Illuminate\Http\JsonResponse
    {
        $item = Item::findOrFail($id);
        $item->delete();

        return response()->json([
            'message' => 'Barang berhasil dipindahkan ke tempat sampah.',
        ]);
    }

    public function restore($id): \Illuminate\Http\JsonResponse
    {
        $item = Item::onlyTrashed()->findOrFail($id);
        $item->restore();

        return response()->json([
            'message' => 'Barang berhasil dikembalikan ke katalog aktif.',
        ]);
    }

    public function forceDelete($id): \Illuminate\Http\JsonResponse
    {
        $item = Item::onlyTrashed()->findOrFail($id);
        $item->forceDelete();

        return response()->json([
            'message' => 'Barang telah dihapus secara permanen dari basis data.',
        ]);
    }
}
