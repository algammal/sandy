<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bussiness_working_hours', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('company_id')->constrained('companies')
                ->onUpdate('CASCADE')
                ->onDelete('CASCADE');

            $table->string('day');

            $table->time('from');

            $table->time('to');

            $table->boolean('is_closed')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bussiness_working_hours');
    }
};