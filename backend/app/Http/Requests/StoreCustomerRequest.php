<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'workshop_id' => ['required', 'string', 'uuid'],
            'name' => ['required', 'string', 'max:255'],
            'customer_type' => ['in:person,company'],
            'phone' => ['nullable', 'string', 'max:50'],
            'phone_secondary' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'is_vip' => ['boolean'],
            'is_frequent' => ['boolean'],
            'is_normal' => ['boolean'],
            'has_debt' => ['boolean'],
            'no_work_again' => ['boolean'],
            'no_work_reason' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'workshop_id.required' => 'El taller es requerido',
            'name.required' => 'El nombre del cliente es requerido',
            'customer_type.in' => 'El tipo de cliente debe ser "person" o "company"',
        ];
    }

    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): never
    {
        throw new \Illuminate\Validation\ValidationException(
            $validator,
            \App\Support\ApiResponse::error('Datos invalidos', 422, $validator->errors()->toArray())
        );
    }
}
