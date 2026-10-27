<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $table = 'companies';
    protected $primaryKey = 'id';
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

    public function contactLabels(): HasMany
    {
        return $this->hasMany(ContactLabel::class, 'company_id');
    }

    public function companyNumbers(): HasMany
    {
        return $this->hasMany(CompanyNumber::class, 'company_id');
    }
}