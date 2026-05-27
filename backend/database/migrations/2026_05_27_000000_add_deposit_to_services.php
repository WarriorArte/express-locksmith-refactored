<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            if (!Schema::hasColumn('services', 'deposit')) {
                $table->decimal('deposit', 10, 2)->default(0)->after('discount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            if (Schema::hasColumn('services', 'deposit')) {
                $table->dropColumn('deposit');
            }
        });
    }
};
