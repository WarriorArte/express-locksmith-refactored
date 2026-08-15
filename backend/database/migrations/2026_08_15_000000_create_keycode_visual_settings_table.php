<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Ajustes visuales globales del generador de llaves (colores y grosor del
        // trazo), aplicados a todas las series de Keycode. Tabla singleton: solo
        // se usa/crea una fila.
        if (!Schema::hasTable('keycode_visual_settings')) {
            Schema::create('keycode_visual_settings', function (Blueprint $t): void {
                $t->uuid('id')->primary();
                $t->json('data');
                $t->timestamp('created_at')->useCurrent();
                $t->timestamp('updated_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('keycode_visual_settings');
    }
};
