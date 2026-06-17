<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class ImmoCatalogItem extends Model
{
    use Uuid;

    protected $table = 'immo_catalog_items';
    protected $fillable = ['id', 'name', 'data'];
    protected $casts = ['data' => 'array'];
}
