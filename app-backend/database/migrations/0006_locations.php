<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id')->index();
            $table->string('name');
            $table->string('slug');
            $table->string('main_address');
            $table->string('secondary_address')->nullable();
            $table->string('country');
            $table->string('city');
            $table->string('region')->nullable();
            $table->string('postal_code');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 10, 8);
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};