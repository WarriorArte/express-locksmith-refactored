<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\Customer;
use App\Models\UserRole;
use App\Models\Workshop;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SaleTest extends TestCase
{
    private AppUser $admin;
    private AppUser $employee;
    private Workshop $workshop;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workshop = Workshop::create([
            'id' => (string) Str::uuid(),
            'code' => 'SL01',
            'name' => 'Taller Ventas',
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

        $this->customer = Customer::create([
            'id' => (string) Str::uuid(),
            'workshop_id' => $this->workshop->id,
            'name' => 'Cliente Ventas',
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

    private function makeSale(array $overrides = []): string
    {
        $id = (string) Str::uuid();
        DB::table('sales')->insert(array_merge([
            'id' => $id,
            'workshop_id' => $this->workshop->id,
            'sale_number' => 'VTA-' . rand(1000, 9999),
            'subtotal' => 200.00,
            'discount' => 0.00,
            'total' => 200.00,
            'payment_method' => 'cash',
            'has_warranty' => 0,
            'created_by' => $this->admin->id,
        ], $overrides));
        return $id;
    }

    public function test_listar_ventas_requiere_autenticacion(): void
    {
        $this->getJson("/api/sales?workshop_id={$this->workshop->id}")
            ->assertStatus(401);
    }

    public function test_listar_ventas_paginadas(): void
    {
        $this->makeSale(['sale_number' => 'VTA-001']);
        $this->makeSale(['sale_number' => 'VTA-002']);

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/sales?workshop_id={$this->workshop->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page', 'has_more']]);
    }

    public function test_obtener_venta_por_id(): void
    {
        $id = $this->makeSale(['sale_number' => 'VTA-SHOW']);

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/sales/{$id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['id' => $id, 'sale_number' => 'VTA-SHOW'],
            ]);
    }

    public function test_crear_venta(): void
    {
        $response = $this->withToken($this->adminToken())
            ->postJson('/api/sales', [
                'workshop_id' => $this->workshop->id,
                'sale_number' => 'VTA-NEW',
                'customer_id' => $this->customer->id,
                'subtotal' => 300.00,
                'total' => 300.00,
                'payment_method' => 'cash',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['sale_number' => 'VTA-NEW'],
            ]);

        $this->assertDatabaseHas('sales', ['sale_number' => 'VTA-NEW']);
    }

    public function test_crear_venta_incrementa_total_compras_del_cliente(): void
    {
        $this->withToken($this->adminToken())
            ->postJson('/api/sales', [
                'workshop_id' => $this->workshop->id,
                'sale_number' => 'VTA-CUST',
                'customer_id' => $this->customer->id,
                'total' => 500.00,
                'payment_method' => 'cash',
            ]);

        $this->assertDatabaseHas('customers', [
            'id' => $this->customer->id,
            'total_purchases' => 500.00,
        ]);
    }

    public function test_crear_venta_sin_sale_number_retorna_error(): void
    {
        $this->withToken($this->adminToken())
            ->postJson('/api/sales', [
                'workshop_id' => $this->workshop->id,
                'total' => 300.00,
            ])
            ->assertStatus(400);
    }

    public function test_solo_admin_puede_eliminar_venta(): void
    {
        $id = $this->makeSale(['sale_number' => 'VTA-DEL']);

        $this->withToken($this->employeeToken())
            ->deleteJson("/api/sales/{$id}")
            ->assertStatus(403);

        $this->withToken($this->adminToken())
            ->deleteJson("/api/sales/{$id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('sales', ['id' => $id]);
    }

    public function test_eliminar_venta_decrementa_total_compras_del_cliente(): void
    {
        DB::table('customers')->where('id', $this->customer->id)->update(['total_purchases' => 500.00]);
        $id = $this->makeSale([
            'sale_number' => 'VTA-DEC',
            'customer_id' => $this->customer->id,
            'total' => 300.00,
        ]);

        $this->withToken($this->adminToken())
            ->deleteJson("/api/sales/{$id}")
            ->assertStatus(200);

        $this->assertDatabaseHas('customers', [
            'id' => $this->customer->id,
            'total_purchases' => 200.00,
        ]);
    }

    public function test_venta_no_encontrada_retorna_404(): void
    {
        $this->withToken($this->adminToken())
            ->getJson('/api/sales/' . Str::uuid())
            ->assertStatus(404);
    }
}
