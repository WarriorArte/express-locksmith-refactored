<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('about:migration', function (): void {
    $this->info('Cerrajeria Express Laravel migration scaffold is installed.');
});
