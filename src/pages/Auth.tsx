import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { m as motion } from "framer-motion";
import { Key, Mail, Lock, Eye, EyeOff, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [showPassword, setShowPassword] = useState(false);
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

      const isSuperAdmin = globalRole === "superadmin";
      const activeWorkshops = (workshops || []).filter((w) => !!w.is_active);

      // 3. Buscar el taller por código; si es superadmin y no coincide, usar el primero disponible
      if (isSuperAdmin) {
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesion como SuperAdmin",
        });

        navigate("/superadmin", { replace: true });
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo + Title */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-5 shadow-[0_0_32px_hsl(var(--primary)/0.40)]">
            <Key className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-[34px] font-extrabold text-foreground leading-[1.05] tracking-tight">
            Cerrajería
            <br />
            <span className="text-primary">Express</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Gestión inteligente de tu taller
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Código del taller"
                value={workshopCode}
                onChange={(e) => setWorkshopCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                autoComplete="off"
                className="w-full h-[52px] pl-11 pr-4 rounded-2xl bg-card border-[1.5px] border-border text-foreground placeholder:text-muted-foreground/60 text-[15px] focus:border-primary focus:outline-none transition-colors uppercase"
              />
            </div>
            {errors.workshopCode && (
              <p className="text-xs text-destructive mt-1.5 ml-1">{errors.workshopCode}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                className="w-full h-[52px] pl-11 pr-4 rounded-2xl bg-card border-[1.5px] border-border text-foreground placeholder:text-muted-foreground/60 text-[15px] focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive mt-1.5 ml-1">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full h-[52px] pl-11 pr-11 rounded-2xl bg-card border-[1.5px] border-border text-foreground placeholder:text-muted-foreground/60 text-[15px] focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive mt-1.5 ml-1">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[52px] mt-2 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] shadow-[0_0_20px_hsl(var(--primary)/0.30)] hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Contacta al administrador para obtener acceso
        </p>
      </motion.div>
    </div>
  );
}
