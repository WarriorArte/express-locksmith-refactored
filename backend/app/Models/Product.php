<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class Product extends Model
{
    use Uuid;

    protected $fillable = [
        'workshop_id',
        'category_id',
        'name',
        'description',
        'instructions',
        'notes',
        'image_url',
        'stock_store',
        'stock_warehouse',
        'min_stock',
        'purchase_price_imported',
        'purchase_price_local',
        'sale_price_min',
        'sale_price_max',
        'is_active',
    ];

    protected $casts = [
        'stock_store' => 'integer',
        'stock_warehouse' => 'integer',
        'min_stock' => 'integer',
        'purchase_price_imported' => 'decimal:2',
        'purchase_price_local' => 'decimal:2',
        'sale_price_min' => 'decimal:2',
        'sale_price_max' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
