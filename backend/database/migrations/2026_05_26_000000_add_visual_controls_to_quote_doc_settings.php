<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('quote_doc_settings', function (Blueprint $table): void {
            if (!Schema::hasColumn('quote_doc_settings', 'accent_ink')) {
                $table->string('accent_ink', 20)->default('#1a1f2e')->after('accent');
            }
            if (!Schema::hasColumn('quote_doc_settings', 'header')) {
                $table->string('header', 20)->default('#1a1f2e')->after('accent_ink');
            }
            if (!Schema::hasColumn('quote_doc_settings', 'header_ink')) {
                $table->string('header_ink', 20)->default('#ffffff')->after('header');
            }
            if (!Schema::hasColumn('quote_doc_settings', 'table_head')) {
                $table->string('table_head', 20)->default('#1a1f2e')->after('header_ink');
            }
            if (!Schema::hasColumn('quote_doc_settings', 'table_head_ink')) {
                $table->string('table_head_ink', 20)->default('#ffffff')->after('table_head');
            }
            if (!Schema::hasColumn('quote_doc_settings', 'muted')) {
                $table->string('muted', 20)->default('#7c7c74')->after('table_head_ink');
            }
            if (!Schema::hasColumn('quote_doc_settings', 'soft')) {
                $table->string('soft', 20)->default('#f5f5f3')->after('muted');
            }
            if (!Schema::hasColumn('quote_doc_settings', 'rule')) {
                $table->string('rule', 20)->default('#e6e4dd')->after('soft');
            }
            if (!Schema::hasColumn('quote_doc_settings', 'logo_size')) {
                $table->unsignedSmallInteger('logo_size')->default(110)->after('paper');
            }
        });
    }

    public function down(): void
    {
        Schema::table('quote_doc_settings', function (Blueprint $table): void {
            foreach (['logo_size', 'rule', 'soft', 'muted', 'table_head_ink', 'table_head', 'header_ink', 'header', 'accent_ink'] as $column) {
                if (Schema::hasColumn('quote_doc_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
