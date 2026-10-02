import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
            Algo salió mal. Recarga la página para intentar de nuevo.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
