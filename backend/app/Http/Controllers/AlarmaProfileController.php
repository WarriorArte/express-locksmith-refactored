<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\JsonResourceController;
use App\Models\AlarmaProfile;

final class AlarmaProfileController extends JsonResourceController
{
    protected function modelClass(): string { return AlarmaProfile::class; }
}
