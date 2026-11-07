/**
 * Indicador de carga estilo Material 3 Expressive: una forma que gira y se transforma
 * dentro de un contenedor circular. `fullscreen` lo fija al centro de la pantalla para
 * que todas las fases de arranque muestren el mismo indicador en la misma posición.
 */
export function AppLoader({ fullscreen = false, label = "Cargando" }: { fullscreen?: boolean; label?: string }) {
  const indicator = (
    <span role="progressbar" aria-label={label} className="m3e-loader">
      <span className="m3e-loader__shape" />
    </span>
  );
  if (!fullscreen) return indicator;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">{indicator}</div>;
}
