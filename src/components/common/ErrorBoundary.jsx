import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import './ErrorBoundary.css'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">
              <AlertTriangle size={64} strokeWidth={1.5} />
            </div>
            
            <h1 className="error-title">¡Oops! Algo salió mal</h1>
            <p className="error-message">
              La aplicación encontró un error inesperado.
              <br />
              Intentá recargar la página o volver al inicio.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Detalles del error (solo en desarrollo)</summary>
                <pre className="error-stack">
                  <code>
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </code>
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button className="error-btn primary" onClick={this.handleReload}>
                <RefreshCw size={18} />
                Recargar página
              </button>
              <button className="error-btn secondary" onClick={this.handleGoHome}>
                <Home size={18} />
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
