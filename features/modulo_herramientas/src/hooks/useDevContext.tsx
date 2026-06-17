import React, { createContext, useContext, useState } from "react";
import type { Workshop } from "@/types";

/**
 * Mock de los contextos de la app base para desarrollo standalone.
 * Al integrar en la app real, estos providers se reemplazan por los reales
 * (useAuth, useWorkshop) y estos archivos se eliminan.
 */

// --- Workshop Context Mock ---
interface WorkshopContextType {
  currentWorkshop: Workshop | null;
  workshops: Workshop[];
  isSuperAdmin: boolean;
  setCurrentWorkshop: (ws: Workshop | null) => void;
}

const WorkshopContext = createContext<WorkshopContextType | null>(null);

const MOCK_WORKSHOPS: Workshop[] = [
  { id: "w1", name: "Taller Norte (Matriz)" },
  { id: "w2", name: "Cerrajería Sur Express" },
  { id: "w3", name: "Llaves y Controles Oriente" },
];

export function DevWorkshopProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkshop, setCurrentWorkshop] = useState<Workshop | null>(MOCK_WORKSHOPS[0]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);

  return (
    <WorkshopContext.Provider
      value={{
        currentWorkshop,
        workshops: MOCK_WORKSHOPS,
        isSuperAdmin,
        setCurrentWorkshop,
      }}
    >
      {/* Toggle flotante para cambiar rol en dev */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        <button
          onClick={() => setIsSuperAdmin(!isSuperAdmin)}
          className="px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all duration-200 hover:scale-105"
          style={{
            background: isSuperAdmin
              ? "hsl(220 70% 45%)"
              : "hsl(145 65% 42%)",
            color: "white",
          }}
        >
          {isSuperAdmin ? "🔧 SuperAdmin" : "🏪 Taller"}
        </button>
        {isSuperAdmin && (
          <select
            value={currentWorkshop?.id || ""}
            onChange={(e) => {
              const ws = MOCK_WORKSHOPS.find((w) => w.id === e.target.value) || null;
              setCurrentWorkshop(ws);
            }}
            className="px-3 py-1.5 rounded-full text-xs font-medium shadow-lg bg-white text-foreground border border-border"
          >
            <option value="">Sin taller (Panel Admin)</option>
            {MOCK_WORKSHOPS.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {children}
    </WorkshopContext.Provider>
  );
}

export function useWorkshop(): WorkshopContextType {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error("useWorkshop debe usarse dentro de DevWorkshopProvider");
  return ctx;
}
