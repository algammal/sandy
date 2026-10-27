<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    public $timestamps = true;

    protected $fillable = ['name', 'file_path', 'morph_type', 'morph_id'];

    // Polymorphic relationship: this media item belongs to any model via morph_type and morph_id
    // The owning model should define: return $this->morphMany(Media::class, 'morph_type', 'morph_id');
}