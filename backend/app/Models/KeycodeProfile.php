<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class KeycodeProfile extends Model
{
    use Uuid;

    protected $table = 'keycode_profiles';
    protected $fillable = ['id', 'name', 'data'];
    protected $casts = ['data' => 'array'];
}
