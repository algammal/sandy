<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactLabel extends Model
{
    protected $table = 'contact_labels';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['label', 'display_name', 'company_id'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}