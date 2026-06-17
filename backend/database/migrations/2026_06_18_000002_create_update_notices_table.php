<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('update_notices')) {
            Schema::create('update_notices', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->unsignedTinyInteger('singleton_guard')->default(1)->unique();
                $table->string('title', 160);
                $table->text('body')->nullable();
                $table->boolean('is_active')->default(false)->index();
                $table->boolean('force_refresh')->default(false);
                $table->string('notice_key', 80)->index();
                $table->uuid('created_by')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('update_notices');
    }
};
