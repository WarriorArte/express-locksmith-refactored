<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\JsonResourceController;
use App\Models\ImmoProfile;

final class ImmoProfileController extends JsonResourceController
{
    protected function modelClass(): string { return ImmoProfile::class; }
}
