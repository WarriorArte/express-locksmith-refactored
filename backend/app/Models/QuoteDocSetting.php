<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class QuoteDocSetting extends Model
{
    use Uuid;

    protected $table = 'quote_doc_settings';

    protected $fillable = [
        'workshop_id',
        'layout',
        'preset_id',
        'ink',
        'accent',
        'accent_ink',
        'header',
        'header_ink',
        'table_head',
        'table_head_ink',
        'muted',
        'soft',
        'rule',
        'paper',
        'logo_size',
        'notes',
        'payment_account',
        'payment_name',
        'payment_bank',
        'bg_url',
        'bg_opacity',
        'bg_blend',
    ];

    protected $casts = [
        'bg_opacity' => 'float',
        'logo_size' => 'integer',
    ];
}
