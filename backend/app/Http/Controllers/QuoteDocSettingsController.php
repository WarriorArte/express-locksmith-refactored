<?php

namespace App\Http\Controllers;

use App\Models\QuoteDocSetting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

final class QuoteDocSettingsController
{
    private const FIELDS = [
        'layout',
        'preset_id',
        'ink',
        'accent',
        'accent_ink',
        'header',
        'header_ink',
        'table_head',
        'table_head_ink',
        'muted',
        'soft',
        'rule',
        'paper',
        'logo_size',
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

        $columns = array_filter(self::FIELDS, fn ($field) => Schema::hasColumn('quote_doc_settings', $field));
        $updates = array_intersect_key($data, array_flip($columns));

        if ($updates === []) {
            return ApiResponse::error('No hay campos para actualizar');
        }

        $defaults = [
            'layout' => 'bold',
            'preset_id' => 'navy-yellow',
            'ink' => '#1a1f2e',
            'accent' => '#f4c430',
            'accent_ink' => '#1a1f2e',
            'header' => '#1a1f2e',
            'header_ink' => '#ffffff',
            'table_head' => '#1a1f2e',
            'table_head_ink' => '#ffffff',
            'muted' => '#7c7c74',
            'soft' => '#f5f5f3',
            'rule' => '#e6e4dd',
            'paper' => '#ffffff',
            'logo_size' => 110,
        ];

        $settings = QuoteDocSetting::query()->firstOrCreate(
            ['workshop_id' => $workshopId],
            array_intersect_key($defaults, array_flip($columns)),
        );

        $settings->fill($updates)->save();

        return ApiResponse::success($settings->refresh(), 'Configuracion de cotizacion actualizada');
    }
}
