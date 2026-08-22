<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Códigos "Valet": mismo código que en keycode_codes, pero con un bitting
 * distinto (llave de valet: opera el vehículo con acceso restringido).
 * Estructura idéntica (ya optimizada) a keycode_codes.
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('keycode_valet_codes')) {
            Schema::create('keycode_valet_codes', function (Blueprint $t): void {
                $t->uuid('profile_id');
                $t->string('codigo', 20);
                $t->string('bitting', 30);
                $t->primary(['profile_id', 'codigo']);
                $t->foreign('profile_id')->references('id')->on('keycode_profiles')->onDelete('cascade');
            });

            Schema::table('keycode_valet_codes', function (Blueprint $t): void {
                $t->index(['profile_id', 'bitting'], 'keycode_valet_codes_profile_bitting_index');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('keycode_valet_codes');
    }
};
