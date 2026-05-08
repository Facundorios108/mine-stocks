import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, PlusCircle, Briefcase, User } from 'lucide-react'
import { haptic } from '../../utils/haptics'
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
            onClick={() => haptic.light()}
            className={`nav-item ${isActive ? 'active' : ''} ${isAction ? 'nav-action' : ''}`}
            id={`nav-${label.toLowerCase() || 'add'}`}
            style={{ position: 'relative' }}
          >
            {isActive && !isAction && (
              <motion.div
                layoutId="nav-pill"
                className="nav-active-pill"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {isAction ? (
              <motion.div className="nav-action-btn" whileTap={{ scale: 0.9 }}>
                <Icon size={24} strokeWidth={2.5} />
              </motion.div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="nav-icon-wrapper">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="nav-label">{label}</span>
              </div>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
