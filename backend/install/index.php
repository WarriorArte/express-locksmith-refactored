<?php

use App\Http\Controllers\InstallController;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';

$app->make(ConsoleKernel::class)->bootstrap();

$request = Request::capture();
$controller = $app->make(InstallController::class);
$response = $controller->handle($request);
$response->send();