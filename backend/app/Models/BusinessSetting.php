<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class BusinessSetting extends Model
{
    use Uuid;

    protected $table = 'business_settings';

    protected $fillable = [
        'workshop_id',
        'name',
        'phone',
        'phone_country_code',
        'country_code',
        'address',
        'email',
        'website',
        'logo_url',
        'facebook',
        'instagram',
        'printer_size',
        'currency_symbol',
        'auto_cut',
        'ticket_show_logo',
        'ticket_paper_size',
        'ticket_footer_sale',
        'ticket_footer_service',
        'ticket_footer_warranty',
        'storage_endpoint',
        'storage_secret_key',
    ];

    protected $casts = [
        'auto_cut' => 'boolean',
        'ticket_show_logo' => 'boolean',
    ];
}
