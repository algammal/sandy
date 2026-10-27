<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyNumber extends Model
{
    public $timestamps = true;

    protected $fillable = ['company_id', 'label_id', 'display_name', 'is_primary'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function contactLabel(): BelongsTo
    {
        return $this->belongsTo(ContactLabel::class, 'label_id');
    }
}