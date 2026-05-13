<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

final class AppUser extends Authenticatable
{
    use HasApiTokens, Uuid;

    protected $table = 'app_users';

    protected $fillable = [
        'email',
        'password_hash',
        'is_active',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class, 'user_id');
    }

    public function globalRole(): HasOne
    {
        return $this->hasOne(GlobalUserRole::class, 'user_id');
    }

    public function workshopRoles(): HasMany
    {
        return $this->hasMany(UserRole::class, 'user_id');
    }

    public function getGlobalRoleAttribute(): string
    {
        if ($this->relationLoaded('globalRole')) {
            return $this->getRelation('globalRole')?->role ?? 'user';
        }

        return $this->globalRole()->value('role') ?? 'user';
    }

    public function isSuperadmin(): bool
    {
        return $this->global_role === 'superadmin';
    }

    public function canAccessWorkshop(?string $workshopId): bool
    {
        if (!$workshopId) {
            return false;
        }

        if ($this->isSuperadmin()) {
            return true;
        }

        if ($this->relationLoaded('workshopRoles')) {
            return $this->workshopRoles->contains('workshop_id', $workshopId);
        }

        return $this->workshopRoles()->where('workshop_id', $workshopId)->exists();
    }

    public function canAdminWorkshop(?string $workshopId): bool
    {
        if (!$workshopId) {
            return false;
        }

        if ($this->isSuperadmin()) {
            return true;
        }

        if ($this->relationLoaded('workshopRoles')) {
            return $this->workshopRoles->contains(
                fn ($r) => $r->workshop_id === $workshopId && $r->role === 'admin'
            );
        }

        return $this->workshopRoles()
            ->where('workshop_id', $workshopId)
            ->where('role', 'admin')
            ->exists();
    }

    public function roleInWorkshop(?string $workshopId): ?string
    {
        if (!$workshopId) {
            return null;
        }

        if ($this->isSuperadmin()) {
            return 'superadmin';
        }

        if ($this->relationLoaded('workshopRoles')) {
            $role = $this->workshopRoles
                ->where('workshop_id', $workshopId)
                ->sortByDesc(fn ($r) => $r->role === 'admin' ? 1 : 0)
                ->first();
            return $role?->role;
        }

        return $this->workshopRoles()
            ->where('workshop_id', $workshopId)
            ->orderByRaw("(role = 'admin') desc")
            ->value('role');
    }
}
