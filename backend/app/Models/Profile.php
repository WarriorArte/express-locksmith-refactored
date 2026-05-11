<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(AppUser::class, 'user_id');
    }

    public function currentWorkshop(): BelongsTo
    {
        return $this->belongsTo(Workshop::class, 'current_workshop_id');
    }
}
