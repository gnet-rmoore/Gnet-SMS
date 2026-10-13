import React from "react";
import ServerErrorPage from "../pages/errors/ServerErrorPage";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Catches render and lazy-chunk failures and shows the branded 500 page.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof console !== "undefined") {
      console.error("AppErrorBoundary", error, info.componentStack);
    }
  }

  private clear = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ServerErrorPage error={this.state.error} onRetry={this.clear} />;
    }
    return this.props.children;
  }
}
