import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon, Button, Logo } from "../ui";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RoadRider ErrorBoundary] Uncaught runtime exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    try {
      // Clear any corrupted transient state
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="app-shell theme-neutral"
          style={{
            minHeight: "100vh",
            height: "100dvh",
            display: "grid",
            placeItems: "center",
            padding: "1.5rem",
            backgroundColor: "#F9FAFB",
          }}
        >
          <div
            className="mobile-frame"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "2.5rem 1.75rem",
              backgroundColor: "#FFFFFF",
              borderRadius: "24px",
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.12)",
              textAlign: "center",
              border: "1px solid #F3F4F6",
            }}
          >
            <div style={{ marginBottom: "1.5rem" }}>
              <Logo />
              <p
                style={{
                  fontSize: "9px",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#9CA3AF",
                  marginTop: "6px",
                  fontWeight: 600,
                }}
              >
                MOVE · EAT · SHOP · DELIVER
              </p>
            </div>

            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "#FEF2F2",
                color: "#EF4444",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 1.25rem",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.15)",
              }}
            >
              <Icon name="alert" size={30} />
            </div>

            <h2
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 0.5rem",
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                fontSize: "0.9rem",
                color: "#6B7280",
                lineHeight: 1.5,
                margin: "0 0 1.5rem",
              }}
            >
              An unexpected issue occurred while rendering this view. Your saved orders and account remain completely safe.
            </p>

            {this.state.error && (
              <div
                style={{
                  width: "100%",
                  marginBottom: "1.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#9CA3AF",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    marginBottom: "0.5rem",
                  }}
                >
                  {this.state.showDetails ? "Hide technical details" : "View technical details"}
                </button>
                {this.state.showDetails && (
                  <pre
                    style={{
                      backgroundColor: "#F3F4F6",
                      color: "#EF4444",
                      padding: "0.75rem",
                      borderRadius: "10px",
                      fontSize: "0.72rem",
                      textAlign: "left",
                      maxHeight: "120px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      margin: 0,
                    }}
                  >
                    {this.state.error.message || String(this.state.error)}
                  </pre>
                )}
              </div>
            )}

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Button onClick={this.handleRetry}>
                Try again
              </Button>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  backgroundColor: "#F3F4F6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "14px",
                  height: "48px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <Icon name="refresh" size={16} />
                Reload application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
