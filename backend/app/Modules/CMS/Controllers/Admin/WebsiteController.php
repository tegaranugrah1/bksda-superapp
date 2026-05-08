<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebsiteController extends Controller
{
    /** Website bersifat Singleton — hanya 1 baris */
    public function show()
    {
        $data = Website::firstOrCreate([], ['nama_instansi' => 'BKSDA']);
        return response()->json(['data' => $data]);
    }

    public function update(Request $request)
    {
        $website = Website::firstOrCreate([], ['nama_instansi' => 'BKSDA']);
        $data = $request->only($website->getFillable());

        // Handle logo dan favicon
        foreach (['logo' => 'logo_path', 'favicon' => 'favicon_path'] as $input => $col) {
            if ($request->hasFile($input)) {
                $file = $request->file($input);
                $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
                $data[$col] = $file->storeAs('private/cms', $filename);
            }
        }

        $website->update($data);
        return response()->json(['message' => 'Pengaturan website berhasil diperbarui.', 'data' => $website]);
    }
}
