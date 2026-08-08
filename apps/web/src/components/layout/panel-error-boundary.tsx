"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Heading } from "@/components/layout/heading";
import { Button } from "@/components/ui/button";

type PanelErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
};

type PanelErrorBoundaryState = {
  error: Error | null;
};

export class PanelErrorBoundary extends Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PanelErrorBoundary]", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="pond-card flex flex-col items-start gap-3 pond-pad">
        <Heading as="h2">{this.props.title ?? "Panel error"}</Heading>
        <p className="max-w-md text-sm text-ink-soft">
          {error.message || "This panel hit an unexpected error."}
        </p>
        <Button size="sm" onClick={() => this.setState({ error: null })}>
          Retry
        </Button>
      </div>
    );
  }
}
