<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Service-specific fields
            $table->enum('service_type', ['automotive', 'residential', 'commercial', 'industrial'])
                ->nullable()
                ->after('item_type')
                ->comment('Type of service: automotive, residential, commercial, or industrial');
            
            $table->text('problem_reported')
                ->nullable()
                ->after('description')
                ->comment('Problem reported for service');
            
            $table->text('service_solution')
                ->nullable()
                ->after('problem_reported')
                ->comment('Solution provided for service');
            
            $table->decimal('labor_cost', 10, 2)
                ->nullable()
                ->after('sale_price_max')
                ->comment('Labor cost for service');
            
            $table->decimal('discount', 10, 2)
                ->default(0)
                ->after('labor_cost')
                ->comment('Discount amount for service');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'service_type',
                'problem_reported',
                'service_solution',
                'labor_cost',
                'discount',
            ]);
        });
    }
};
