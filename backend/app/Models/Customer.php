<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class Customer extends Model
{
    use Uuid;

    protected $fillable = [
        'workshop_id',
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
        'total_purchases',
        'total_services',
    ];

    protected $casts = [
        'is_vip' => 'boolean',
        'is_frequent' => 'boolean',
        'is_normal' => 'boolean',
        'has_debt' => 'boolean',
        'no_work_again' => 'boolean',
        'total_purchases' => 'decimal:2',
        'total_services' => 'integer',
    ];
}
