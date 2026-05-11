<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'customer_type' => ['sometimes', 'in:person,company'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'phone_secondary' => ['sometimes', 'nullable', 'string', 'max:50'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'is_vip' => ['sometimes', 'boolean'],
            'is_frequent' => ['sometimes', 'boolean'],
            'is_normal' => ['sometimes', 'boolean'],
            'has_debt' => ['sometimes', 'boolean'],
            'no_work_again' => ['sometimes', 'boolean'],
            'no_work_reason' => ['sometimes', 'nullable', 'string'],
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
