<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

final class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'La contrasena actual es requerida',
            'new_password.required' => 'La nueva contrasena es requerida',
            'new_password.min' => 'La nueva contrasena debe tener al menos 8 caracteres',
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
