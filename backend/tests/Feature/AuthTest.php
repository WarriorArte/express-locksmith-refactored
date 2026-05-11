<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\GlobalUserRole;
use App\Models\Profile;
use App\Models\Workshop;
use App\Models\UserRole;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthTest extends TestCase
{
    private AppUser $user;
    private Workshop $workshop;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workshop = Workshop::create([
            'id' => (string) Str::uuid(),
            'code' => 'TEST01',
            'name' => 'Taller Test',
        ]);

        $this->user = AppUser::create([
            'id' => (string) Str::uuid(),
            'email' => 'test@example.com',
            'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
            'is_active' => true,
        ]);

        Profile::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->user->id,
            'full_name' => 'Usuario Test',
        ]);

        UserRole::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->user->id,
            'workshop_id' => $this->workshop->id,
            'role' => 'admin',
        ]);
    }

    public function test_login_con_credenciales_correctas(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'token',
                    'expires_at',
                    'user' => ['id', 'email'],
                    'global_role',
                    'workshops',
                ],
            ])
            ->assertJson(['success' => true]);
    }

    public function test_login_con_credenciales_incorrectas(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    public function test_login_sin_email_retorna_422(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    public function test_login_sin_password_retorna_422(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_email_invalido_retorna_422(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'not-an-email',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_me_con_token_valido(): void
    {
        $token = $this->user->createToken('api');

        $response = $this->withToken($token->plainTextToken)
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['authenticated' => true],
            ]);
    }

    public function test_me_sin_token_retorna_401(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    public function test_logout_invalida_token(): void
    {
        $token = $this->user->createToken('api');

        $this->withToken($token->plainTextToken)
            ->postJson('/api/auth/logout')
            ->assertStatus(200);

        // El token ya no debería funcionar
        $this->withToken($token->plainTextToken)
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_usuario_inactivo_no_puede_login(): void
    {
        $this->user->update(['is_active' => false]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401);
    }

    public function test_rate_limit_en_login(): void
    {
        // Hacer 5 intentos fallidos
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrong',
            ]);
        }

        // El 6to debe ser bloqueado por rate limiting
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(429);
    }

    public function test_cambio_de_password(): void
    {
        $token = $this->user->createToken('api');

        $response = $this->withToken($token->plainTextToken)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'password123',
                'new_password' => 'newpassword456',
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verificar que el login con nueva contraseña funciona
        $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'newpassword456',
        ])->assertStatus(200);
    }

    public function test_cambio_de_password_con_password_incorrecto(): void
    {
        $token = $this->user->createToken('api');

        $response = $this->withToken($token->plainTextToken)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'wrong_password',
                'new_password' => 'newpassword456',
            ]);

        $response->assertStatus(401);
    }
}
