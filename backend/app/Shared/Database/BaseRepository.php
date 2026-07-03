<?php

namespace App\Shared\Database;

use App\Shared\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

abstract class BaseRepository
{
    public function __construct(
        protected Model $model,
        protected TenantContext $tenantContext,
    ) {}

    protected function query(): Builder
    {
        return $this->model->newQuery();
    }

    public function all(array $columns = ['*'])
    {
        return $this->query()->get($columns);
    }

    public function find(string $id, array $columns = ['*']): ?Model
    {
        return $this->query()->find($id, $columns);
    }

    public function findOrFail(string $id, array $columns = ['*']): Model
    {
        return $this->query()->findOrFail($id, $columns);
    }

    public function create(array $data): Model
    {
        if (empty($data['tenant_id']) && $this->tenantContext->id()) {
            $data['tenant_id'] = $this->tenantContext->id();
        }

        return $this->model->newQuery()->create($data);
    }

    public function update(string $id, array $data): Model
    {
        $record = $this->findOrFail($id);
        $record->update($data);

        return $record->fresh();
    }

    public function delete(string $id): bool
    {
        return (bool) $this->findOrFail($id)->delete();
    }
}
