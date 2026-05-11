<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\Customer;
use App\Models\UserRole;
use App\Models\Workshop;
use Illuminate\Support\Str;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    private AppUser $admin;
    private AppUser $employee;
    private Workshop $workshop;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workshop = Workshop::create([
            'id' => (string) Str::uuid(),
            'code' => 'CUST01',
            'name' => 'Taller Clientes',
        ]);

        $this->admin = AppUser::create([
            'id' => (string) Str::uuid(),
            'email' => 'admin@example.com',
            'password_hash' => password_hash('password', PASSWORD_BCRYPT),
            'is_active' => true,
        ]);

        UserRole::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->admin->id,
            'workshop_id' => $this->workshop->id,
            'role' => 'admin',
        ]);

        $this->employee = AppUser::create([
            'id' => (string) Str::uuid(),
            'email' => 'employee@example.com',
            'password_hash' => password_hash('password', PASSWORD_BCRYPT),
            'is_active' => true,
        ]);

        UserRole::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->employee->id,
            'workshop_id' => $this->workshop->id,
            'role' => 'employee',
        ]);
    }

    private function adminToken(): string
    {
        return $this->admin->createToken('api')->plainTextToken;
    }

    private function employeeToken(): string
    {
        return $this->employee->createToken('api')->plainTextToken;
    }

    private function makeCustomer(array $overrides = []): Customer
    {
        return Customer::create(array_merge([
            'id' => (string) Str::uuid(),
            'workshop_id' => $this->workshop->id,
            'name' => 'Juan Pérez',
            'customer_type' => 'person',
        ], $overrides));
    }

    public function test_listar_clientes_requiere_autenticacion(): void
    {
        $this->getJson("/api/customers?workshop_id={$this->workshop->id}")
            ->assertStatus(401);
    }

    public function test_listar_clientes_del_taller(): void
    {
        $this->makeCustomer(['name' => 'Cliente A']);
        $this->makeCustomer(['name' => 'Cliente B']);

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/customers?workshop_id={$this->workshop->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page', 'has_more']]);
    }

    public function test_busqueda_clientes(): void
    {
        $this->makeCustomer(['name' => 'Juan Pérez', 'phone' => '555-1234']);
        $this->makeCustomer(['name' => 'María López', 'phone' => '555-5678']);

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/customers?workshop_id={$this->workshop->id}&search=juan");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Juan Pérez');
    }

    public function test_paginacion_clientes(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->makeCustomer(['name' => "Cliente {$i}"]);
        }

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/customers?workshop_id={$this->workshop->id}&per_page=2&page=1");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.last_page', 3);
    }

    public function test_crear_cliente_como_admin(): void
    {
        $response = $this->withToken($this->adminToken())
            ->postJson('/api/customers', [
                'workshop_id' => $this->workshop->id,
                'name' => 'María González',
                'phone' => '555-1234',
                'customer_type' => 'person',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => ['name' => 'María González'],
            ]);

        $this->assertDatabaseHas('customers', ['name' => 'María González']);
    }

    public function test_empleado_puede_crear_cliente(): void
    {
        // Empleados también pueden crear clientes (solo admin puede eliminar)
        $this->withToken($this->employeeToken())
            ->postJson('/api/customers', [
                'workshop_id' => $this->workshop->id,
                'name' => 'Cliente de Empleado',
            ])
            ->assertStatus(201);
    }

    public function test_crear_cliente_sin_nombre_retorna_422(): void
    {
        $this->withToken($this->adminToken())
            ->postJson('/api/customers', [
                'workshop_id' => $this->workshop->id,
                'phone' => '555-9999',
            ])
            ->assertStatus(422);
    }

    public function test_tipo_cliente_invalido_retorna_422(): void
    {
        $this->withToken($this->adminToken())
            ->postJson('/api/customers', [
                'workshop_id' => $this->workshop->id,
                'name' => 'Test',
                'customer_type' => 'alien',
            ])
            ->assertStatus(422);
    }

    public function test_actualizar_cliente(): void
    {
        $customer = $this->makeCustomer();

        $response = $this->withToken($this->adminToken())
            ->putJson("/api/customers/{$customer->id}", [
                'name' => 'Juan Pérez Actualizado',
                'phone' => '555-0000',
                'is_vip' => true,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['name' => 'Juan Pérez Actualizado'],
            ]);
    }

    public function test_solo_admin_puede_eliminar_cliente(): void
    {
        $customer = $this->makeCustomer();

        // Empleado no puede eliminar
        $this->withToken($this->employeeToken())
            ->deleteJson("/api/customers/{$customer->id}")
            ->assertStatus(403);

        // Admin sí puede
        $this->withToken($this->adminToken())
            ->deleteJson("/api/customers/{$customer->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    public function test_cliente_no_encontrado_retorna_404(): void
    {
        $this->withToken($this->adminToken())
            ->getJson('/api/customers/' . Str::uuid())
            ->assertStatus(404);
    }

    public function test_no_puede_acceder_clientes_de_otro_taller(): void
    {
        $otherWorkshop = Workshop::create([
            'id' => (string) Str::uuid(),
            'code' => 'OTHER2',
            'name' => 'Otro Taller',
        ]);

        $customer = Customer::create([
            'id' => (string) Str::uuid(),
            'workshop_id' => $otherWorkshop->id,
            'name' => 'Cliente Ajeno',
        ]);

        $this->withToken($this->adminToken())
            ->getJson("/api/customers/{$customer->id}")
            ->assertStatus(403);
    }
}
