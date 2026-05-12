<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'item_type')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->string('item_type', 20)->default('product')->after('workshop_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'item_type')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->dropColumn('item_type');
            });
        }
    }
};
