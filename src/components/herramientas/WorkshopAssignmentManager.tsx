import { useState, useMemo } from "react";
import { Store, Check, Plus, Search, ShieldCheck, Wrench, Shield, X, Settings } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkshop } from "@/hooks/useDevContext";

// Tools available to assign to a workshop
export const WORKSHOP_TOOLS = [
  { id: "keycode", name: "Keycode", icon: Wrench, description: "Acceso completo a la base de Keycodes y cortes de llave." },
  { id: "immo", name: "Immo Info", icon: Shield, description: "Acceso a la información de inmovilizadores y programación." },
  { id: "alarmas", name: "Auto Alarmas", icon: ShieldCheck, description: "Acceso a diagramas de alarmas y datos de programación remota." },
];

export interface WorkshopToolAssignment {
  workshopId: string;
  tools: string[]; // e.g. ["keycode", "alarmas"]
}

export function useWorkshopAssignments() {
  const [workshopAssignments, setWorkshopAssignments] = useState<WorkshopToolAssignment[]>(() => {
    try {
      const raw = localStorage.getItem("herramientas:workshop_assignments");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const saveWorkshopAssignments = (assignments: WorkshopToolAssignment[]) => {
    setWorkshopAssignments(assignments);
    localStorage.setItem("herramientas:workshop_assignments", JSON.stringify(assignments));
  };

  const updateWorkshop = (workshopId: string, tools: string[]) => {
    const existing = workshopAssignments.find(a => a.workshopId === workshopId);
    let newAssignments;
    if (existing) {
      newAssignments = workshopAssignments.map(a => 
        a.workshopId === workshopId ? { ...a, tools } : a
      );
    } else {
      newAssignments = [...workshopAssignments, { workshopId, tools }];
    }
    saveWorkshopAssignments(newAssignments);
  };

  return { workshopAssignments, updateWorkshop };
}

export function WorkshopAssignmentManager() {
  const { workshops } = useWorkshop();
  const { workshopAssignments, updateWorkshop } = useWorkshopAssignments();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Local state for the form
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const filteredWorkshops = useMemo(() => {
    if (!searchQuery.trim()) return workshops;
    const q = searchQuery.toLowerCase();
    return workshops.filter(w => w.name.toLowerCase().includes(q));
  }, [searchQuery, workshops]);

  const startEdit = (workshopId: string) => {
    const existing = workshopAssignments.find(a => a.workshopId === workshopId);
    setSelectedTools(existing?.tools || []);
    setEditingId(workshopId);
  };

  const handleSave = () => {
    if (!editingId) return;
    updateWorkshop(editingId, selectedTools);
    toast.success("Asignación de taller actualizada.");
    setEditingId(null);
  };

  const toggleTool = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) ? prev.filter(t => t !== toolId) : [...prev, toolId]
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header & Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> Asignación de Herramientas a Talleres
          </h2>
          <p className="text-sm text-muted-foreground">
            Habilita módulos completos organizados por taller.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar taller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Listado */}
      <div className="flex-1 overflow-auto min-h-0 space-y-3 custom-scrollbar pr-2">
        {filteredWorkshops.map(workshop => {
          const assignment = workshopAssignments.find(a => a.workshopId === workshop.id);
          const activeTools = assignment?.tools || [];
          const isEditing = editingId === workshop.id;

          return (
            <Card key={workshop.id} className={`transition-all ${isEditing ? 'border-primary ring-1 ring-primary/20' : 'hover:border-primary/30'}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeTools.length > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">{workshop.name}</h3>
                      {!isEditing && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {activeTools.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Sin herramientas asignadas</span>
                          ) : (
                            activeTools.map(tId => {
                              const tool = WORKSHOP_TOOLS.find(t => t.id === tId);
                              if (!tool) return null;
                              return (
                                <Badge key={tId} variant="secondary" className="text-[11px] px-1.5 py-0">
                                  {tool.name}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => startEdit(workshop.id)}>
                      <Settings className="w-4 h-4 mr-1.5" /> Administrar
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-8 w-8 text-muted-foreground">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Formulario de EDICION inline */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 border-t border-border space-y-4">
                        <p className="text-sm font-medium">Herramientas Habilitadas para este Taller:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {WORKSHOP_TOOLS.map(tool => {
                            const isSelected = selectedTools.includes(tool.id);
                            return (
                              <label
                                key={tool.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30"
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleTool(tool.id)}
                                  className="mt-0.5"
                                />
                                <div>
                                  <div className="font-semibold text-sm flex items-center gap-2">
                                    <tool.icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                    {tool.name}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                                    {tool.description}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSave}>
                            Guardar Asignación
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          );
        })}
        {filteredWorkshops.length === 0 && (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
            <Store className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">No se encontraron talleres con ese nombre.</p>
          </div>
        )}
      </div>
    </div>
  );
}