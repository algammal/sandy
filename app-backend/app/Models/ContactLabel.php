<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactLabel extends Model
{
    public $timestamps = true;

    protected $fillable = ['company_id', 'label', 'display_name'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function companyNumbers(): HasMany
    {
        return $this->hasMany(CompanyNumber::class, 'label_id');
    }
}