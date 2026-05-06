<?php

namespace App\Http\Controllers;

use App\Models\BusinessSetting;
use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BusinessSettingsController
{
    private const FIELDS = [
        'name',
        'phone',
        'phone_country_code',
        'address',
        'email',
        'website',
        'logo_url',
        'facebook',
        'instagram',
        'whatsapp',
        'printer_size',
        'printer_model',
        'currency_symbol',
        'print_logo',
        'auto_cut',
        'storage_endpoint',
        'storage_secret_key',
    ];

    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->show($request),
            'POST' => $this->store($request),
            'PUT' => $this->update($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function show(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $workshopId = $request->query('workshop_id');

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        return ApiResponse::success(BusinessSetting::query()->where('workshop_id', $workshopId)->first());
    }

    private function store(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        if (BusinessSetting::query()->where('workshop_id', $workshopId)->exists()) {
            return ApiResponse::error('Ya existe una configuracion para este taller. Usa PUT para actualizar.');
        }

        $settings = BusinessSetting::query()->create([
            'workshop_id' => $workshopId,
            'name' => $data['name'] ?? 'Mi Cerrajeria',
            'phone' => $data['phone'] ?? null,
            'phone_country_code' => $data['phone_country_code'] ?? '+52',
            'address' => $data['address'] ?? null,
            'email' => $data['email'] ?? null,
            'website' => $data['website'] ?? null,
            'logo_url' => $data['logo_url'] ?? null,
            'facebook' => $data['facebook'] ?? null,
            'instagram' => $data['instagram'] ?? null,
            'whatsapp' => $data['whatsapp'] ?? null,
            'printer_size' => $data['printer_size'] ?? '80mm',
            'printer_model' => $data['printer_model'] ?? 'generic',
            'currency_symbol' => $data['currency_symbol'] ?? '$',
            'print_logo' => (int) ($data['print_logo'] ?? 1),
            'auto_cut' => (int) ($data['auto_cut'] ?? 1),
            'storage_endpoint' => $data['storage_endpoint'] ?? null,
            'storage_secret_key' => $data['storage_secret_key'] ?? null,
        ]);

        return ApiResponse::success($settings->refresh(), 'Configuracion creada');
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $settings = BusinessSetting::query()->firstOrCreate(
            ['workshop_id' => $workshopId],
            ['name' => $data['name'] ?? 'Mi Cerrajeria']
        );

        $updates = array_intersect_key($data, array_flip(self::FIELDS));

        if ($updates === []) {
            return ApiResponse::error('No hay campos para actualizar');
        }

        $settings->fill($updates)->save();

        return ApiResponse::success($settings->refresh(), 'Configuracion actualizada');
    }
}
