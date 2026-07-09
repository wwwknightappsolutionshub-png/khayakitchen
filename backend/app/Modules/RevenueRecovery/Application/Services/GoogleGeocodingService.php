<?php

namespace App\Modules\RevenueRecovery\Application\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class GoogleGeocodingService
{
    /**
     * @return array{lat: float, lng: float, formatted_address: string|null}
     */
    public function geocodeAddress(string $address): array
    {
        $apiKey = config('services.google_maps.api_key');
        if (! $apiKey) {
            throw ValidationException::withMessages([
                'kitchen_address_text' => ['Google Maps API key is not configured on the server.'],
            ]);
        }

        $response = Http::timeout(15)->get('https://maps.googleapis.com/maps/api/geocode/json', [
            'address' => $address,
            'key' => $apiKey,
        ]);

        if (! $response->ok()) {
            Log::warning('Google geocoding HTTP failure', ['status' => $response->status()]);
            throw ValidationException::withMessages([
                'kitchen_address_text' => ['Could not geocode the kitchen address. Try again later.'],
            ]);
        }

        $payload = $response->json();
        $status = $payload['status'] ?? 'UNKNOWN_ERROR';

        if ($status !== 'OK' || empty($payload['results'][0]['geometry']['location'])) {
            throw ValidationException::withMessages([
                'kitchen_address_text' => ['Could not resolve that address. Check spelling and try again.'],
            ]);
        }

        $location = $payload['results'][0]['geometry']['location'];

        return [
            'lat' => (float) $location['lat'],
            'lng' => (float) $location['lng'],
            'formatted_address' => $payload['results'][0]['formatted_address'] ?? null,
        ];
    }
}
