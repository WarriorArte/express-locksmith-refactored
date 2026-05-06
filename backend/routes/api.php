<?php

use App\Http\Controllers\AuthController;
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
use App\Http\Controllers\SaleController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceImageController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\TemplateSelectionController;
use App\Http\Controllers\WarrantyController;
use App\Http\Controllers\WarrantySettingsController;
use App\Http\Controllers\DashboardStatsController;
use App\Http\Controllers\EnvDiagnosticController;
use App\Http\Controllers\WorkshopFeatureController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\BackupRestoreController;
use Illuminate\Support\Facades\Route;

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
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/services.php', [ServiceController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/sales.php', [SaleController::class, 'handle']);
    Route::match(['GET', 'POST', 'DELETE'], '/service-images.php', [ServiceImageController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/warranties.php', [WarrantyController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/warranty-settings.php', [WarrantySettingsController::class, 'handle']);
    Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/templates.php', [TemplateController::class, 'handle']);
    Route::match(['GET', 'POST', 'DELETE'], '/template-selections.php', [TemplateSelectionController::class, 'handle']);
    Route::match(['GET', 'PUT'], '/appadmin-settings.php', [AppAdminSettingsController::class, 'handle']);
    Route::match(['GET', 'PUT'], '/workshop-features.php', [WorkshopFeatureController::class, 'handle']);
    Route::get('/dashboard-stats.php', [DashboardStatsController::class, 'handle']);
    Route::get('/env-diagnostic.php', [EnvDiagnosticController::class, 'handle']);
    Route::match(['GET', 'POST'], '/uploads.php', [UploadController::class, 'handle']);
    Route::post('/backup-restore.php', [BackupRestoreController::class, 'handle']);
});
