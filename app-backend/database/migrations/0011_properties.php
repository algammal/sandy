<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('type_id')->nullable()->index();
            $table->unsignedBigInteger('company_id')->index();
            $table->string('name');
            $table->string('slug');
            $table->string('project_id');
            $table->text('description');
            $table->unsignedBigInteger('location_id')->nullable()->index();
            $table->text('additional_info')->nullable();
            $table->boolean('is_active');
            $table->timestamps();

            $table->foreign('type_id')->references('id')->on('property_types')->onDelete('set null');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->foreign('location_id')->references('id')->on('locations')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};