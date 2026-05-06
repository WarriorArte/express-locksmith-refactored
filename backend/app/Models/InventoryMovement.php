<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class InventoryMovement extends Model
{
    use Uuid;

    protected $fillable = [
        'workshop_id',
        'product_id',
        'movement_type',
        'from_location',
        'to_location',
        'quantity',
        'reference_type',
        'reference_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public const UPDATED_AT = null;
}
