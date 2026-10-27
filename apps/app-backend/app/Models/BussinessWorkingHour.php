<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BussinessWorkingHour extends Model
{
    protected $table = 'bussiness_working_hours';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['from', 'to', 'is_closed', 'day', 'company_id'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}