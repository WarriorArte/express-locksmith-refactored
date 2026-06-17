<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\JsonResourceController;
use App\Models\ImmoCatalogItem;

final class ImmoCatalogController extends JsonResourceController
{
    protected function modelClass(): string { return ImmoCatalogItem::class; }
}
