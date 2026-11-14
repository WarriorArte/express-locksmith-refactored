<?php

namespace App\Support\Uploads;

final class WorkshopFolder
{
    /** Carpeta generica heredada para subidas sin workshop_code (ya no se usa para nuevas subidas). */
    public const MISC = 'misc';

    /**
     * Carpeta privada del SuperAdmin (Herramientas: Immo, Keycode, procedimientos…).
     * Solo el SuperAdmin puede listarla, subir, renombrar o borrar en ella.
     */
    public const SUPERADMIN = 'superadmin';

    /** Codigos que nunca pueden pertenecer a un taller. */
    public const RESERVED = [self::MISC, self::SUPERADMIN];

    /**
     * Normaliza un workshop_code (o un nombre de subcarpeta) al mismo formato
     * usado como nombre de carpeta real en uploads/{code}/{folder}: minusculas,
     * solo [a-z0-9_-]. Debe ser la UNICA fuente de esta regla — cualquier
     * codigo que construya rutas hacia uploads/ tiene que pasar por aqui, o
     * terminara apuntando a una carpeta que no es la que existe en disco.
     */
    public static function slug(string $value, string $fallback = 'misc'): string
    {
        return preg_replace('/[^a-z0-9_\-]/', '', strtolower($value)) ?: $fallback;
    }

    /** true si el codigo (ya normalizado o no) es una carpeta reservada del sistema. */
    public static function isReserved(?string $code): bool
    {
        if ($code === null || trim($code) === '') return false;
        return in_array(self::slug($code, ''), self::RESERVED, true);
    }
}
