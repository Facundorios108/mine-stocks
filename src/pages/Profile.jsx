import { useState } from 'react'
import { LogOut, User as UserIcon, Settings, Shield, Bell } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import useAppStore from '../store/useAppStore'
import './Placeholder.css'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { currency, setCurrency } = useAppStore()
  const [activeTab, setActiveTab] = useState('Dólares') // Dólares, Opciones

  const DOLLAR_TYPES = [
    { id: 'USD', name: 'Dólar Oficial', desc: 'Cotización BNA' },
    { id: 'Blue', name: 'Dólar Blue', desc: 'Cotización Informal' },
    { id: 'MEP', name: 'Dólar MEP', desc: 'Mercado Electrónico' },
    { id: 'CCL', name: 'Dólar CCL', desc: 'Contado con Liqui' }
  ]

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error(error)
    }
  }

  const firstName = user?.displayName?.split(' ')[0] || 'Inversor'

  return (
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
        <h1 className="profile-name">{user?.displayName || 'Mi Perfil'}</h1>
        <div className="profile-email">{user?.email}</div>
      </section>

      {/* Settings Options */}
      <section className="profile-section">
        <h2 className="profile-section-title">Ajustes Generales</h2>
        <div className="profile-option-group">
          <button className="profile-option">
            <Bell size={20} />
            <span>Notificaciones</span>
          </button>
          <button className="profile-option">
            <Shield size={20} />
            <span>Seguridad</span>
          </button>
          <button className="profile-option">
            <Settings size={20} />
            <span>Preferencias</span>
          </button>
        </div>
      </section>

      {/* Currency Preferences */}
      <section className="profile-section">
        <h2 className="profile-section-title">Moneda Base</h2>
        <div className="profile-option-group" style={{ marginBottom: '16px' }}>
          <button 
            className={`profile-option ${activeTab === 'Dólares' ? 'selected' : ''}`}
            onClick={() => setActiveTab('Dólares')}
          >
            Dólares
          </button>
          <button 
            className={`profile-option ${activeTab === 'Pesos' ? 'selected' : ''}`}
            onClick={() => {
              setActiveTab('Pesos')
              setCurrency('ARS')
            }}
          >
            Pesos (ARS)
          </button>
        </div>

        {activeTab === 'Dólares' && (
          <div className="profile-dollar-list">
            {DOLLAR_TYPES.map(type => (
              <button
                key={type.id}
                className={`profile-dollar-item ${currency === type.id ? 'selected' : ''}`}
                onClick={() => setCurrency(type.id)}
              >
                <div>
                  <div className="profile-dollar-label">{type.name}</div>
                  <div className="profile-dollar-desc">{type.desc}</div>
                </div>
                {currency === type.id && <div className="profile-dollar-check">✓</div>}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="profile-section" style={{ marginTop: '32px' }}>
        <button className="profile-logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </section>
    </div>
  )
}
