<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Esta tabla ya existe en producción (creada antes de una reducción de
        // migraciones). Esta migración es solo de respaldo para entornos que
        // no la tengan (dev/fresh install) — no hace nada si ya existe.
        if (!Schema::hasTable('workshop_features')) {
            Schema::create('workshop_features', function (Blueprint $t): void {
                $t->uuid('id')->primary();
                $t->uuid('workshop_id')->index();
                $t->string('feature_key');
                $t->boolean('is_enabled')->default(true);
                $t->json('settings')->nullable();
                $t->timestamp('created_at')->useCurrent();
                $t->unique(['workshop_id', 'feature_key']);
            });
        }
    }

    public function down(): void
    {
        // No-op: no queremos borrar esta tabla si ya existía antes de esta migración.
    }
};
