<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('company_numbers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id')->index();
            $table->unsignedBigInteger('label_id')->nullable()->index();
            $table->string('display_name');
            $table->boolean('is_primary');
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->foreign('label_id')->references('id')->on('contact_labels')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_numbers');
    }
};