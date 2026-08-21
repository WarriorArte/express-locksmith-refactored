<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Título/descripción opcional por archivo subido (galería de imágenes),
        // para poder buscarlos por algo más útil que el nombre generado al azar.
        if (!Schema::hasTable('upload_file_meta')) {
            Schema::create('upload_file_meta', function (Blueprint $t): void {
                $t->string('workshop_code', 100);
                $t->string('folder', 100);
                $t->string('filename', 255);
                $t->string('title', 255)->nullable();
                $t->text('description')->nullable();
                $t->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
                $t->primary(['workshop_code', 'folder', 'filename']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('upload_file_meta');
    }
};
