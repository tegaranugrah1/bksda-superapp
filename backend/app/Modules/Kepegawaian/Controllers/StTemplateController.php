<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\StTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StTemplateController extends Controller
{
    public function index()
    {
        $templates = StTemplate::orderBy('created_at', 'desc')->get();
        return response()->json([
            'status' => 'success',
            'data' => $templates
        ]);
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'menimbang' => 'nullable|array',
            'dasar' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $template = StTemplate::create($validator->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Template created successfully',
            'data' => $template
        ], 201);
    }

    public function update(Request $request, $id)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $template = StTemplate::find($id);
        
        if (!$template) {
            return response()->json([
                'status' => 'error',
                'message' => 'Template not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'menimbang' => 'nullable|array',
            'dasar' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $template->update($validator->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Template updated successfully',
            'data' => $template
        ]);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $template = StTemplate::find($id);
        
        if (!$template) {
            return response()->json([
                'status' => 'error',
                'message' => 'Template not found'
            ], 404);
        }

        $template->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Template deleted successfully'
        ]);
    }
}
