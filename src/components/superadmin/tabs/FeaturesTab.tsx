import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { phpApiRequest } from "@/lib/phpApi";
import { useSuperAdminWorkshops } from "../hooks";
import { AVAILABLE_FEATURES, type WorkshopFeatureRow } from "../types";

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
    mutationFn: async ({ workshopId, featureKey, isEnabled }: { workshopId: string; featureKey: string; isEnabled: boolean }) => {
      await phpApiRequest(`/workshop-features.php?workshop_id=${encodeURIComponent(workshopId)}`, {
        method: "PUT",
        body: JSON.stringify({ feature_key: featureKey, is_enabled: isEnabled }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-workshop-features"] });
      queryClient.invalidateQueries({ queryKey: ["workshop-features", variables.workshopId] });
      toast({ title: "Feature actualizado" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          Features por Taller
        </CardTitle>
        <CardDescription>Activa o desactiva módulos para cada taller</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <div className="grid gap-4 md:grid-cols-2">
            {AVAILABLE_FEATURES.map((feature) => {
              const wf = workshopFeatures?.find((f) => f.feature_key === feature.key);
              const isEnabled = wf?.is_enabled == null ? true : !!wf.is_enabled;

              return (
                <div key={feature.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{feature.label}</p>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      toggleFeature.mutate({
                        workshopId: selectedWorkshop,
                        featureKey: feature.key,
                        isEnabled: checked,
                      })
                    }
                  />
                </div>
              );
            })}
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
