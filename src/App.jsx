import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'
import AddPosition from './pages/AddPosition'
import Portfolio from './pages/Portfolio'
import Search from './pages/Search'
import Profile from './pages/Profile'
import Login from './pages/Login'
import useAppStore from './store/useAppStore'
import { TrendingUp } from 'lucide-react'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30000
    }
  }
})

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
        <Login />
      ) : (
        <>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stock/:id" element={<StockDetail />} />
            <Route path="/add" element={<AddPosition />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BottomNav />
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
