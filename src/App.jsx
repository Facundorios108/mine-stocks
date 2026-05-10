import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import BottomNav from './components/layout/BottomNav'
import ErrorBoundary from './components/common/ErrorBoundary'
import InstallBanner from './components/common/InstallBanner'
import useAppStore from './store/useAppStore'
import { TrendingUp, Loader2 } from 'lucide-react'
import './styles/globals.css'

// Lazy load pages for better initial load performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const StockDetail = lazy(() => import('./pages/StockDetail'))
const AddPosition = lazy(() => import('./pages/AddPosition'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Search = lazy(() => import('./pages/Search'))
const Profile = lazy(() => import('./pages/Profile'))
const Login = lazy(() => import('./pages/Login'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30000
    }
  }
})

// Loading fallback for Suspense
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      backgroundColor: 'var(--color-background)'
    }}>
      <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)' }} />
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stock/:id" element={<StockDetail />} />
        <Route path="/add" element={<AddPosition />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/search" element={<Search />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function AppContent() {
  const { user, isAuthLoading } = useAuth()
  const toast = useAppStore(s => s.toast)
  const [showSplash, setShowSplash] = useState(true)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  useEffect(() => {
    if (!isAuthLoading) {
      setIsAnimatingOut(true)
      const timer = setTimeout(() => {
        setShowSplash(false)
      }, 850) // 0.4s delay + 0.4s background fade out + 50ms buffer
      return () => clearTimeout(timer)
    }
  }, [isAuthLoading])

  return (
    <div className="app-shell">
      {/* Splash Screen Overlay */}
      {showSplash && (
        <div 
          className={`app-shell ${isAnimatingOut ? 'splash-fade-out' : ''}`} 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'var(--color-background)'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div 
              className={isAnimatingOut ? 'splash-logo-animate-out' : ''}
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'white',
                animation: isAnimatingOut ? 'none' : 'logoPulse 2s ease-in-out infinite'
              }}
            >
              <TrendingUp size={28} />
            </div>
            <div 
              className={isAnimatingOut ? 'splash-text-animate-out' : ''}
              style={{
                font: 'var(--font-title-lg)',
                color: 'var(--color-on-surface)',
                letterSpacing: 'var(--tracking-tight)'
              }}
            >
              Mine Stocks
            </div>
          </div>
        </div>
      )}

      {/* Main App Content underneath */}
      {!user ? (
        <Suspense fallback={<PageLoader />}>
          <Login />
        </Suspense>
      ) : (
        <>
          <Suspense fallback={<PageLoader />}>
            <AnimatedRoutes />
          </Suspense>
          <BottomNav />
          <InstallBanner />
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type} visible`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
