<?php

use App\Http\Controllers\InstallController;
use Illuminate\Support\Facades\Route;

Route::match(['GET', 'POST'], '/install', [InstallController::class, 'handle']);
