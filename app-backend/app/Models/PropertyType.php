<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PropertyType extends Model
{
    public $timestamps = true;

    protected $fillable = ['name', 'slug'];

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'type_id');
    }
}