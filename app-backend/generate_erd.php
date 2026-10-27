const fs = require('fs');
const dir = 'd:/projects/sandy/app-backend/database/migrations';

const migrations = {
  '0002_users': `<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint \$table) {
            \$table->id();
            \$table->unsignedBigInteger('manager_id')->nullable()->index();
            \$table->unsignedBigInteger('company_id')->nullable()->index();
            \$table->string('first_name');
            \$table->string('last_name');
            \$table->string('email')->unique();
            \$table->timestamp('email_boost_at')->nullable();
            \$table->string('password');
            \$table->enum('type', ['admin', 'standard', 'guest']);
            \$table->boolean('is_active');
            \$table->timestamps();

            \$table->foreign('manager_id')->references('id')->on('users')->onDelete('cascade');
            \$table->foreign('company_id')->references('id')->on('companies</arg_value>com
<p>
<arg_value>of