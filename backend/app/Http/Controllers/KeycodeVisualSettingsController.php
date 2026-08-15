<?php

namespace App\Http\Controllers;

use App\Models\KeycodeVisualSettings;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class KeycodeVisualSettingsController
{
    use \App\Http\Controllers\Concerns\AuthorizesTools;

    private const DEFAULTS = [
        'strokeColorLight' => '#00AEE6',
        'strokeColorDark'  => '#00AEE6',
        'strokeWidth'      => 3.5,
    ];

    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET'   => $this->show($request),
            'PUT'   => $this->update($request),
            default => ApiResponse::error('Método no permitido', 405),
        };
    }

    private function show(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeToolsRead($request)) return $resp;

        $row = KeycodeVisualSettings::query()->first();
        return ApiResponse::success([...self::DEFAULTS, ...($row?->data ?? [])]);
    }

    private function update(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeToolsWrite($request)) return $resp;

        $payload = $request->json()->all();
        $data    = [...self::DEFAULTS, ...$payload];

        $row = KeycodeVisualSettings::query()->first();
        if ($row) {
            $row->data = $data;
            $row->save();
        } else {
            $row = KeycodeVisualSettings::create(['data' => $data]);
        }

        return ApiResponse::success($row->data, 'Guardado');
    }
}
