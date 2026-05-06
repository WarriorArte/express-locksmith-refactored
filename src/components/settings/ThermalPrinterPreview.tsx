import React from "react";
import { Badge } from "@/components/ui/badge";

type PrinterModel = "58mm" | "80mm" | "110mm";

interface ThermalPrinterPreviewProps {
  printerModel: PrinterModel;
  showLogo?: boolean;
}

const modelToPx = (model: PrinterModel) => {
  switch (model) {
    case "58mm":
      return 220; // aprox.
    case "110mm":
      return 420; // aprox.
    case "80mm":
    default:
      return 304; // aprox.
  }
};

export function ThermalPrinterPreview({ printerModel, showLogo = true }: ThermalPrinterPreviewProps) {
  const widthPx = modelToPx(printerModel);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono">{printerModel}</Badge>
        <span className="text-xs text-muted-foreground">Vista previa del ancho del ticket</span>
      </div>
      <div className="flex justify-center">
        <div
          className="bg-white border-2 border-dashed rounded-md shadow-sm"
          style={{ width: `${widthPx}px` }}
        >
          <div className="p-4 font-mono text-xs">
            {/* Encabezado */}
            <div className="text-center mb-2">
              {showLogo && (
                <div className="w-12 h-12 mx-auto mb-1 rounded bg-gray-200" />
              )}
              <div className="font-bold">Ticket de Prueba</div>
              <div>Mi Negocio</div>
              <div className="text-[10px]">Dirección - Teléfono</div>
            </div>

            <div className="border-t border-dashed my-2" />

            {/* Ítems */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>2x Producto A</span>
                <span>$120.00</span>
              </div>
              <div className="flex justify-between">
                <span>1x Producto B</span>
                <span>$80.00</span>
              </div>
              <div className="flex justify-between">
                <span>3x Producto C</span>
                <span>$150.00</span>
              </div>
            </div>

            <div className="border-t border-dashed my-2" />

            {/* Totales */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>$320.00</span>
              </div>
              <div className="flex justify-between">
                <span>Descuento:</span>
                <span>-$20.00</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>$300.00</span>
              </div>
            </div>

            <div className="border-t border-dashed my-2" />

            {/* Pie */}
            <div className="text-center text-[10px]">
              <div>Gracias por su preferencia</div>
              <div>WhatsApp: 55 0000 0000</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
