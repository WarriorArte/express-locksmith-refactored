<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class ToolAssignment extends Model
{
    use Uuid;

    protected $table = 'tool_assignments';
    protected $fillable = ['id', 'workshop_id', 'data'];
    protected $casts = ['data' => 'array'];
}
