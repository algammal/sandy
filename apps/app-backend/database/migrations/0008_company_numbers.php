<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('company_numbers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('contact_label_id')->constrained('contact_labels')
                ->onUpdate('CASCADE')
                ->onDelete('CASCADE');

            $table->foreignId('company_id')->constrained('companies')
                ->onUpdate('CASCADE')
                ->onDelete('CASCADE');
            
            $table->string('phone_number');

            $table->boolean('is_primary');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_numbers');
    }
};