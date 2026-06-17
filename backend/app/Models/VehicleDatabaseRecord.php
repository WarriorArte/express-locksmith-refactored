<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class VehicleDatabaseRecord extends Model
{
    use Uuid;

    public const UPDATED_AT = null;

    protected $table = 'vehicle_database_records';
    protected $fillable = ['id', 'make', 'model', 'year', 'category'];
    protected $casts = ['year' => 'integer'];
}
