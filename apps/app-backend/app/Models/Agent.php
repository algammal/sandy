<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agent extends Model
{
    protected $table = 'agents';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['name', 'elevenlabs_agent_id', 'company_id', 'config', 'meta_data', 'is_active'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function knowledgeBases(): HasMany
    {
        return $this->hasMany(KnowledgeBase::class, 'agent_id');
    }
}