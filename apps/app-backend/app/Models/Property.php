<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Property extends Model
{
    protected $table = 'properties';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['name', 'slug', 'description', 'company_id', 'property_type_id', 'location_id', 'project_id', 'additional_info'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function propertyType(): BelongsTo
    {
        return $this->belongsTo(PropertyType::class, 'property_type_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'property_amenity', 'property_id', 'amenity_id');
    }

    public function companyNumbers(): BelongsToMany
    {
        return $this->belongsToMany(CompanyNumber::class, 'company_number_property', 'property_id', 'company_number_id');
    }
}