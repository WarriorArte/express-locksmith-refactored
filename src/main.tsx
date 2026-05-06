import "@/polyfills/crypto";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkshopProvider } from "@/hooks/useWorkshop";
import { ThemeProvider } from "@/hooks/useTheme";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Prevent browser edge-swipe navigation (back/forward) on mobile browsers.
if (typeof window !== "undefined") {
  let touchStartX = 0;
  let touchStartY = 0;
  const EDGE_GUARD_PX = 24;
  const HORIZONTAL_ACTIVATION_PX = 10;

  window.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const fromLeftEdge = touchStartX <= EDGE_GUARD_PX;
      const fromRightEdge = touchStartX >= window.innerWidth - EDGE_GUARD_PX;
      const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > HORIZONTAL_ACTIVATION_PX;

      if ((fromLeftEdge || fromRightEdge) && horizontalIntent) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <WorkshopProvider>
          <App />
        </WorkshopProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

