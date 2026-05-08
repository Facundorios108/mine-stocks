import { useState } from 'react'
import { LogOut, User as UserIcon, Settings, Shield, Bell, DollarSign, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import useAppStore from '../store/useAppStore'
import { haptic } from '../utils/haptics'
import PageTransition from '../components/common/PageTransition'
import './Profile.css'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { currency, toggleCurrency } = useAppStore()

  const handleLogout = async () => {
    haptic.light()
    try {
      await signOut()
    } catch (error) {
      haptic.error()
      console.error(error)
    }
  }

  const handleToggleCurrency = () => {
    haptic.light()
    toggleCurrency()
  }

  const firstName = user?.displayName?.split(' ')[0] || 'Inversor'

  return (
    <PageTransition>
    <div className="page profile-page">
      {/* Hero */}
      <section className="profile-hero">
        <div className="profile-avatar">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" />
          ) : (
            <UserIcon size={32} />
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user?.displayName || 'Mi Perfil'}</h1>
          <div className="profile-email">{user?.email}</div>
        </div>
      </section>

      {/* Currency Toggle */}
      <section className="profile-section">
        <h2 className="profile-section-title">Visualización del Portafolio</h2>
        <div className="profile-option-group">
          <div className="profile-option currency-toggle-row">
            <div className="profile-option-left">
              <div className="icon-wrapper glass">
                <DollarSign size={18} />
              </div>
              <span>Moneda Base</span>
            </div>
            
            <div className="currency-slider" onClick={handleToggleCurrency}>
              <div className={`currency-slider-track ${currency === 'ARS' ? 'is-ars' : ''}`}>
                <span className="currency-label usd">USD</span>
                <span className="currency-label ars">ARS</span>
                <div className="currency-slider-thumb" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Settings Options */}
      <section className="profile-section">
        <h2 className="profile-section-title">Ajustes</h2>
        <div className="profile-option-group">
          <button className="profile-option">
            <div className="profile-option-left">
              <div className="icon-wrapper glass">
                <Bell size={18} />
              </div>
              <span>Notificaciones</span>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </button>
          <button className="profile-option">
            <div className="profile-option-left">
              <div className="icon-wrapper glass">
                <Shield size={18} />
              </div>
              <span>Seguridad</span>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </button>
          <button className="profile-option">
            <div className="profile-option-left">
              <div className="icon-wrapper glass">
                <Settings size={18} />
              </div>
              <span>Preferencias</span>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="profile-section logout-section">
        <button className="profile-logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </section>
    </div>
    </PageTransition>
  )
}
