<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BussinessWorkingHour extends Model
{
    public $timestamps = true;

    protected $fillable = ['company_id', 'day', 'from', 'to', 'is_closed'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}