import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { phpApiRequest } from "@/lib/phpApi";
import type { SuperAdminAccessSettings } from "../types";

export function SuperAdminAccessTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    workshopCode: "",
    email: "",
    loginPath: "/auth_su",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["superadmin-access-settings"],
    queryFn: async () =>
      phpApiRequest<SuperAdminAccessSettings | null>("/superadmin-access.php", { method: "GET" }),
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (settings) {
      setForm((current) => ({
        workshopCode: settings.workshop_code || "",
        email: settings.email || "",
        loginPath: settings.login_path || "/auth_su",
        password: current.password,
      }));
    }
  }, [settings]);

  const updateAccess = useMutation({
    mutationFn: async () =>
      phpApiRequest<SuperAdminAccessSettings>("/superadmin-access.php", {
        method: "PUT",
        body: JSON.stringify({
          workshop_code: form.workshopCode.trim().toUpperCase(),
          email: form.email.trim().toLowerCase(),
          login_path: form.loginPath.trim(),
          password: form.password,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-access-settings"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      setForm((current) => ({ ...current, password: "" }));
      toast({
        title: "Acceso SuperAdmin actualizado",
        description: "La ruta y credenciales aisladas ya estan activas",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Acceso aislado SuperAdmin
        </CardTitle>
        <CardDescription>Configura la ruta privada y credenciales del login global</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Ruta del login SuperAdmin</Label>
            <Input
              value={form.loginPath}
              onChange={(event) =>
                setForm({
                  ...form,
                  loginPath: event.target.value.startsWith("/") ? event.target.value : `/${event.target.value}`,
                })
              }
              placeholder="/auth_su"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              URL actual: {window.location.origin}{form.loginPath || "/auth_su"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Codigo SuperAdmin</Label>
            <Input
              value={form.workshopCode}
              onChange={(event) =>
                setForm({ ...form, workshopCode: event.target.value.toUpperCase() })
              }
              placeholder="ADMINWARRIOR"
              className="uppercase"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Correo SuperAdmin</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="superadmin@dominio.com"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Nueva contrasena</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Dejar vacio para conservarla"
                disabled={isLoading}
                className="pr-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Solo puede existir una configuracion de acceso SuperAdmin. Al guardar, ese correo queda sincronizado como el unico rol global <code className="px-1 py-0.5 rounded bg-background">superadmin</code>.
        </div>

        <div className="flex justify-end">
          <Button
            className="gap-2"
            onClick={() => updateAccess.mutate()}
            disabled={
              updateAccess.isPending ||
              isLoading ||
              !form.workshopCode.trim() ||
              !form.email.trim() ||
              !form.loginPath.trim()
            }
          >
            {updateAccess.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar acceso
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
