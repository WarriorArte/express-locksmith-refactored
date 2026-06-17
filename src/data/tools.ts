import { Key, Radio, Lock, type LucideIcon } from "lucide-react";

export interface ToolDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  { id: "keycode", name: "Keycode", icon: Key, description: "Cálculo de cortes de llave." },
  { id: "immo", name: "Immo Info", icon: Lock, description: "Información y cálculo de inmovilizador." },
  { id: "alarmas", name: "Auto Alarma Diagrama", icon: Radio, description: "Diagramas eléctricos de alarma." },
];
