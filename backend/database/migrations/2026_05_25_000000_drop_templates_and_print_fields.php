<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('workshop_template_selections');
        Schema::dropIfExists('templates');

        if (Schema::hasTable('business_settings')) {
            foreach (['whatsapp', 'printer_model', 'print_logo'] as $col) {
                if (Schema::hasColumn('business_settings', $col)) {
                    Schema::table('business_settings', function ($table) use ($col) {
                        $table->dropColumn($col);
                    });
                }
            }
        }
    }

    public function down(): void
    {
        // Irreversible cleanup of legacy printing/template features.
    }
};
