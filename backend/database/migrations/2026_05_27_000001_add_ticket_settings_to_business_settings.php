<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table): void {
            if (!Schema::hasColumn('business_settings', 'ticket_show_logo')) {
                $table->tinyInteger('ticket_show_logo')->default(1)->after('auto_cut');
            }
            if (!Schema::hasColumn('business_settings', 'ticket_paper_size')) {
                $table->string('ticket_paper_size', 10)->default('58mm')->after('ticket_show_logo');
            }
            if (!Schema::hasColumn('business_settings', 'ticket_footer_sale')) {
                $table->text('ticket_footer_sale')->nullable()->after('ticket_paper_size');
            }
            if (!Schema::hasColumn('business_settings', 'ticket_footer_service')) {
                $table->text('ticket_footer_service')->nullable()->after('ticket_footer_sale');
            }
            if (!Schema::hasColumn('business_settings', 'ticket_footer_warranty')) {
                $table->text('ticket_footer_warranty')->nullable()->after('ticket_footer_service');
            }
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'ticket_show_logo',
                'ticket_paper_size',
                'ticket_footer_sale',
                'ticket_footer_service',
                'ticket_footer_warranty',
            ]);
        });
    }
};
