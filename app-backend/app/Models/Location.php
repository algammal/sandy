<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Location extends Model
{
    public $timestamps = true;

    protected $fillable = ['company_id', 'name', 'slug', 'main_address', 'secondary_address', 'country', 'city', 'region', 'postal_code', 'latitude', 'longitude'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'location_id');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'location_id');
    }
}