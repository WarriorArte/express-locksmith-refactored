import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { getReadableTextColor } from "@/lib/colorContrast";
import { useCategories } from "@/hooks/useCategories";
import {
  useWarrantyCategorySettings,
  useUpsertWarrantyCategorySetting,
  useWarrantySettings,
  useUpsertWarrantySettings,
} from "@/hooks/useWarranties";

interface WarrantySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DurationUnit = "days" | "weeks" | "months" | "years";

function convertToDays(value: number, unit: DurationUnit): number {
  switch (unit) {
    case "weeks": return value * 7;
    case "months": return Math.round((value * 365) / 12);
    case "years": return value * 365;
    default: return value;
  }
}

function convertFromDays(days: number): { value: number; unit: DurationUnit } {
  if (days % 365 === 0 && days >= 365) return { value: days / 365, unit: "years" };
  const approxMonths = Math.round(days / (365 / 12));
  if (approxMonths >= 1 && Math.round((approxMonths * 365) / 12) === days) return { value: approxMonths, unit: "months" };
  if (days % 7 === 0 && days >= 7) return { value: days / 7, unit: "weeks" };
  return { value: days, unit: "days" };
}

export function WarrantySettingsDialog({ open, onOpenChange }: WarrantySettingsDialogProps) {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: catSettings, isLoading: settingsLoading } = useWarrantyCategorySettings();
  const upsertCatSetting = useUpsertWarrantyCategorySetting();
  const { data: globalSettings, isLoading: globalLoading } = useWarrantySettings();
  const upsertGlobal = useUpsertWarrantySettings();

  const [localCat, setLocalCat] = useState<Record<string, { value: number; unit: DurationUnit }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Global form state
  const [defaultProductCfg, setDefaultProductCfg] = useState({ value: 30, unit: "days" as DurationUnit });
  const [defaultServiceCfg, setDefaultServiceCfg] = useState({ value: 30, unit: "days" as DurationUnit });
  const [termsConditions, setTermsConditions] = useState("");
  const [coverageProducts, setCoverageProducts] = useState("");
  const [coverageServices, setCoverageServices] = useState("");

  useEffect(() => {
    if (!globalSettings) return;
    setDefaultProductCfg(convertFromDays(globalSettings.default_warranty_days || 30));
    setDefaultServiceCfg(convertFromDays(globalSettings.default_service_warranty_days || 30));
    setTermsConditions(globalSettings.terms_conditions || "");
    setCoverageProducts(globalSettings.coverage_policy_products || "");
    setCoverageServices(globalSettings.coverage_policy_services || "");
  }, [globalSettings]);

  const getCatCfg = (categoryId: string): { value: number; unit: DurationUnit } => {
    if (localCat[categoryId]) return localCat[categoryId];
    const setting = catSettings?.find(s => s.category_id === categoryId);
    return convertFromDays(setting?.warranty_days || 30);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await upsertGlobal.mutateAsync({
        default_warranty_days: convertToDays(defaultProductCfg.value, defaultProductCfg.unit),
        default_service_warranty_days: convertToDays(defaultServiceCfg.value, defaultServiceCfg.unit),
        terms_conditions: termsConditions || null,
        coverage_policy_products: coverageProducts || null,
        coverage_policy_services: coverageServices || null,
      });

      const modifiedCategoryIds = Object.keys(localCat);
      if (modifiedCategoryIds.length > 0) {
        const promises = modifiedCategoryIds.map(categoryId => {
          const cfg = getCatCfg(categoryId);
          return upsertCatSetting.mutateAsync({
            category_id: categoryId,
            warranty_days: convertToDays(cfg.value, cfg.unit),
          });
        });
        await Promise.all(promises);
        setLocalCat({});
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = categoriesLoading || settingsLoading || globalLoading;

  const DurationField = ({
    label,
    cfg,
    setCfg,
  }: {
    label: string;
    cfg: { value: number; unit: DurationUnit };
    setCfg: (v: { value: number; unit: DurationUnit }) => void;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={cfg.value}
          onChange={(e) => setCfg({ ...cfg, value: parseInt(e.target.value) || 1 })}
          className="w-20 text-center"
        />
        <Select value={cfg.unit} onValueChange={(unit: DurationUnit) => setCfg({ ...cfg, unit })}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="days">días</SelectItem>
            <SelectItem value="weeks">semanas</SelectItem>
            <SelectItem value="months">meses</SelectItem>
            <SelectItem value="years">años</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configuración de Garantías</DialogTitle>
          <DialogDescription>
            Configura duración por defecto, duraciones por categoría, términos y políticas de cobertura.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="categorias">Categorías</TabsTrigger>
              <TabsTrigger value="politicas">Políticas</TabsTrigger>
            </TabsList>

            {/* GENERAL */}
            <TabsContent value="general" className="space-y-5 pt-4">
              <DurationField
                label="Duración por defecto (productos)"
                cfg={defaultProductCfg}
                setCfg={setDefaultProductCfg}
              />
              <DurationField
                label="Duración por defecto (servicios)"
                cfg={defaultServiceCfg}
                setCfg={setDefaultServiceCfg}
              />
              <p className="text-xs text-muted-foreground">
                Se aplica cuando no hay configuración específica por categoría.
              </p>

            </TabsContent>

            {/* CATEGORIAS */}
            <TabsContent value="categorias" className="space-y-3 pt-4">
              {!categories || categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay categorías de productos configuradas.</p>
                  <p className="text-sm mt-2">Crea categorías en el módulo de Inventario.</p>
                </div>
              ) : (
                categories.map((category) => {
                  const cfg = getCatCfg(category.id);
                  const hasChanges = !!localCat[category.id];
                  return (
                    <div key={category.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <Badge
                          style={{
                            backgroundColor: category.color,
                            color: getReadableTextColor(category.color),
                          }}
                        >
                          {category.name}
                        </Badge>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={cfg.value}
                        onChange={(e) =>
                          setLocalCat(prev => ({
                            ...prev,
                            [category.id]: { ...cfg, value: parseInt(e.target.value) || 1 },
                          }))
                        }
                        className="w-16 text-center"
                      />
                      <Select
                        value={cfg.unit}
                        onValueChange={(unit: DurationUnit) =>
                          setLocalCat(prev => ({ ...prev, [category.id]: { ...cfg, unit } }))
                        }
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">días</SelectItem>
                          <SelectItem value="weeks">semanas</SelectItem>
                          <SelectItem value="months">meses</SelectItem>
                          <SelectItem value="years">años</SelectItem>
                        </SelectContent>
                      </Select>

                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* POLITICAS */}
            <TabsContent value="politicas" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Términos y condiciones</Label>
                <Textarea
                  rows={4}
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  placeholder="Texto que aparecerá impreso en la garantía..."
                />
              </div>
              <div className="space-y-2">
                <Label>Política de cobertura — Productos</Label>
                <Textarea
                  rows={4}
                  value={coverageProducts}
                  onChange={(e) => setCoverageProducts(e.target.value)}
                  placeholder="Qué cubre y qué no cubre la garantía de productos..."
                />
              </div>
              <div className="space-y-2">
                <Label>Política de cobertura — Servicios</Label>
                <Textarea
                  rows={4}
                  value={coverageServices}
                  onChange={(e) => setCoverageServices(e.target.value)}
                  placeholder="Qué cubre y qué no cubre la garantía de servicios..."
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
        <DialogFooter className="flex-row gap-3 pt-2">
          <Button type="button" variant="proto-ghost" size="lg" className="flex-1 h-12" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            type="button" 
            variant="proto" 
            size="lg" 
            className="flex-[2] h-12" 
            onClick={handleSaveAll} 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
