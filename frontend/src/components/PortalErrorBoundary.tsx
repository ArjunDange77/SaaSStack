import { Component, type ErrorInfo, type ReactNode } from "react";
import { SignOutButton } from "@/components/ui/SignOutButton";

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  error: Error | null;
}

export class PortalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[PortalErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="portal-page">
          <header className="portal-header">
            <div>
              <h1>{this.props.title ?? "School Bus"}</h1>
              <p className="error">Something went wrong loading this page.</p>
              <p className="muted">{this.state.error.message}</p>
            </div>
            <SignOutButton />
          </header>
          <button
            type="button"
            className="secondary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
