import { useState } from "react";
import { m as motion } from "framer-motion";
import { FileText, Printer, Shield, Check, Loader2, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  useGlobalTemplates,
  useWorkshopTemplateSelection,
  useSelectTemplate,
  templateTypeLabels,
  defaultTemplates,
  Template,
} from "@/hooks/useTemplates";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";

const typeIcons: Record<string, any> = {
  quote_pdf: FileText,
  sale_receipt: Printer,
  service_order: Printer,
  warranty_ticket: Shield,
};

const templateTypes = ["quote_pdf", "sale_receipt", "service_order", "warranty_ticket"];

export function TemplateSelector() {
  const [selectedType, setSelectedType] = useState("sale_receipt");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizingTemplate, setCustomizingTemplate] = useState<Template | null>(null);
  const [customCss, setCustomCss] = useState("");

  const { data: globalTemplates, isLoading } = useGlobalTemplates(selectedType);
  const { data: currentSelection } = useWorkshopTemplateSelection(selectedType);
  const selectMutation = useSelectTemplate();

  const handleSelect = (template: Template) => {
    selectMutation.mutate({ templateId: template.id, templateType: selectedType });
  };

  const handleCustomize = (template: Template) => {
    setCustomizingTemplate(template);
    setCustomCss(currentSelection?.template_id === template.id ? (currentSelection?.custom_css || "") : "");
    setCustomizeOpen(true);
  };

  const handleSaveCustom = () => {
    if (!customizingTemplate) return;
    selectMutation.mutate({
      templateId: customizingTemplate.id,
      templateType: selectedType,
      customCss,
    });
    setCustomizeOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Plantillas de Documentos
        </h3>
        <p className="text-sm text-muted-foreground">
          Selecciona la plantilla que deseas usar para cada tipo de documento
        </p>
      </div>

      {/* Type selector tabs */}
      <div className="flex flex-wrap gap-2">
        {templateTypes.map((type) => {
          const Icon = typeIcons[type] || FileText;
          return (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type)}
              className="gap-2"
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{templateTypeLabels[type]?.split(" (")[0]}</span>
              <span className="sm:hidden">{templateTypeLabels[type]?.split(" ")[0]}</span>
            </Button>
          );
        })}
      </div>

      {/* Template grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !globalTemplates || globalTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay plantillas disponibles</p>
          <p className="text-sm">El administrador aún no ha creado plantillas para este tipo</p>
          <p className="text-xs mt-2">Se usará la plantilla predeterminada del sistema</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {globalTemplates.map((template) => {
            const isSelected = currentSelection?.template_id === template.id;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`overflow-hidden cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
                }`}>
                  {/* Thumbnail / Preview */}
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {template.thumbnail_url ? (
                      <img 
                        src={template.thumbnail_url} 
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <div className="transform scale-[0.3] origin-top-left w-[300%] h-[300%] pointer-events-none">
                          <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(template.css_content || "") }} />
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(template.html_content || "") }} />
                        </div>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-primary text-primary-foreground gap-1">
                          <Check className="w-3 h-3" /> Activa
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <p className="font-medium text-sm mb-3">{template.name}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={isSelected ? "secondary" : "default"}
                        className="flex-1 gap-1"
                        onClick={() => handleSelect(template)}
                        disabled={selectMutation.isPending}
                      >
                        {isSelected ? (
                          <><Check className="w-3 h-3" /> Seleccionada</>
                        ) : (
                          "Usar esta"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCustomize(template)}
                        title="Personalizar CSS"
                      >
                        <Paintbrush className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Current status */}
      <div className="p-4 rounded-xl bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {currentSelection 
            ? `✓ Tienes una plantilla seleccionada para ${templateTypeLabels[selectedType]}`
            : `ℹ️ Usando la plantilla predeterminada del sistema para ${templateTypeLabels[selectedType]}`
          }
        </p>
      </div>

      {/* Customize CSS Dialog */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paintbrush className="w-5 h-5" />
              Personalizar CSS - {customizingTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Agrega CSS personalizado para ajustar colores, fuentes o espaciado de esta plantilla sin modificar la original.
            </p>
            <div>
              <Label>CSS Personalizado (opcional)</Label>
              <Textarea
                value={customCss}
                onChange={e => setCustomCss(e.target.value)}
                className="h-[250px] font-mono text-xs"
                placeholder={`/* Ejemplo: cambiar color del encabezado */\n.header { color: #333; }\n.business-name { font-size: 16px; }`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizeOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCustom} disabled={selectMutation.isPending}>
              Guardar y Seleccionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
