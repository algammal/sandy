<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Location extends Model
{
    protected $table = 'locations';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['name', 'slug', 'main_address', 'secondary_address', 'country', 'city', 'region', 'postal_code', 'latitude', 'longitude', 'company_id'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}