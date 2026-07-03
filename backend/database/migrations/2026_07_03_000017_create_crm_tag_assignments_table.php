<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_tag_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->uuid('tag_id');

            $table->index('tenant_id');
            $table->index('customer_id');
            $table->unique(['tenant_id', 'customer_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_tag_assignments');
    }
};
