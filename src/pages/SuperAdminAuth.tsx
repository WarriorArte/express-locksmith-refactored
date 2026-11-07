import { useMemo, useState } from "react";
import { useLocation } from "react-router";
import { Building2, Loader2, Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthBrand, AuthField } from "@/design-system/auth";
import { phpApiRequest, setPhpAuthToken } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";

type SuperAdminLoginResponse = {
  token: string;
  expires_at: string;
  user: {
    id: string;
    email: string | null;
  };
  global_role: "superadmin";
};

function appPath(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\/+/, "")}`;
}

export default function SuperAdminAuth() {
  const [workshopCode, setWorkshopCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  const currentPath = useMemo(() => {
    const clean = location.pathname.replace(/\/+$/, "");
    return clean || "/";
  }, [location.pathname]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const data = await phpApiRequest<SuperAdminLoginResponse>("/superadmin-auth/login", {
        method: "POST",
        body: JSON.stringify({
          login_path: currentPath,
          workshop_code: workshopCode.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      setPhpAuthToken(data.token);
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesion como SuperAdmin",
      });
      window.location.assign(appPath("/superadmin"));
    } catch (error) {
      toast({
        title: "Error de autenticacion",
        description: "Credenciales incorrectas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <AuthBrand icon={Shield} title="SuperAdmin" subtitle="Administración global" />

        <form onSubmit={handleSubmit} className="space-y-3">
          <AuthField
            icon={Building2}
            label="Código SuperAdmin"
            value={workshopCode}
            onChange={(event) => setWorkshopCode(event.target.value.toUpperCase())}
            disabled={isLoading}
            autoCapitalize="characters"
            spellCheck={false}
            required
          />
          <AuthField
            icon={Mail}
            label="Correo"
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            autoComplete="email"
            required
          />
          <AuthField
            icon={Lock}
            label="Contraseña"
            password
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            required
            minLength={8}
          />

          <Button type="submit" disabled={isLoading} className="mt-3 h-14 w-full text-base">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

      </div>
    </div>
  );
}
