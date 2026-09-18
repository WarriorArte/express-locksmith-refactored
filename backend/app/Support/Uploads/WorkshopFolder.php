<?php

namespace App\Support\Uploads;

final class WorkshopFolder
{
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
}
