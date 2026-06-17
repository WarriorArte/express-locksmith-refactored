import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Loader2, Megaphone, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { phpApiRequest } from "@/lib/phpApi";

export type UpdateNotice = {
  id: string;
  title: string;
  body: string | null;
  is_active: boolean | number;
  force_refresh: boolean | number;
  notice_key: string;
  published_at?: string | null;
  updated_at?: string | null;
};

type NoticeForm = {
  title: string;
  body: string;
  isActive: boolean;
  forceRefresh: boolean;
};

const emptyForm: NoticeForm = {
  title: "",
  body: "",
  isActive: true,
  forceRefresh: false,
};

export function UpdateNoticesTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NoticeForm>(emptyForm);

  const { data: notice, isLoading } = useQuery({
    queryKey: ["superadmin-update-notice"],
    queryFn: () => phpApiRequest<UpdateNotice | null>("/update-notices.php?include_inactive=1"),
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (!notice) return;

    setForm({
      title: notice.title || "",
      body: notice.body || "",
      isActive: !!notice.is_active,
      forceRefresh: !!notice.force_refresh,
    });
  }, [notice]);

  const publishNotice = useMutation({
    mutationFn: () =>
      phpApiRequest<UpdateNotice>("/update-notices.php", {
        method: "PUT",
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          is_active: form.isActive,
          force_refresh: form.forceRefresh,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-update-notice"] });
      toast({ title: "Aviso publicado", description: "Los usuarios lo veran en su siguiente revision diaria." });
    },
    onError: (error) => {
      toast({
        title: "Error al publicar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  const deactivateNotice = useMutation({
    mutationFn: () => phpApiRequest<null>("/update-notices.php", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-update-notice"] });
      setForm((current) => ({ ...current, isActive: false }));
      toast({ title: "Aviso desactivado" });
    },
    onError: (error) => {
      toast({
        title: "Error al desactivar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  const canPublish = form.title.trim().length > 0 && !publishNotice.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Aviso de actualizacion
              </CardTitle>
              <CardDescription>
                Publica un banner con novedades. La app lo consulta como maximo una vez al dia por navegador.
              </CardDescription>
            </div>
            {notice && (
              <Badge variant={notice.is_active ? "default" : "secondary"}>
                {notice.is_active ? "Activo" : "Inactivo"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando aviso...
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="update-notice-title">Titulo del banner</Label>
                <Input
                  id="update-notice-title"
                  value={form.title}
                  maxLength={160}
                  placeholder="Nueva version disponible"
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="update-notice-body">Log de implementaciones</Label>
                <Textarea
                  id="update-notice-body"
                  value={form.body}
                  rows={7}
                  placeholder={"- Nuevo modulo de garantias\n- Mejoras en inventario\n- Correcciones de rendimiento"}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                />
              </div>

              <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-medium">Publicar aviso</span>
                    <span className="block text-xs text-muted-foreground">Si esta apagado, queda guardado pero no se muestra.</span>
                  </span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
                  />
                </label>

                <label className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-medium">Requerir actualizacion</span>
                    <span className="block text-xs text-muted-foreground">El banner queda fijo hasta que el usuario actualice.</span>
                  </span>
                  <Switch
                    checked={form.forceRefresh}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, forceRefresh: checked }))}
                  />
                </label>
              </div>

              {notice?.published_at && (
                <div className="flex items-center gap-2 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                  <BellRing className="h-4 w-4" />
                  Ultima publicacion: {new Date(notice.published_at).toLocaleString()}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => deactivateNotice.mutate()}
                  disabled={deactivateNotice.isPending || !notice}
                >
                  {deactivateNotice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Desactivar
                </Button>
                <Button type="button" className="gap-2" onClick={() => publishNotice.mutate()} disabled={!canPublish}>
                  {publishNotice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Publicar aviso
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
