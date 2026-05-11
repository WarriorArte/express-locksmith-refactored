<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesWorkshop;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerController
{
    use AuthorizesWorkshop;

    /** Punto de entrada legacy — mantiene compatibilidad con el frontend actual */
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->legacyList($request),
            'POST' => $this->store(StoreCustomerRequest::createFrom($request)),
            'PUT' => $this->update(UpdateCustomerRequest::createFrom($request), $request->query('id', '')),
            'DELETE' => $this->destroy($request, $request->query('id', '')),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    /** GET /api/customers?workshop_id=&page=1&per_page=50&search= */
    public function index(Request $request): JsonResponse
    {
        $id = $request->query('id');

        if ($id) {
            return $this->show($request, $id);
        }

        $workshopId = $request->query('workshop_id');

        if ($err = $this->requireAccess($request, $workshopId)) return $err;

        $query = Customer::where('workshop_id', $workshopId)
            ->orderByDesc('created_at');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->query('per_page', 50), 200);

        return ApiResponse::paginated($query->paginate($perPage));
    }

    /** GET /api/customers/{id} */
    public function show(Request $request, string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return ApiResponse::error('Cliente no encontrado', 404);
        }

        if ($err = $this->requireAccess($request, $customer->workshop_id)) return $err;

        return ApiResponse::success($customer);
    }

    /** POST /api/customers */
    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $workshopId = $request->query('workshop_id', $request->input('workshop_id'));

        if ($err = $this->requireAccess($request, $workshopId)) return $err;

        $customer = Customer::create([
            'workshop_id' => $workshopId,
            'name' => $request->input('name'),
            'customer_type' => $request->input('customer_type', 'person'),
            'phone' => $request->input('phone'),
            'phone_secondary' => $request->input('phone_secondary'),
            'email' => $request->input('email'),
            'address' => $request->input('address'),
            'notes' => $request->input('notes'),
            'is_vip' => $request->boolean('is_vip'),
            'is_frequent' => $request->boolean('is_frequent'),
            'is_normal' => $request->boolean('is_normal'),
            'has_debt' => $request->boolean('has_debt'),
            'no_work_again' => $request->boolean('no_work_again'),
            'no_work_reason' => $request->input('no_work_reason'),
        ]);

        return ApiResponse::success($customer->fresh(), 'Cliente creado', 201);
    }

    /** PUT /api/customers/{id} */
    public function update(UpdateCustomerRequest $request, string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return ApiResponse::error('Cliente no encontrado', 404);
        }

        if ($err = $this->requireAccess($request, $customer->workshop_id)) return $err;

        $customer->fill($request->only([
            'name', 'customer_type', 'phone', 'phone_secondary', 'email',
            'address', 'notes', 'is_vip', 'is_frequent', 'is_normal',
            'has_debt', 'no_work_again', 'no_work_reason',
        ]))->save();

        return ApiResponse::success($customer->fresh(), 'Cliente actualizado');
    }

    /** DELETE /api/customers/{id} */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return ApiResponse::error('Cliente no encontrado', 404);
        }

        if ($err = $this->requireAdmin($request, $customer->workshop_id)) return $err;

        $customer->delete();

        return ApiResponse::success(null, 'Cliente eliminado');
    }

    /** Lista legacy con cap de seguridad — sin pagination para no romper frontend actual */
    private function legacyList(Request $request): JsonResponse
    {
        $id = $request->query('id');

        if ($id) {
            return $this->show($request, $id);
        }

        $workshopId = $request->query('workshop_id');

        if ($err = $this->requireAccess($request, $workshopId)) return $err;

        $customers = Customer::where('workshop_id', $workshopId)
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        return ApiResponse::success($customers);
    }
}
