import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Catches a crash anywhere in the app and shows a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-[#f6f4ee] px-5">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-3xl" aria-hidden="true">
            😕
          </p>
          <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-600">
            Kabisa hit a problem loading this page. Reloading usually fixes it. If it keeps happening, email{' '}
            <a href="mailto:feedback@kabisa.app" className="underline">
              feedback@kabisa.app
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-green-700 px-5 py-2 font-semibold text-white hover:bg-green-800"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
