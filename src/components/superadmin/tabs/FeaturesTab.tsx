import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleLeft, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { phpApiRequest } from "@/lib/phpApi";
import { useSuperAdminWorkshops } from "../hooks";
import { AVAILABLE_FEATURES, type WorkshopFeatureRow } from "../types";

const WORKSHOP_ASSIGNMENTS_KEY = "herramientas:workshop_assignments";

/**
 * Sincroniza el toggle de una herramienta (keycode/alarmas/immo) con el
 * localStorage que consume WorkshopToolView. Así un único interruptor en
 * "Features por Taller" controla tanto el flag del backend como la asignación
 * local que el módulo de Herramientas ya esperaba.
 */
function syncToolAssignmentLocalStorage(
  workshopId: string,
  toolId: "keycode" | "alarmas" | "immo",
  isEnabled: boolean,
) {
  try {
    const raw = localStorage.getItem(WORKSHOP_ASSIGNMENTS_KEY);
    const list: Array<{ workshopId: string; tools: string[] }> = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((a) => a.workshopId === workshopId);
    if (idx === -1) {
      if (isEnabled) list.push({ workshopId, tools: [toolId] });
    } else {
      const current = new Set(list[idx].tools);
      if (isEnabled) current.add(toolId);
      else current.delete(toolId);
      list[idx] = { workshopId, tools: Array.from(current) };
    }
    localStorage.setItem(WORKSHOP_ASSIGNMENTS_KEY, JSON.stringify(list));
  } catch {
    // noop
  }
}

export function FeaturesTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workshops } = useSuperAdminWorkshops(isSuperAdmin);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);

  const { data: workshopFeatures } = useQuery({
    queryKey: ["superadmin-workshop-features", selectedWorkshop],
    queryFn: async () => {
      if (!selectedWorkshop) return [];
      return phpApiRequest<WorkshopFeatureRow[]>(
        `/workshop-features.php?workshop_id=${encodeURIComponent(selectedWorkshop)}`
      );
    },
    enabled: isSuperAdmin && !!selectedWorkshop,
  });

  const toggleFeature = useMutation({
    mutationFn: async ({
      workshopId,
      featureKey,
      isEnabled,
      toolId,
    }: {
      workshopId: string;
      featureKey: string;
      isEnabled: boolean;
      toolId?: "keycode" | "alarmas" | "immo";
    }) => {
      await phpApiRequest(`/workshop-features.php?workshop_id=${encodeURIComponent(workshopId)}`, {
        method: "PUT",
        body: JSON.stringify({ feature_key: featureKey, is_enabled: isEnabled }),
      });
      if (toolId) syncToolAssignmentLocalStorage(workshopId, toolId, isEnabled);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-workshop-features"] });
      queryClient.invalidateQueries({ queryKey: ["workshop-features", variables.workshopId] });
      toast({ title: "Feature actualizado" });
    },
  });

  const generalFeatures = AVAILABLE_FEATURES.filter((f) => f.group !== "herramientas");
  const toolFeatures = AVAILABLE_FEATURES.filter((f) => f.group === "herramientas");

  const renderToggle = (feature: (typeof AVAILABLE_FEATURES)[number]) => {
    const wf = workshopFeatures?.find((f) => f.feature_key === feature.key);
    // Las herramientas vienen desactivadas por defecto; el resto, activadas
    const defaultEnabled = feature.group !== "herramientas";
    const isEnabled = wf?.is_enabled == null ? defaultEnabled : !!wf.is_enabled;

    return (
      <div key={feature.key} className="flex items-center justify-between py-2 px-3 border-b last:border-b-0">
        <div className="pr-3 min-w-0">
          <p className="text-sm font-medium truncate">{feature.label}</p>
          <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
        </div>
        <Switch
          className="shrink-0"
          checked={isEnabled}
          onCheckedChange={(checked) =>
            toggleFeature.mutate({
              workshopId: selectedWorkshop!,
              featureKey: feature.key,
              isEnabled: checked,
              toolId: feature.toolId,
            })
          }
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          Features por Taller
        </CardTitle>
        <CardDescription>
          Activa o desactiva módulos generales y herramientas técnicas para cada taller
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 overflow-y-auto max-h-[calc(100vh-260px)]">
        <div className="space-y-2">
          <Label>Seleccionar Taller</Label>
          <Select value={selectedWorkshop || ""} onValueChange={setSelectedWorkshop}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Seleccionar taller" />
            </SelectTrigger>
            <SelectContent>
              {workshops?.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedWorkshop && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <ToggleLeft className="h-4 w-4" /> Módulos generales
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {generalFeatures.map(renderToggle)}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Wrench className="h-4 w-4" /> Herramientas técnicas
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {toolFeatures.map(renderToggle)}
              </div>
            </section>
          </div>
        )}

        {!selectedWorkshop && (
          <p className="text-muted-foreground text-center py-8">
            Selecciona un taller para configurar sus features
          </p>
        )}
      </CardContent>
    </Card>
  );
}
