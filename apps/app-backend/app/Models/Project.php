<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    protected $table = 'projects';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['name', 'slug', 'description', 'company_id', 'location_id'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'project_id');
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'project_amenity', 'project_id', 'amenity_id');
    }

    public function companyNumbers(): BelongsToMany
    {
        return $this->belongsToMany(CompanyNumber::class, 'company_number_project', 'project_id', 'company_number_id');
    }
}