<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Unica fuente de verdad sobre QUIEN es el SuperAdmin.
 *
 * Solo existe un SuperAdmin: la cuenta cuyo correo esta en
 * superadmin_access_settings (fila singleton). Un registro 'superadmin' en
 * global_user_roles que no corresponda a esa cuenta NO da permisos: asi ni un
 * dato corrupto, ni un backup restaurado, ni un error futuro pueden convertir a
 * un usuario de taller en SuperAdmin.
 *
 * Reglas que se apoyan en esta clase:
 *  - nadie puede recibir el rol (no hay endpoint que lo asigne);
 *  - el SuperAdmin no puede pertenecer a un taller, ni eliminarse, ni cambiar su
 *    contrasena por la gestion de usuarios (solo en «Acceso SuperAdmin»);
 *  - el codigo de acceso del SuperAdmin no puede usarse como codigo de taller.
 */
final class SuperadminAccount
{
    private static bool $loaded = false;
    private static ?object $settings = null;
    private static ?string $userId = null;

    /** Fila de superadmin_access_settings (cacheada durante la peticion). */
    public static function settings(): ?object
    {
        if (!self::$loaded) {
            self::$loaded = true;
            self::$settings = Schema::hasTable('superadmin_access_settings')
                ? DB::table('superadmin_access_settings')->where('singleton_guard', 1)->first()
                : null;
            self::$userId = self::$settings
                ? DB::table('app_users')->whereRaw('LOWER(email) = ?', [strtolower((string) self::$settings->email)])->value('id')
                : null;
        }
        return self::$settings;
    }

    /** Vacia la cache (tras cambiar los datos de acceso en la misma peticion). */
    public static function forget(): void
    {
        self::$loaded = false;
        self::$settings = null;
        self::$userId = null;
    }

    /** id de app_users del SuperAdmin unico, o null si aun no esta configurado. */
    public static function userId(): ?string
    {
        self::settings();
        return self::$userId;
    }

    public static function isUserId(?string $userId): bool
    {
        return $userId !== null && $userId !== '' && $userId === self::userId();
    }

    public static function email(): ?string
    {
        $s = self::settings();
        return $s ? strtolower((string) $s->email) : null;
    }

    /** Codigo de acceso del SuperAdmin (no puede coincidir con el de un taller). */
    public static function accessCode(): ?string
    {
        $s = self::settings();
        return $s ? strtoupper(trim((string) $s->workshop_code)) : null;
    }

    public static function isAccessCode(?string $code): bool
    {
        $access = self::accessCode();
        return $access !== null && $access !== '' && strtoupper(trim((string) $code)) === $access;
    }
}
