<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class AppUser extends Model
{
    use Uuid;

    protected $table = 'app_users';

    protected $fillable = [
        'email',
        'password_hash',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
