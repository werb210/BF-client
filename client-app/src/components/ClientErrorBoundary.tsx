import * as React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: boolean;
};

export class ClientErrorBoundary extends React.Component<Props, State> {
  state: State = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    if (this.state.error) {
      return <div>Temporary issue. Please try again.</div>;
    }

    return this.props.children;
  }
}
