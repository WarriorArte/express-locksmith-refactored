<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class AlarmaProfile extends Model
{
    use Uuid;

    protected $table = 'alarma_profiles';
    protected $fillable = ['id', 'name', 'data'];
    protected $casts = ['data' => 'array'];
}
