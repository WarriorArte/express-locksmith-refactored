<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class Profile extends Model
{
    use Uuid;

    protected $fillable = [
        'user_id',
        'full_name',
        'email',
        'avatar_url',
        'locksmith_id',
        'current_workshop_id',
    ];
}
