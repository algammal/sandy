<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    public $timestamps = true;

    protected $fillable = ['company_id', 'type_id', 'location_id', 'name', 'slug', 'project_id', 'description', 'additional_info', 'is_active'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(PropertyType::class, 'type_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    // Removed: properties can have many projects via location - each project has its own location_id
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'location_id');
    }
}