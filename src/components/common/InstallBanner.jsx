import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { haptic } from '../../utils/haptics'
import './InstallBanner.css'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true)

  useEffect(() => {
    // Check if already installed or running in standalone
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    setIsStandalone(isPWA)

    if (isPWA) return

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(isIOSDevice)

    // Listen for the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Check if user dismissed it previously
      const hasDismissed = localStorage.getItem('pwa_install_dismissed')
      if (!hasDismissed) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show for iOS manually if not dismissed
    if (isIOSDevice) {
      const hasDismissed = localStorage.getItem('pwa_install_dismissed')
      if (!hasDismissed) {
        setShowBanner(true)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    haptic.light()
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setShowBanner(false)
      }
    }
  }

  const handleDismiss = () => {
    haptic.light()
    setShowBanner(false)
    localStorage.setItem('pwa_install_dismissed', 'true')
  }

  if (!showBanner || isStandalone) return null

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <div className="install-banner-icon">
          <Download size={24} strokeWidth={1.5} />
        </div>
        <div className="install-banner-text">
          <h4>Instalar App</h4>
          <div className="install-ios-instructions">
            {isIOS ? (
              <p>
                Tocá el ícono de <b>Compartir</b> en tu navegador y elegí <b>"Agregar a inicio"</b>.
              </p>
            ) : (
              <p>Agregá Mine Stocks a tu pantalla de inicio.</p>
            )}
          </div>
        </div>
      </div>
      <div className="install-banner-actions">
        {!isIOS && (
          <button className="install-btn-primary" onClick={handleInstallClick}>
            Instalar
          </button>
        )}
        <button className="install-btn-close" onClick={handleDismiss}>
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
