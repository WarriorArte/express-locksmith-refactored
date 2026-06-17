<?php

use App\Http\Controllers\AlarmaProfileController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ImmoCatalogController;
use App\Http\Controllers\ImmoProfileController;
use App\Http\Controllers\KeycodeProfileController;
use App\Http\Controllers\ToolAssignmentController;
use App\Http\Controllers\VehicleDatabaseController;
use App\Http\Controllers\AppAdminSettingsController;
use App\Http\Controllers\BusinessSettingsController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\InventoryMovementController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\WorkshopController;
use App\Http\Controllers\QuoteController;
use App\Http\Controllers\QuoteDocSettingsController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceImageController;
use App\Http\Controllers\SuperAdminAccessController;
use App\Http\Controllers\WarrantyController;
use App\Http\Controllers\WarrantySettingsController;
use App\Http\Controllers\DashboardStatsController;
use App\Http\Controllers\EnvDiagnosticController;
use App\Http\Controllers\WorkshopFeatureController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\BackupRestoreController;
use App\Http\Controllers\InstallController;
use App\Http\Controllers\MaintenanceController;
use Illuminate\Support\Facades\Route;

// Preflight CORS
Route::options('/{path}', fn () => response('', 204))->where('path', '.*');

// Setup (sin auth)
Route::any('/install', [InstallController::class, 'handle']);

// Login SuperAdmin aislado (sin auth para config publica y login)
Route::get('/superadmin-auth/config', [SuperAdminAccessController::class, 'publicConfig']);
Route::post('/superadmin-auth/login', [SuperAdminAccessController::class, 'login']);

// ──────────────────────────────────────────
//  RUTAS REST (paginadas, limpias)
// ──────────────────────────────────────────

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('legacy.auth')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });
});

Route::middleware('legacy.auth')->group(function (): void {
    // Products
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Customers
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::put('/customers/{id}', [CustomerController::class, 'update']);
    Route::delete('/customers/{id}', [CustomerController::class, 'destroy']);

    // Quotes
    Route::get('/quotes', [QuoteController::class, 'index']);
    Route::get('/quotes/{id}', [QuoteController::class, 'show']);
    Route::post('/quotes', [QuoteController::class, 'store']);
    Route::put('/quotes/{id}', [QuoteController::class, 'update']);
    Route::delete('/quotes/{id}', [QuoteController::class, 'destroy']);
    Route::get('/quote-doc-settings', [QuoteDocSettingsController::class, 'show']);
    Route::put('/quote-doc-settings', [QuoteDocSettingsController::class, 'update']);

    // Sales
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/{id}', [SaleController::class, 'show']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::put('/sales/{id}', [SaleController::class, 'update']);
    Route::delete('/sales/{id}', [SaleController::class, 'destroy']);

    // Services
    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/services/{id}', [ServiceController::class, 'show']);
    Route::post('/services', [ServiceController::class, 'store']);
    Route::put('/services/{id}', [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);

    // Warranties
    Route::get('/warranties', [WarrantyController::class, 'index']);
    Route::get('/warranties/{id}', [WarrantyController::class, 'show']);
    Route::post('/warranties', [WarrantyController::class, 'store']);
    Route::put('/warranties/{id}', [WarrantyController::class, 'update']);
    Route::delete('/warranties/{id}', [WarrantyController::class, 'destroy']);

    // Dashboard
    Route::get('/dashboard-stats', [DashboardStatsController::class, 'handle']);
});

// ──────────────────────────────────────────
//  RUTAS LEGACY (compatibilidad con frontend)
//  Se mantienen mientras el frontend migra
// ──────────────────────────────────────────

Route::match(['GET', 'POST'], '/auth.php', [AuthController::class, 'handle']);

Route::middleware('legacy.auth')->group(function (): void {
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/customers.php', [CustomerController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/workshops.php', [WorkshopController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/profiles.php', [ProfileController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT'], '/business-settings.php', [BusinessSettingsController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/categories.php', [CategoryController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/tags.php', [TagController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/products.php', [ProductController::class, 'handle']);
    Route::match(['GET', 'POST'], '/inventory-movements.php', [InventoryMovementController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/quotes.php', [QuoteController::class, 'handle']);
    Route::match(['GET', 'PUT'], '/quote-doc-settings.php', [QuoteDocSettingsController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/services.php', [ServiceController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/sales.php', [SaleController::class, 'handle']);
    Route::match(['GET', 'POST', 'DELETE'], '/service-images.php', [ServiceImageController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/warranties.php', [WarrantyController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/warranty-settings.php', [WarrantySettingsController::class, 'handle']);
    Route::match(['GET', 'PUT'], '/appadmin-settings.php', [AppAdminSettingsController::class, 'handle']);
    Route::match(['GET', 'PUT'], '/superadmin-access.php', [SuperAdminAccessController::class, 'handle']);
    Route::match(['GET', 'PUT'], '/workshop-features.php', [WorkshopFeatureController::class, 'handle']);
    Route::get('/dashboard-stats.php', [DashboardStatsController::class, 'handle']);
    Route::get('/env-diagnostic.php', [EnvDiagnosticController::class, 'handle']);
    Route::match(['GET', 'POST'], '/uploads.php', [UploadController::class, 'handle']);
    Route::post('/backup-restore.php', [BackupRestoreController::class, 'handle']);

    // ── Modulo Herramientas (SuperAdmin) ─────────────────────────────
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/herramientas/alarma-profiles', [AlarmaProfileController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/herramientas/immo-profiles', [ImmoProfileController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/herramientas/immo-catalog', [ImmoCatalogController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/herramientas/keycode-profiles', [KeycodeProfileController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/herramientas/tool-assignments', [ToolAssignmentController::class, 'handle']);
    Route::match(['GET', 'POST', 'DELETE'], '/herramientas/vehicle-database', [VehicleDatabaseController::class, 'handle']);
    Route::match(['GET', 'DELETE'], '/herramientas/maintenance', [MaintenanceController::class, 'handle']);
});
