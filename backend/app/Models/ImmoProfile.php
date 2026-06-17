<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class ImmoProfile extends Model
{
    use Uuid;

    protected $table = 'immo_profiles';
    protected $fillable = ['id', 'name', 'data'];
    protected $casts = ['data' => 'array'];
}
