import React from 'react';

/**
 * ErrorBoundary — catches render-time exceptions thrown anywhere in the tree
 * and renders a graceful fallback instead of going blank.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught a render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#070707',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            padding: '40px 24px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'rgba(255,107,0,0.7)',
              fontWeight: 500,
            }}
          >
            NEXEVENT // SYSTEM EXCEPTION
          </span>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Unexpected Error
          </h1>

          <p
            style={{
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.45)',
              maxWidth: '480px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            A runtime exception was intercepted. The application cannot continue
            rendering this view. Reload to recover.
          </p>

          {this.state.error && (
            <pre
              style={{
                fontSize: '0.65rem',
                color: 'rgba(255,107,0,0.5)',
                background: 'rgba(255,107,0,0.04)',
                border: '1px solid rgba(255,107,0,0.12)',
                padding: '12px 16px',
                maxWidth: '560px',
                width: '100%',
                overflowX: 'auto',
                textAlign: 'left',
                letterSpacing: '0.05em',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleReload}
            style={{
              marginTop: '8px',
              padding: '10px 28px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
