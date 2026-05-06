<?php

use App\Http\Controllers\InstallController;
use Illuminate\Support\Facades\Route;

// Delete the backend/install directory in production to disable the installer.
Route::match(['GET', 'POST'], '/install', [InstallController::class, 'handle']);