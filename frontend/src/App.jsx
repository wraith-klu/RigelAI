import React, { Component } from "react";
import Home from "./pages/Home";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fbfbfa",
          color: "#1d1d1f",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
          textAlign: "center"
        }}>
          <div style={{
            maxWidth: "480px",
            backgroundColor: "#ffffff",
            padding: "2rem",
            borderRadius: "8px",
            border: "1px solid #e5e5ea",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h2>
            <p style={{ color: "#59595e", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {this.state.error?.message || "An unexpected error occurred while rendering."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: "#1d1d1f",
                color: "#ffffff",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Home />
    </ErrorBoundary>
  );
}