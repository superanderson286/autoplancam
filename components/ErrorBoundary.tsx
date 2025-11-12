"use client";

import React from "react";
import { useRouter } from "next/navigation";

type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // Send client-side error info to the server for debugging
    try {
      if (typeof window !== 'undefined') {
        navigator.sendBeacon?.('/api/client-error', JSON.stringify({ error: String(error), info, url: window.location.href, userAgent: navigator.userAgent }));
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line no-console
    console.error('Captured error in ErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p className="mt-2">An unexpected error occurred. We've captured the details for investigation.</p>
          <button className="mt-4 rounded bg-sky-600 px-3 py-2 text-white" onClick={() => location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
