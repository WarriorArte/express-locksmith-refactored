import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Error atrapado:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Algo salió mal
              </h2>
              <p className="text-sm text-muted-foreground">
                Ocurrió un error inesperado. Recarga la página para continuar.
              </p>
              {this.state.error && (
                <p className="text-xs text-muted-foreground/60 font-mono break-all bg-muted rounded-xl p-3 mt-3">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-[0_0_20px_hsl(var(--primary)/0.30)]"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
