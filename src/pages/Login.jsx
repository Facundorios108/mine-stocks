import { useState } from 'react'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services/auth'
import { haptic } from '../utils/haptics'
import { TrendingUp, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import './Login.css'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    haptic.light()
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      haptic.success()
    } catch (err) {
      haptic.error()
      setError('Error al iniciar con Google. Intentá de nuevo.')
      console.error(err)
    }
    setLoading(false)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    haptic.light()
    if (!email || !password) {
      haptic.error()
      return
    }

    setLoading(true)
    setError('')
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name)
      } else {
        await signInWithEmail(email, password)
      }
      haptic.success()
    } catch (err) {
      haptic.error()
      const errorMessages = {
        'auth/user-not-found': 'No existe una cuenta con ese email.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/invalid-email': 'Email inválido.',
        'auth/invalid-credential': 'Credenciales inválidas. Verificá email y contraseña.'
      }
      setError(errorMessages[err.code] || 'Error al iniciar sesión. Intentá de nuevo.')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-bg-gradient" />

      <div className="login-content">
        {/* Hero */}
        <div className="login-hero">
          <div className="login-logo">
            <div className="login-logo-icon">
              <TrendingUp size={32} strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="login-title">Mine Stocks</h1>
          <p className="login-subtitle">
            Tu portafolio de inversiones,<br />siempre a mano.
          </p>
        </div>

        {/* Google Sign In */}
        <button
          className="login-google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          id="btn-google-login"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Divider */}
        <div className="login-divider">
          <span>o</span>
        </div>

        {/* Email/Password Form */}
        <form className="login-form" onSubmit={handleEmailSubmit}>
          {isSignUp && (
            <div className="login-field">
              <div className="login-field-icon">
                <User size={18} />
              </div>
              <input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                id="input-name"
              />
            </div>
          )}

          <div className="login-field">
            <div className="login-field-icon">
              <Mail size={18} />
            </div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="input-email"
            />
          </div>

          <div className="login-field">
            <div className="login-field-icon">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              id="input-password"
            />
            <button
              type="button"
              className="login-field-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
            id="btn-email-login"
          >
            <span>{loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="login-toggle">
          <span>{isSignUp ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}</span>
          <button
            onClick={() => {
              haptic.light()
              setIsSignUp(!isSignUp)
              setError('')
            }}
            id="btn-toggle-auth"
          >
            {isSignUp ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}
