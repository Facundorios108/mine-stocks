import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { motion, useAnimation } from 'framer-motion'
import { formatPrice, formatPercent } from '../../utils/formatters'
import useAppStore from '../../store/useAppStore'
import { usePortfolio } from '../../hooks/usePortfolio'
import { haptic } from '../../utils/haptics'
import { deletePosition } from '../../services/firestore'
import ConfirmModal from '../common/ConfirmModal'
import './PositionCard.css'

// Generate a simple sparkline path
function generateSparklinePath(isGain, width = 60, height = 28) {
  const points = 12
  const data = []
  let val = height / 2
  for (let i = 0; i < points; i++) {
    val += (Math.random() - (isGain ? 0.4 : 0.6)) * (height * 0.2)
    val = Math.max(4, Math.min(height - 4, val))
    data.push(val)
  }
  // Ensure trend direction
  if (isGain) data[data.length - 1] = Math.min(data[0] - 4, height * 0.3)
  else data[data.length - 1] = Math.max(data[0] + 4, height * 0.7)

  const stepX = width / (points - 1)
  const pathParts = data.map((y, i) => {
    const x = i * stepX
    return i === 0 ? `M ${x},${y}` : `L ${x},${y}`
  })
  return pathParts.join(' ')
}

export default function PositionCard({ position, onSellClick }) {
  const navigate = useNavigate()
  const currency = useAppStore(s => s.currency)
  const controls = useAnimation()
  const [isOpen, setIsOpen] = useState(false)

  const {
    id, symbol, name, shares,
    currentPrice, cost, pnlPercent,
    isGain, quoteLoaded
  } = position

  const isClosed = shares <= 0
  const sparklinePath = useMemo(() => generateSparklinePath(isGain), [isGain])
  const { deletePositionBySymbol } = usePortfolio()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleOnDelete = async () => {
    setShowConfirm(false)
    setIsDeleting(true)
    haptic.heavy()
    
    try {
      await deletePositionBySymbol(symbol)
      useAppStore.getState().showToast(`Posición ${symbol} eliminada`)
    } catch (error) {
      console.error('Error deleting position:', error)
      useAppStore.getState().showToast('Error al eliminar la posición', 'error')
      controls.start({ x: 0 })
      setIsOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Swipe thresholds for two buttons (80px each = 160px total)
    const swipeOpenThreshold = -40;
    const fullOpenThreshold = -120;
    
    if (offset < fullOpenThreshold || velocity < -500) {
      // Reveal both buttons
      setIsOpen(true)
      controls.start({ x: -160, transition: { type: 'spring', damping: 20, stiffness: 200 } })
      haptic.medium()
    } else if (offset < swipeOpenThreshold || velocity < -200) {
      // Reveal at least one button
      setIsOpen(true)
      controls.start({ x: -80, transition: { type: 'spring', damping: 20, stiffness: 200 } })
      haptic.light()
    } else {
      // Snap back
      setIsOpen(false)
      controls.start({ x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } })
    }
  }

  return (
    <div className="swipe-container">
      <div className="swipe-action-bg">
        <button 
          className="swipe-action-btn sell"
          onClick={(e) => {
            e.stopPropagation()
            haptic.light()
            controls.start({ x: 0 })
            setIsOpen(false)
            onSellClick?.()
          }}
        >
          <DollarSign size={22} />
          <span>Vender</span>
        </button>
        <button 
          className="swipe-action-btn delete"
          onClick={(e) => {
            e.stopPropagation()
            setShowConfirm(true)
          }}
          disabled={isDeleting}
        >
          <TrendingDown size={22} style={{ transform: 'rotate(90deg)' }} />
          <span>Eliminar</span>
        </button>
      </div>

      <motion.div
        className={`position-card ${isClosed ? 'closed' : ''}`}
        drag="x"
        dragConstraints={{ right: 0, left: -200 }}
        dragElastic={0.1}
        animate={controls}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          // If swiped open, click closes it
          if (isOpen) {
            e.stopPropagation()
            controls.start({ x: 0 })
            setIsOpen(false)
          } else {
            // Normal click goes to detail
            navigate(`/stock/${id}`)
          }
        }}
        id={`position-${symbol}`}
        role="button"
        tabIndex={0}
      >
        {/* Avatar */}
        <div className="position-avatar">
          <span>{symbol?.slice(0, 1)}</span>
        </div>

        {/* Info */}
        <div className="position-info">
          <div className="position-symbol-row">
            <span className="position-symbol">{symbol}</span>
            {isClosed && <span className="closed-badge">Cerrada</span>}
          </div>
          <div className="position-name">{name || symbol}</div>
          <div className="position-invested">
            Invertido: {formatPrice(cost, currency)}
          </div>
        </div>

        {/* Sparkline */}
        <div className="position-sparkline">
          {quoteLoaded && !isClosed ? (
            <svg width="60" height="28" viewBox="0 0 60 28" fill="none">
              <path
                d={sparklinePath}
                stroke={isGain ? 'var(--color-gain)' : 'var(--color-loss)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          ) : quoteLoaded && isClosed ? (
            <div className="closed-status">HISTORIAL</div>
          ) : (
            <div className="shimmer" style={{ width: 60, height: 28, borderRadius: 6 }} />
          )}
        </div>

        {/* Price & Change */}
        <div className="position-right">
          {quoteLoaded ? (
            <>
              <div className="position-price">
                {isClosed ? '0.00' : formatPrice(currentPrice, currency)}
              </div>
              <div className={`position-change ${isGain ? 'gain' : 'loss'}`}>
                {formatPercent(pnlPercent)}
              </div>
            </>
          ) : (
            <div className="position-loading">
              <div className="shimmer" style={{ width: 70, height: 16, marginBottom: 4 }} />
              <div className="shimmer" style={{ width: 50, height: 14 }} />
            </div>
          )}
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false)
          controls.start({ x: 0 })
          setIsOpen(false)
        }}
        onConfirm={handleOnDelete}
        title="Eliminar Posición"
        message={`¿Estás seguro de que quieres eliminar ${symbol}? Se borrarán todas las transacciones asociadas y no quedará registro.`}
        confirmText="Eliminar todo"
        type="danger"
      />
    </div>
  )
}
