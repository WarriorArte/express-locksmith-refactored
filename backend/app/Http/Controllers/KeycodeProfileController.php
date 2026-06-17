<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\JsonResourceController;
use App\Models\KeycodeProfile;

final class KeycodeProfileController extends JsonResourceController
{
    protected function modelClass(): string { return KeycodeProfile::class; }
}
