<?php

namespace App\Support;

use Illuminate\Support\Str;

trait Uuid
{
    protected static function bootUuid(): void
    {
        static::creating(function ($model): void {
            if (!$model->getKey()) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function getIncrementing(): bool
    {
        return false;
    }

    public function getKeyType(): string
    {
        return 'string';
    }
}
