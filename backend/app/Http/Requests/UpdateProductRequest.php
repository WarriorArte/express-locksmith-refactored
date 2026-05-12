<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $itemType = $this->input('item_type') ?? 'product'; // Default to product if not specified
        
        return [
            'item_type' => ['sometimes', 'string', 'in:product,service'],
            'name' => ['sometimes', 'string', 'max:255'],
            'category_id' => $itemType === 'product'
                ? ['sometimes', 'required', 'string', 'uuid']
                : ['sometimes', 'nullable', 'string', 'uuid'],
            'description' => ['sometimes', 'nullable', 'string'],
            'instructions' => ['sometimes', 'nullable', 'string'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'image_url' => ['sometimes', 'nullable', 'string'],
            'stock_store' => ['sometimes', 'integer', 'min:0'],
            'stock_warehouse' => ['sometimes', 'integer', 'min:0'],
            'min_stock' => ['sometimes', 'integer', 'min:0'],
            'purchase_price_imported' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'purchase_price_local' => ['sometimes', 'numeric', 'min:0'],
            'sale_price_min' => ['sometimes', 'numeric', 'min:0'],
            'sale_price_max' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['string', 'uuid'],
            // Service-specific fields
            'service_type' => ['sometimes', 'nullable', 'string', 'in:automotive,residential,commercial,industrial'],
            'labor_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'discount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'service_products' => ['sometimes', 'nullable', 'array'],
            'service_products.*.product_id' => ['sometimes', 'nullable', 'string', 'uuid'],
            'service_products.*.product_name' => ['sometimes', 'required', 'string', 'max:255'],
            'service_products.*.quantity' => ['sometimes', 'required', 'integer', 'min:1'],
            'service_products.*.unit_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'service_products.*.subtotal' => ['sometimes', 'nullable', 'numeric', 'min:0'],
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
