import React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("UI CRASH:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 20 }}>
          <h2>Something went wrong.</h2>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
