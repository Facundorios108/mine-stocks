import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, PlusCircle, Briefcase, User } from 'lucide-react'
import './BottomNav.css'

const navItems = [
  { path: '/', icon: Home, label: 'HOME' },
  { path: '/search', icon: Search, label: 'SEARCH' },
  { path: '/add', icon: PlusCircle, label: '', isAction: true },
  { path: '/portfolio', icon: Briefcase, label: 'PORTFOLIO' },
  { path: '/profile', icon: User, label: 'PROFILE' }
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="bottom-nav glass" id="bottom-nav">
      {navItems.map(({ path, icon: Icon, label, isAction }) => {
        const isActive = location.pathname === path

        return (
          <NavLink
            key={path}
            to={path}
            className={`nav-item ${isActive ? 'active' : ''} ${isAction ? 'nav-action' : ''}`}
            id={`nav-${label.toLowerCase() || 'add'}`}
          >
            {isAction ? (
              <div className="nav-action-btn">
                <Icon size={24} strokeWidth={2.5} />
              </div>
            ) : (
              <>
                <div className="nav-icon-wrapper">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && <div className="nav-indicator" />}
                </div>
                <span className="nav-label">{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
