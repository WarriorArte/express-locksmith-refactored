<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Workshop extends Model
{
    use Uuid;

    protected $fillable = [
        'code',
        'name',
        'is_active',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
    ];

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class, 'workshop_id');
    }

    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class, 'workshop_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'workshop_id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'workshop_id');
    }

    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class, 'workshop_id');
    }
}
