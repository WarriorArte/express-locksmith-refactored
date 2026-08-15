<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('business_settings')) {
            Schema::table('business_settings', function (Blueprint $table): void {
                if (Schema::hasColumn('business_settings', 'storage_endpoint')) {
                    $table->dropColumn('storage_endpoint');
                }
                if (Schema::hasColumn('business_settings', 'storage_secret_key')) {
                    $table->dropColumn('storage_secret_key');
                }
            });
        }

        Schema::dropIfExists('appadmin_settings');
    }

    public function down(): void
    {
        if (Schema::hasTable('business_settings')) {
            Schema::table('business_settings', function (Blueprint $table): void {
                if (!Schema::hasColumn('business_settings', 'storage_endpoint')) {
                    $table->text('storage_endpoint')->nullable();
                }
                if (!Schema::hasColumn('business_settings', 'storage_secret_key')) {
                    $table->text('storage_secret_key')->nullable();
                }
            });
        }

        Schema::create('appadmin_settings', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->text('storage_endpoint')->nullable();
            $table->text('storage_api_key_encrypted')->nullable();
            $table->boolean('singleton_guard')->default(1);
            $table->timestamps(3);
            $table->unique('singleton_guard', 'uq_appadmin_settings_singleton');
        });
    }
};
