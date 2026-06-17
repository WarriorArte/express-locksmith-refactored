<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Perfiles JSON globales (gestionados por SuperAdmin)
        foreach (['alarma_profiles', 'immo_profiles', 'immo_catalog_items', 'keycode_profiles'] as $table) {
            if (!Schema::hasTable($table)) {
                Schema::create($table, function (Blueprint $t) use ($table): void {
                    $t->uuid('id')->primary();
                    $t->string('name')->nullable();
                    $t->json('data');
                    $t->timestamp('created_at')->useCurrent();
                    $t->timestamp('updated_at')->useCurrent();
                });
            }
        }

        // Asignaciones de herramientas por taller
        if (!Schema::hasTable('tool_assignments')) {
            Schema::create('tool_assignments', function (Blueprint $t): void {
                $t->uuid('id')->primary();
                $t->uuid('workshop_id')->nullable()->index();
                $t->json('data');
                $t->timestamp('created_at')->useCurrent();
                $t->timestamp('updated_at')->useCurrent();
            });
        }

        // Base de datos centralizada de vehiculos
        if (!Schema::hasTable('vehicle_database_records')) {
            Schema::create('vehicle_database_records', function (Blueprint $t): void {
                $t->uuid('id')->primary();
                $t->string('make');
                $t->string('model')->default('');
                $t->integer('year')->default(0);
                $t->string('category')->nullable();
                $t->timestamp('created_at')->useCurrent();
                $t->unique(['make', 'model', 'year']);
                $t->index('make');
            });
        }
    }

    public function down(): void
    {
        foreach ([
            'vehicle_database_records',
            'tool_assignments',
            'keycode_profiles',
            'immo_catalog_items',
            'immo_profiles',
            'alarma_profiles',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
