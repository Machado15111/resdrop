import { Component } from 'react';
import './ErrorBoundary.css';

/**
 * Keeps one broken screen from taking the whole app down.
 *
 * React unmounts the ENTIRE tree when a render throws and nothing catches it.
 * That is how a single `loyaltyPrograms.map is not a function` on /account
 * turned into a blank white page across the product — no header, no way back,
 * nothing to report.
 *
 * Placed around the routed area, so the header and navigation survive and the
 * traveller can simply go somewhere else. The message shows what broke, in
 * plain words plus the raw error, because "algo deu errado" with no detail
 * makes a support conversation impossible.
 *
 * A class is required: there is no hook equivalent of componentDidCatch.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept in the console for the browser's own error reporting, and so a
    // screenshot of the console carries the stack.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // A navigation is a fresh chance: clear the error when the route changes,
    // otherwise the boundary would hold its broken state forever.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    let pt = true;
    try { pt = (localStorage.getItem('resdrop-lang') || 'pt') === 'pt'; } catch { /* private mode */ }

    return (
      <div className="eb-wrap">
        <div className="eb-card">
          <div className="eb-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
            </svg>
          </div>
          <h2>{pt ? 'Esta tela não carregou' : 'This screen did not load'}</h2>
          <p>
            {pt
              ? 'O resto do app continua funcionando — use o menu acima para ir a outra página. Suas reservas e alertas não foram afetados.'
              : 'The rest of the app still works — use the menu above to go elsewhere. Your bookings and watches are unaffected.'}
          </p>

          <div className="eb-actions">
            <button className="btn-primary" onClick={() => window.location.reload()}>
              {pt ? 'Recarregar' : 'Reload'}
            </button>
            <a className="btn-secondary" href="/dashboard">
              {pt ? 'Ir para o Painel' : 'Go to the dashboard'}
            </a>
          </div>

          <details className="eb-details">
            <summary>{pt ? 'Detalhes técnicos' : 'Technical details'}</summary>
            <code>{String(error?.message || error)}</code>
          </details>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
