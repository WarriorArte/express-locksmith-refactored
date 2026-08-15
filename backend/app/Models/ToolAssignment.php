<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class ToolAssignment extends Model
{
    use Uuid;

    protected $table = 'tool_assignments';
    // 'workshop_id' se deja fuera a propósito: las asignaciones vehículo→perfil
    // son globales (igual que los perfiles de Keycode/Immo/Alarmas), visibles
    // para cualquier taller con la herramienta habilitada. El frontend nunca
    // establece este campo, así que si estuviera en fillable, JsonResourceController
    // filtraría por workshop_id = NULL y ningún taller vería sus asignaciones.
    protected $fillable = ['id', 'data'];
    protected $casts = ['data' => 'array'];
}
