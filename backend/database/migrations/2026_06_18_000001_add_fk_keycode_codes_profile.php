<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('keycode_codes', function (Blueprint $t): void {
            $t->foreign('profile_id')
                ->references('id')
                ->on('keycode_profiles')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('keycode_codes', function (Blueprint $t): void {
            $t->dropForeign(['profile_id']);
        });
    }
};
