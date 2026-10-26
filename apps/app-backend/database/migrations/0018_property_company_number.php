<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('company_number_property', function (Blueprint $table) {
            $table->foreignId('company_number_id')->constrained('company_numbers')->onDelete('cascade');
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->primary(['company_number_id', 'property_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_number_property');
    }
};
