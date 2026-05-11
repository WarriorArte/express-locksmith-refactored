<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\Customer;
use App\Models\UserRole;
use App\Models\Workshop;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class QuoteTest extends TestCase
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
            'code' => 'QT01',
            'name' => 'Taller Cotizaciones',
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
            'name' => 'Cliente Test',
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

    private function makeQuote(array $overrides = []): string
    {
        $id = (string) Str::uuid();
        DB::table('quotes')->insert(array_merge([
            'id' => $id,
            'workshop_id' => $this->workshop->id,
            'quote_number' => 'COT-' . rand(1000, 9999),
            'status' => 'pending',
            'subtotal' => 100.00,
            'discount' => 0.00,
            'total' => 100.00,
            'created_by' => $this->admin->id,
        ], $overrides));
        return $id;
    }

    public function test_listar_cotizaciones_requiere_autenticacion(): void
    {
        $this->getJson("/api/quotes?workshop_id={$this->workshop->id}")
            ->assertStatus(401);
    }

    public function test_listar_cotizaciones_paginadas(): void
    {
        $this->makeQuote(['quote_number' => 'COT-001']);
        $this->makeQuote(['quote_number' => 'COT-002']);

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/quotes?workshop_id={$this->workshop->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page', 'has_more']]);
    }

    public function test_obtener_cotizacion_por_id(): void
    {
        $id = $this->makeQuote(['quote_number' => 'COT-SHOW']);

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/quotes/{$id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['id' => $id, 'quote_number' => 'COT-SHOW'],
            ]);
    }

    public function test_crear_cotizacion(): void
    {
        $response = $this->withToken($this->adminToken())
            ->postJson('/api/quotes', [
                'workshop_id' => $this->workshop->id,
                'quote_number' => 'COT-NEW',
                'customer_id' => $this->customer->id,
                'description' => 'Instalación de cerradura',
                'subtotal' => 500.00,
                'total' => 500.00,
                'status' => 'pending',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['quote_number' => 'COT-NEW'],
            ]);

        $this->assertDatabaseHas('quotes', ['quote_number' => 'COT-NEW']);
    }

    public function test_crear_cotizacion_sin_quote_number_retorna_error(): void
    {
        $response = $this->withToken($this->adminToken())
            ->postJson('/api/quotes', [
                'workshop_id' => $this->workshop->id,
                'total' => 500.00,
            ]);

        $response->assertStatus(400);
    }

    public function test_actualizar_cotizacion(): void
    {
        $id = $this->makeQuote(['quote_number' => 'COT-UPD']);

        $response = $this->withToken($this->adminToken())
            ->putJson("/api/quotes/{$id}", [
                'status' => 'accepted',
                'total' => 600.00,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['status' => 'accepted'],
            ]);
    }

    public function test_solo_admin_puede_eliminar_cotizacion(): void
    {
        $id = $this->makeQuote(['quote_number' => 'COT-DEL']);

        $this->withToken($this->employeeToken())
            ->deleteJson("/api/quotes/{$id}")
            ->assertStatus(403);

        $this->withToken($this->adminToken())
            ->deleteJson("/api/quotes/{$id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('quotes', ['id' => $id]);
    }

    public function test_filtrar_cotizaciones_por_status(): void
    {
        $this->makeQuote(['quote_number' => 'COT-P1', 'status' => 'pending']);
        $this->makeQuote(['quote_number' => 'COT-A1', 'status' => 'accepted']);

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/quotes?workshop_id={$this->workshop->id}&status=pending");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_cotizacion_no_encontrada_retorna_404(): void
    {
        $this->withToken($this->adminToken())
            ->getJson('/api/quotes/' . Str::uuid())
            ->assertStatus(404);
    }
}
