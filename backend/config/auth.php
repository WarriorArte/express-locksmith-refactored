<?php

return [
    'defaults' => [
        'guard' => 'api',
        'passwords' => 'app_users',
    ],

    'guards' => [
        'api' => [
            'driver' => 'sanctum',
            'provider' => 'app_users',
        ],
    ],

    'providers' => [
        'app_users' => [
            'driver' => 'eloquent',
            'model' => App\Models\AppUser::class,
        ],
    ],

    'passwords' => [
        'app_users' => [
            'provider' => 'app_users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],
];
