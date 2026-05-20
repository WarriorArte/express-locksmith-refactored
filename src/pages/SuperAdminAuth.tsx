import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { m as motion } from "framer-motion";
import { Building2, Eye, EyeOff, Key, Loader2, Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { phpApiRequest, setPhpAuthToken } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import NotFound from "./NotFound";

type SuperAdminConfig = {
  login_path: string;
};

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
  const [config, setConfig] = useState<SuperAdminConfig | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [workshopCode, setWorkshopCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const currentPath = useMemo(() => {
    const clean = location.pathname.replace(/\/+$/, "");
    return clean || "/";
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      try {
        const data = await phpApiRequest<SuperAdminConfig>("/superadmin-auth/config", {
          method: "GET",
        });

        if (!isMounted) return;
        setConfig(data);
        setNotFound(data.login_path !== currentPath);
      } catch (error) {
        console.error("[SuperAdminAuth] Error cargando config:", error);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setIsConfigLoading(false);
      }
    };

    void loadConfig();

    return () => {
      isMounted = false;
    };
  }, [currentPath]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const data = await phpApiRequest<SuperAdminLoginResponse>("/superadmin-auth/login", {
        method: "POST",
        body: JSON.stringify({
          login_path: config?.login_path ?? currentPath,
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
        description: error instanceof Error ? error.message : "Credenciales incorrectas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-5 shadow-[0_0_32px_hsl(var(--primary)/0.40)]">
            <Shield className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-[34px] font-extrabold text-foreground leading-[1.05] tracking-tight">
            SuperAdmin
            <br />
            <span className="text-primary">Access</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Entrada aislada de administracion global
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Codigo SuperAdmin"
              value={workshopCode}
              onChange={(event) => setWorkshopCode(event.target.value.toUpperCase())}
              disabled={isLoading}
              className="w-full h-[52px] pl-11 pr-4 rounded-2xl bg-card border-[1.5px] border-border text-foreground placeholder:text-muted-foreground/60 text-[15px] focus:border-primary focus:outline-none transition-colors uppercase"
              required
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60" />
            <input
              type="email"
              placeholder="Correo SuperAdmin"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
              className="w-full h-[52px] pl-11 pr-4 rounded-2xl bg-card border-[1.5px] border-border text-foreground placeholder:text-muted-foreground/60 text-[15px] focus:border-primary focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contrasena SuperAdmin"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              className="w-full h-[52px] pl-11 pr-11 rounded-2xl bg-card border-[1.5px] border-border text-foreground placeholder:text-muted-foreground/60 text-[15px] focus:border-primary focus:outline-none transition-colors"
              required
              minLength={8}
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

          <Button type="submit" disabled={isLoading} className="w-full h-[52px] mt-2 rounded-2xl font-bold gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Entrar como SuperAdmin
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
