<?php

namespace App\Shared\Utils;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success(mixed $data = null, int $status = 200): JsonResponse
    {
        return response()->json($data ?? ['success' => true], $status);
    }

    public static function error(
        string $message,
        string $code = 'ERROR',
        mixed $details = null,
        int $status = 400,
    ): JsonResponse {
        return response()->json([
            'error' => true,
            'message' => $message,
            'code' => $code,
            'details' => $details ?? (object) [],
        ], $status);
    }
}
