<?php

namespace App\Models;

use App\Support\Uuid;
use Illuminate\Database\Eloquent\Model;

final class Category extends Model
{
    use Uuid;

    public $timestamps = false;

    protected $fillable = ['workshop_id', 'name', 'color'];
}
