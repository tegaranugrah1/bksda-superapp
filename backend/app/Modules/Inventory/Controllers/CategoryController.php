<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->select(['id', 'nama_kategori', 'deskripsi'])
            ->orderBy('nama_kategori')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }
}
