<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerController
{
    private const EDITABLE_FIELDS = [
        'name',
        'customer_type',
        'phone',
        'phone_secondary',
        'email',
        'address',
        'notes',
        'is_vip',
        'is_frequent',
        'is_normal',
        'has_debt',
        'no_work_again',
        'no_work_reason',
    ];

    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->showOrList($request),
            'POST' => $this->store($request),
            'PUT' => $this->update($request),
            'DELETE' => $this->destroy($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function showOrList(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if ($id) {
            $customer = Customer::query()->find($id);

            if (!$customer) {
                return ApiResponse::error('Cliente no encontrado', 404);
            }

            if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $customer->workshop_id)) {
                return ApiResponse::error('Sin acceso al taller indicado', 401);
            }

            return ApiResponse::success($customer);
        }

        $workshopId = $request->query('workshop_id');

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $customers = Customer::query()
            ->where('workshop_id', $workshopId)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($customers);
    }

    private function store(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        if (empty($data['name'])) {
            return ApiResponse::error('El campo name es requerido');
        }

        $customer = Customer::query()->create([
            'workshop_id' => $workshopId,
            'name' => $data['name'],
            'customer_type' => $data['customer_type'] ?? 'person',
            'phone' => $data['phone'] ?? null,
            'phone_secondary' => $data['phone_secondary'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_vip' => (int) ($data['is_vip'] ?? 0),
            'is_frequent' => (int) ($data['is_frequent'] ?? 0),
            'is_normal' => (int) ($data['is_normal'] ?? 0),
            'has_debt' => (int) ($data['has_debt'] ?? 0),
            'no_work_again' => (int) ($data['no_work_again'] ?? 0),
            'no_work_reason' => $data['no_work_reason'] ?? null,
        ]);

        return ApiResponse::success($customer->refresh(), 'Cliente creado');
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $customer = Customer::query()->find($id);

        if (!$customer) {
            return ApiResponse::error('Cliente no encontrado', 404);
        }

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $customer->workshop_id)) {
            return ApiResponse::error('Sin acceso al taller indicado', 401);
        }

        $data = $request->json()->all();
        $updates = array_intersect_key($data, array_flip(self::EDITABLE_FIELDS));

        if ($updates === []) {
            return ApiResponse::error('No hay campos para actualizar');
        }

        $customer->fill($updates)->save();

        return ApiResponse::success($customer->refresh(), 'Cliente actualizado');
    }

    private function destroy(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $customer = Customer::query()->find($id);

        if (!$customer) {
            return ApiResponse::error('Cliente no encontrado', 404);
        }

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $customer->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        }

        $customer->delete();

        return ApiResponse::success(null, 'Cliente eliminado');
    }
}
