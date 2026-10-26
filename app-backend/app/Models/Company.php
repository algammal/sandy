<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Company extends Model
{
    public $timestamps = true;

    protected $fillable = ['name', 'industry', 'description', 'contact_email', 'contact_phone', 'website', 'is_active'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'company_id');
    }

    public function agents(): HasMany
    {
        return $this->hasMany(Agent::class, 'company_id');
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class, 'company_id');
    }

    public function bussinessWorkingHours(): HasMany
    {
        return $this->hasMany(BussinessWorkingHour::class, 'company_id');
    }

    public function contactLabels(): HasMany
    {
        return $this->hasMany(ContactLabel::class, 'company_id');
    }

    public function companyNumbers(): HasMany
    {
        return $this->hasMany(CompanyNumber::class, 'company_id');
    }

    public function ammenities(): HasMany
    {
        return $this->hasMany(Amenity::class, 'company_id');
    }
}