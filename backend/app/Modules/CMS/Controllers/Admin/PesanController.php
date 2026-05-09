<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Pesan;
use Illuminate\Http\Request;

class PesanController extends Controller
{
    /** Daftar pesan masuk */
    public function index(Request $request)
    {
        $query = Pesan::latest();

        if ($request->filled('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }

        return response()->json($query->paginate(20));
    }

    /** Tandai sudah dibaca */
    public function markAsRead(string $id)
    {
        $pesan = Pesan::findOrFail($id);
        $pesan->update(['is_read' => true]);

        return response()->json(['message' => 'Pesan ditandai sudah dibaca.', 'data' => $pesan]);
    }

    /** Hapus pesan */
    public function destroy(string $id)
    {
        Pesan::findOrFail($id)->delete();

        return response()->json(['message' => 'Pesan dihapus.']);
    }
}
