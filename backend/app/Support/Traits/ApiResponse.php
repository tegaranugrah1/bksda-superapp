<?php

namespace App\Support\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    /**
     * Return a success JSON response.
     *
     * @param  mixed  $data
     * @param  string|null  $message
     * @param  int  $statusCode
     * @param  array|null  $meta
     * @return JsonResponse
     */
    protected function successResponse($data, ?string $message = null, int $statusCode = 200, ?array $meta = null): JsonResponse
    {
        $response = [
            'data' => $data,
        ];

        if ($meta !== null) {
            $response['meta'] = $meta;
        }

        if ($message !== null) {
            $response['message'] = $message;
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Return an error JSON response.
     *
     * @param  string  $message
     * @param  string|null  $error
     * @param  int  $statusCode
     * @param  array|null  $errors
     * @return JsonResponse
     */
    protected function errorResponse(string $message, ?string $error = null, int $statusCode = 400, ?array $errors = null): JsonResponse
    {
        $response = [
            'message' => $message,
        ];

        if ($error !== null) {
            $response['error'] = $error;
        }

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $statusCode);
    }
}
