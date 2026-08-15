<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class KeycodeVisualSettings extends Model
{
    use Uuid;

    protected $table = 'keycode_visual_settings';
    protected $fillable = ['id', 'data'];
    protected $casts = ['data' => 'array'];
}
