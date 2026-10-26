<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class KnowledgeBase extends Model
{
    protected $table = 'knowledge_bases';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $fillable = ['agent_id', 'name', 'elevenlabs_document_id', 'type', 'source_url'];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'agent_id');
    }
}