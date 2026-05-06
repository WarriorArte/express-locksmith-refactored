import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, Code, Paintbrush, RotateCcw, Eye } from "lucide-react";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkshop } from "@/hooks/useWorkshop";
import { 
  Template, 
  templateTypeLabels, 
  placeholders, 
  defaultTemplates,
  useTemplates 
} from "@/hooks/useTemplates";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType: string;
  editTemplate?: Template | null;
  isGlobalMode?: boolean;
}

export function TemplateEditorDialog({ open, onOpenChange, templateType, editTemplate, isGlobalMode }: TemplateEditorDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [cssContent, setCssContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [activeTab, setActiveTab] = useState("html");
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkshop } = useWorkshop();

  const { data: templates } = useTemplates(templateType);

  useEffect(() => {
    if (!open) return;
    
    if (editTemplate) {
      setSelectedTemplate(editTemplate);
      setHtmlContent(editTemplate.html_content || defaultTemplates[templateType]?.html || "");
      setCssContent(editTemplate.css_content || defaultTemplates[templateType]?.css || "");
      setTemplateName(editTemplate.name);
      return;
    }
    
    if (templates && templates.length > 0) {
      const defaultTmpl = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplate(defaultTmpl);
      setHtmlContent(defaultTmpl.html_content || defaultTemplates[templateType]?.html || "");
      setCssContent(defaultTmpl.css_content || defaultTemplates[templateType]?.css || "");
      setTemplateName(defaultTmpl.name);
    } else if (defaultTemplates[templateType]) {
      setSelectedTemplate(null);
      setHtmlContent(defaultTemplates[templateType].html);
      setCssContent(defaultTemplates[templateType].css);
      setTemplateName(templateTypeLabels[templateType] + " - Nueva");
    }
  }, [templates, templateType, open, editTemplate]);

  const handleSave = async () => {
    if (isGlobalMode && editTemplate) {
      // SuperAdmin saving a global template
      setIsSaving(true);
      try {
        const sanitizedHtml = sanitizeHTML(htmlContent);
        const sanitizedCss = sanitizeCSS(cssContent);

        await phpApiRequest(`/templates.php?id=${encodeURIComponent(editTemplate.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            name: templateName,
            html_content: sanitizedHtml,
            css_content: sanitizedCss,
          })
        });
        
        queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
        queryClient.invalidateQueries({ queryKey: ["global-templates"] });
        queryClient.invalidateQueries({ queryKey: ["template"] });
        toast({ title: "Plantilla guardada", description: "Los cambios han sido aplicados" });
        onOpenChange(false);
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Error desconocido", variant: "destructive" });
      }
      setIsSaving(false);
      return;
    }

    // Legacy workshop mode
    if (!currentWorkshop?.id) {
      toast({ title: "Sin taller", description: "Selecciona un taller para guardar la plantilla.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const sanitizedHtml = sanitizeHTML(htmlContent);
      const sanitizedCss = sanitizeCSS(cssContent);
      
      if (selectedTemplate) {
        await phpApiRequest(`/templates.php?id=${encodeURIComponent(selectedTemplate.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            name: templateName,
            html_content: sanitizedHtml,
            css_content: sanitizedCss,
          }),
        });
      } else {
        await phpApiRequest("/templates.php", {
          method: "POST",
          body: JSON.stringify({
            name: templateName,
            template_type: templateType,
            html_content: sanitizedHtml,
            css_content: sanitizedCss,
            is_default: true,
            workshop_id: currentWorkshop.id,
          }),
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template", templateType] });
      toast({ title: "Plantilla guardada", description: "Los cambios han sido aplicados" });
    } catch (error: any) {
      const message = typeof error?.message === "string" ? error.message : "Error desconocido";
      const isRlsViolation = /row-level security|RLS/i.test(message);
      toast({
        title: isRlsViolation ? "Acceso denegado" : "Error",
        description: isRlsViolation ? "No tienes permisos para crear plantillas en este taller." : message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const loadDefaultTemplate = async () => {
    try {
      if (!defaultTemplates[templateType]) return;
      setHtmlContent(defaultTemplates[templateType].html);
      setCssContent(defaultTemplates[templateType].css);
      setTemplateName(templateTypeLabels[templateType] + " - Restaurada");

      if (selectedTemplate && currentWorkshop?.id && !isGlobalMode) {
        setIsRestoring(true);

        await phpApiRequest(`/templates.php?id=${encodeURIComponent(selectedTemplate.id)}`, {
          method: "DELETE",
        });

        setSelectedTemplate(null);
        queryClient.invalidateQueries({ queryKey: ["templates"] });
        queryClient.invalidateQueries({ queryKey: ["template", templateType] });
        toast({ title: "Plantilla restaurada", description: "Se ha restaurado la plantilla predeterminada" });
      }
    } catch (error: any) {
      toast({ title: "Error al restaurar", description: error.message || "Error desconocido", variant: "destructive" });
    } finally {
      setIsRestoring(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    if (activeTab === "html") {
      setHtmlContent(prev => prev + placeholder);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fixedHeight className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Editor de Plantilla: {templateTypeLabels[templateType]}
                {isGlobalMode && <Badge variant="secondary">Global</Badge>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="gap-2">
                <Eye className="w-4 h-4" />
                Vista Previa
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Nombre de la plantilla</Label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Nombre de la plantilla" />
              </div>
              {!isGlobalMode && (
                <Button variant="outline" onClick={loadDefaultTemplate} className="gap-2 mt-6" disabled={isRestoring}>
                  <RotateCcw className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`} />
                  {isRestoring ? "Restaurando..." : "Restaurar por defecto"}
                </Button>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="html" className="gap-2"><Code className="w-4 h-4" />HTML</TabsTrigger>
                <TabsTrigger value="css" className="gap-2"><Paintbrush className="w-4 h-4" />CSS</TabsTrigger>
              </TabsList>
              <TabsContent value="html" className="flex-1 mt-2">
                <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} className="h-[450px] font-mono text-xs resize-none" placeholder="HTML de la plantilla..." />
              </TabsContent>
              <TabsContent value="css" className="flex-1 mt-2">
                <Textarea value={cssContent} onChange={(e) => setCssContent(e.target.value)} className="h-[450px] font-mono text-xs resize-none" placeholder="CSS de la plantilla..." />
              </TabsContent>
            </Tabs>

            <div>
              <Label className="text-xs text-muted-foreground">Placeholders disponibles (clic para insertar):</Label>
              <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                {placeholders.map((ph) => (
                  <Badge key={ph} variant="outline" className="font-mono text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => insertPlaceholder(ph)}>
                    {ph}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa - {templateType === "quote_pdf" ? "Tamaño Carta" : "Ticket Térmico"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted p-8">
            {templateType === "quote_pdf" ? (
              <div className="mx-auto bg-white shadow-lg" style={{ width: '100%', maxWidth: '816px', minHeight: '1056px', padding: '1in' }}>
                <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(cssContent) }} />
                <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(htmlContent) }} />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="bg-white shadow-lg" style={{ width: '304px', padding: '5mm' }}>
                  <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(cssContent) }} />
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(htmlContent) }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
