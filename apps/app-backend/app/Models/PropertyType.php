<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PropertyType extends Model
{
    protected $table = 'property_types';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['name', 'slug'];
}