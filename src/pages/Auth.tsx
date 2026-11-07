import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Key, Mail, Lock, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthBrand, AuthField } from "@/design-system/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { phpApiRequest } from "@/lib/phpApi";
import { z } from "zod";

// ============================================================
// PÁGINA DE LOGIN - VERSIÓN 2.0 (RECONSTRUIDA)
// ============================================================
// Flujo simplificado:
// 1. Login contra API PHP (Bearer token)
// 2. Validar que el codigo de taller exista en talleres permitidos
// 3. Cambiar taller activo en perfil
// 4. Redirigir a /
// ============================================================

const loginSchema = z.object({
  workshopCode: z.string().min(1, "El código de cerrajería es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function Auth() {
  const [workshopCode, setWorkshopCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirigir si ya está autenticado (solo cuando NO hay un submit en curso)
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      // 1. Normalizar inputs
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedCode = workshopCode.trim().toUpperCase();

      // 2. Validar schema
      const validation = loginSchema.safeParse({
        workshopCode: normalizedCode,
        email: normalizedEmail,
        password,
      });

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setIsLoading(false);
        return;
      }

      const { error: signInError, workshops, globalRole } = await signIn(normalizedEmail, password);

      if (signInError) {
        toast({
          title: "Error de autenticación",
          description: "Email o contraseña incorrectos",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const activeWorkshops = (workshops || []).filter((w) => !!w.is_active);

      // 3. Bloquear SuperAdmin en el login normal; debe usar la entrada aislada.
      if (globalRole === "superadmin") {
        await signOut();
        toast({
          title: "Acceso denegado",
          description: "El SuperAdmin debe iniciar sesion desde la ruta SuperAdmin",
          variant: "destructive",
        });
        return;
      }

      const selectedWorkshop = activeWorkshops.find((w) => w.code?.toUpperCase() === normalizedCode);

      if (!selectedWorkshop) {
        await signOut();
        toast({
          title: "Acceso denegado",
          description: "El código de cerrajería no existe o no tienes acceso",
          variant: "destructive",
        });
        return;
      }

      // 4. Actualizar taller activo en perfil
      await phpApiRequest(`/workshops.php?action=switch&id=${encodeURIComponent(selectedWorkshop.id)}`, {
        method: "PUT",
      });

      // 5. Éxito
      toast({
        title: "Bienvenido",
        description: `Has iniciado sesión en ${selectedWorkshop.name}`,
      });

      navigate("/", { replace: true });
    } catch (err) {
      console.error("[Auth] Error inesperado:", err);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <AuthBrand icon={Key} title="Cerrajería Express" />

        <form onSubmit={handleSubmit} className="space-y-3">
          <AuthField
            icon={Building2}
            label="Código del taller"
            value={workshopCode}
            onChange={(e) => setWorkshopCode(e.target.value.toUpperCase())}
            disabled={isLoading}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            error={errors.workshopCode}
          />
          <AuthField
            icon={Mail}
            label="Correo electrónico"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
            error={errors.email}
          />
          <AuthField
            icon={Lock}
            label="Contraseña"
            password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            error={errors.password}
          />

          <Button type="submit" disabled={isLoading} className="mt-3 h-14 w-full text-base">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Iniciando…
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Contacta al administrador para obtener acceso
        </p>
      </div>
    </div>
  );
}
