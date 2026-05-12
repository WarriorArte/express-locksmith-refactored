<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $itemType = $this->input('item_type', 'product');
        
        return [
            'workshop_id' => ['required', 'string', 'uuid'],
            'item_type' => ['sometimes', 'string', 'in:product,service'],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => $itemType === 'product' 
                ? ['required', 'string', 'uuid'] 
                : ['nullable', 'string', 'uuid'],
            'description' => ['nullable', 'string'],
            'instructions' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string', 'url'],
            'stock_store' => ['integer', 'min:0'],
            'stock_warehouse' => ['integer', 'min:0'],
            'min_stock' => ['integer', 'min:0'],
            'purchase_price_imported' => ['nullable', 'numeric', 'min:0'],
            'purchase_price_local' => ['numeric', 'min:0'],
            'sale_price_min' => ['numeric', 'min:0'],
            'sale_price_max' => ['numeric', 'min:0'],
            'tag_ids' => ['array'],
            'tag_ids.*' => ['string', 'uuid'],
            // Service-specific fields
            'service_type' => ['nullable', 'string', 'in:automotive,residential,commercial,industrial'],
            'labor_cost' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'service_products' => ['nullable', 'array'],
            'service_products.*.product_id' => ['sometimes', 'nullable', 'string', 'uuid'],
            'service_products.*.product_name' => ['sometimes', 'required', 'string', 'max:255'],
            'service_products.*.quantity' => ['sometimes', 'required', 'integer', 'min:1'],
            'service_products.*.unit_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'service_products.*.subtotal' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'workshop_id.required' => 'El taller es requerido',
            'name.required' => 'El nombre del producto es requerido',
            'name.max' => 'El nombre no puede superar 255 caracteres',
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
