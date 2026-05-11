<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\Category;
use App\Models\Product;
use App\Models\UserRole;
use App\Models\Workshop;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductTest extends TestCase
{
    private AppUser $admin;
    private AppUser $employee;
    private Workshop $workshop;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workshop = Workshop::create([
            'id' => (string) Str::uuid(),
            'code' => 'PROD01',
            'name' => 'Taller Productos',
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

        $this->category = Category::create([
            'id' => (string) Str::uuid(),
            'workshop_id' => $this->workshop->id,
            'name' => 'Llaves',
            'color' => '#FF0000',
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

    private function makeProduct(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'id' => (string) Str::uuid(),
            'workshop_id' => $this->workshop->id,
            'name' => 'Llave Honda',
            'stock_store' => 5,
            'sale_price_min' => 100,
            'sale_price_max' => 150,
            'is_active' => true,
        ], $overrides));
    }

    public function test_listar_productos_requiere_autenticacion(): void
    {
        $this->getJson("/api/products?workshop_id={$this->workshop->id}")
            ->assertStatus(401);
    }

    public function test_listar_productos_del_taller(): void
    {
        $this->makeProduct(['name' => 'Llave A']);
        $this->makeProduct(['name' => 'Llave B']);

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/products?workshop_id={$this->workshop->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page', 'has_more']]);
    }

    public function test_paginacion_productos(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->makeProduct(['name' => "Llave {$i}"]);
        }

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/products?workshop_id={$this->workshop->id}&per_page=2&page=1");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.has_more', true);
    }

    public function test_listar_productos_sin_workshop_id_retorna_400(): void
    {
        $this->withToken($this->adminToken())
            ->getJson('/api/products')
            ->assertStatus(400);
    }

    public function test_crear_producto_como_admin(): void
    {
        $response = $this->withToken($this->adminToken())
            ->postJson('/api/products', [
                'workshop_id' => $this->workshop->id,
                'name' => 'Cerradura Kwikset',
                'category_id' => $this->category->id,
                'stock_store' => 10,
                'sale_price_min' => 200,
                'sale_price_max' => 300,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => ['name' => 'Cerradura Kwikset'],
            ]);

        $this->assertDatabaseHas('products', ['name' => 'Cerradura Kwikset']);
    }

    public function test_crear_producto_sin_nombre_retorna_422(): void
    {
        $this->withToken($this->adminToken())
            ->postJson('/api/products', [
                'workshop_id' => $this->workshop->id,
                'stock_store' => 10,
            ])
            ->assertStatus(422);
    }

    public function test_empleado_no_puede_crear_producto(): void
    {
        $this->withToken($this->employeeToken())
            ->postJson('/api/products', [
                'workshop_id' => $this->workshop->id,
                'name' => 'Producto No Autorizado',
            ])
            ->assertStatus(403);
    }

    public function test_actualizar_producto_como_admin(): void
    {
        $product = $this->makeProduct();

        $response = $this->withToken($this->adminToken())
            ->putJson("/api/products/{$product->id}", [
                'name' => 'Llave Actualizada',
                'stock_store' => 20,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['name' => 'Llave Actualizada', 'stock_store' => 20],
            ]);
    }

    public function test_eliminar_producto_lo_desactiva(): void
    {
        $product = $this->makeProduct();

        $this->withToken($this->adminToken())
            ->deleteJson("/api/products/{$product->id}")
            ->assertStatus(200);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => 0,
        ]);
    }

    public function test_obtener_producto_por_id(): void
    {
        $product = $this->makeProduct();

        $response = $this->withToken($this->adminToken())
            ->getJson("/api/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['id' => $product->id],
            ]);
    }

    public function test_producto_no_encontrado_retorna_404(): void
    {
        $this->withToken($this->adminToken())
            ->getJson('/api/products/' . Str::uuid())
            ->assertStatus(404);
    }

    public function test_no_puede_acceder_a_productos_de_otro_taller(): void
    {
        $otherWorkshop = Workshop::create([
            'id' => (string) Str::uuid(),
            'code' => 'OTHER',
            'name' => 'Otro Taller',
        ]);

        $product = Product::create([
            'id' => (string) Str::uuid(),
            'workshop_id' => $otherWorkshop->id,
            'name' => 'Producto Ajeno',
            'is_active' => true,
        ]);

        $this->withToken($this->adminToken())
            ->getJson("/api/products/{$product->id}")
            ->assertStatus(403);
    }
}
