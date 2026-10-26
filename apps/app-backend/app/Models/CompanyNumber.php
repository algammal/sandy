<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CompanyNumber extends Model
{
    protected $table = 'company_numbers';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['contact_label_id', 'company_id', 'phone_number', 'is_primary'];

    public function contactLabel(): BelongsTo
    {
        return $this->belongsTo(ContactLabel::class, 'contact_label_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function properties(): BelongsToMany
    {
        return $this->belongsToMany(Property::class, 'company_number_property', 'company_number_id', 'property_id');
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'company_number_project', 'company_number_id', 'project_id');
    }
}