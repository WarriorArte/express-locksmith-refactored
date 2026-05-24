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
        'whatsapp',
        'printer_size',
        'printer_model',
        'currency_symbol',
        'print_logo',
        'auto_cut',
        'storage_endpoint',
        'storage_secret_key',
    ];

    protected $casts = [
        'print_logo' => 'boolean',
        'auto_cut' => 'boolean',
    ];
}
