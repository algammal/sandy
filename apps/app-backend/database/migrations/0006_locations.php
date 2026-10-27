<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('company_id')->constrained('companies')
                ->onUpdate('CASCADE')
                ->onDelete('CASCADE');

            $table->string('name');
            $table->string('slug');
            $table->string('main_address');
            $table->string('secondary_address');
            $table->string('country');
            $table->string('city');
            $table->string('region');
            $table->string('postal_code');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};