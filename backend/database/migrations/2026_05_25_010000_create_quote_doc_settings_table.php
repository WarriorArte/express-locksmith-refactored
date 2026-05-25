<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('quote_doc_settings')) {
            return;
        }

        Schema::create('quote_doc_settings', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('workshop_id', 36)->unique();
            $table->string('layout', 30)->default('bold');
            $table->string('preset_id', 60)->default('navy-yellow');
            $table->string('ink', 20)->default('#1a1f2e');
            $table->string('accent', 20)->default('#f4c430');
            $table->string('paper', 20)->default('#ffffff');
            $table->text('notes')->nullable();
            $table->string('payment_account')->nullable();
            $table->string('payment_name')->nullable();
            $table->string('payment_bank')->nullable();
            $table->longText('bg_url')->nullable();
            $table->decimal('bg_opacity', 4, 2)->default(0.08);
            $table->string('bg_blend', 30)->default('multiply');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_doc_settings');
    }
};
