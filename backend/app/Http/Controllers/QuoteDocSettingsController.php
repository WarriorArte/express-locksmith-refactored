<?php

namespace App\Http\Controllers;

use App\Models\QuoteDocSetting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class QuoteDocSettingsController
{
    private const FIELDS = [
        'layout',
        'preset_id',
        'ink',
        'accent',
        'paper',
        'notes',
        'payment_account',
        'payment_name',
        'payment_bank',
        'bg_url',
        'bg_opacity',
        'bg_blend',
    ];

    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->show($request),
            'PUT' => $this->update($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $workshopId = $request->query('workshop_id');

        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        return ApiResponse::success(QuoteDocSetting::query()->where('workshop_id', $workshopId)->first());
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!$user->canAdminWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        $updates = array_intersect_key($data, array_flip(self::FIELDS));

        if ($updates === []) {
            return ApiResponse::error('No hay campos para actualizar');
        }

        $settings = QuoteDocSetting::query()->firstOrCreate(
            ['workshop_id' => $workshopId],
            [
                'layout' => 'bold',
                'preset_id' => 'navy-yellow',
                'ink' => '#1a1f2e',
                'accent' => '#f4c430',
                'paper' => '#ffffff',
            ],
        );

        $settings->fill($updates)->save();

        return ApiResponse::success($settings->refresh(), 'Configuracion de cotizacion actualizada');
    }
}
