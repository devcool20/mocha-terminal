import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="recovery">
        <h1>Let’s get your desk back.</h1>
        <p>
          A part of the app could not load. Your saved portfolio stays on this
          device. Check your connection, then reload the latest version.
        </p>
        <button className="primary" onClick={() => location.reload()}>
          Reload Practice Lab
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
