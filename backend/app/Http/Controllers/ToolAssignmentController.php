<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\JsonResourceController;
use App\Models\ToolAssignment;

final class ToolAssignmentController extends JsonResourceController
{
    protected function modelClass(): string { return ToolAssignment::class; }
}
