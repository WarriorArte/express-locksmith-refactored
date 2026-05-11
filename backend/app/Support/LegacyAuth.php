<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class LegacyAuth
{
    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function tokenFromHeader(?string $authorization): ?string
    {
        if (!$authorization) {
            return null;
        }

        if (preg_match('/Bearer\s+(.+)/i', $authorization, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    public static function userForToken(string $token): ?array
    {
        $row = DB::table('auth_tokens as at')
            ->join('app_users as au', 'au.id', '=', 'at.user_id')
            ->leftJoin('global_user_roles as gur', 'gur.user_id', '=', 'at.user_id')
            ->where('at.token', self::hashToken($token))
            ->where('at.expires_at', '>', now())
            ->select([
                'at.user_id',
                'au.is_active',
                DB::raw('COALESCE(gur.role, "user") as global_role'),
            ])
            ->first();

        if (!$row || !(int) $row->is_active) {
            return null;
        }

        return [
            'user_id' => $row->user_id,
            'is_active' => (int) $row->is_active,
            'global_role' => $row->global_role,
        ];
    }

    public static function workshopRole(string $userId, ?string $workshopId): ?string
    {
        if (!$workshopId) {
            return null;
        }

        $globalRole = DB::table('global_user_roles')
            ->where('user_id', $userId)
            ->value('role');

        if ($globalRole === 'superadmin') {
            return 'superadmin';
        }

        $role = DB::table('user_roles')
            ->where('user_id', $userId)
            ->where('workshop_id', $workshopId)
            ->orderByRaw("(role = 'admin') desc")
            ->orderBy('created_at')
            ->value('role');

        return $role ?: null;
    }

    public static function canAccessWorkshop(string $userId, ?string $workshopId): bool
    {
        return self::workshopRole($userId, $workshopId) !== null;
    }

    public static function canAdminWorkshop(string $userId, ?string $workshopId): bool
    {
        return in_array(self::workshopRole($userId, $workshopId), ['admin', 'superadmin'], true);
    }

    public static function isSuperadmin(array $authUser): bool
    {
        return ($authUser['global_role'] ?? null) === 'superadmin';
    }
}
