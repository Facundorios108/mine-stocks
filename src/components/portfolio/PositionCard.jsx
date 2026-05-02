import { useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { formatPrice, formatPercent } from '../../utils/formatters'
import useAppStore from '../../store/useAppStore'
import { deletePosition } from '../../services/firestore'
import { usePortfolio } from '../../hooks/usePortfolio'
import { haptic } from '../../utils/haptics'
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

export default function PositionCard({ position }) {
  const navigate = useNavigate()
  const currency = useAppStore(s => s.currency)
  const showToast = useAppStore(s => s.showToast)
  const { refresh } = usePortfolio()

  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartRef = useRef(null)

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartRef.current
    if (diff < 0) {
      // Swiping left only
      setSwipeOffset(Math.max(-100, diff))
    } else {
      setSwipeOffset(0)
    }
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)
    if (swipeOffset < -50) {
      setSwipeOffset(-80) // snap to open
      haptic.medium()
    } else {
      setSwipeOffset(0) // snap back
    }
    touchStartRef.current = null
  }

  const {
    id, symbol, name,
    currentPrice, pnlPercent,
    changePercent, isGain, quoteLoaded
  } = position

  const sparklinePath = useMemo(() => generateSparklinePath(isGain), [isGain])

  return (
    <div className="swipe-container">
      <div className="swipe-action-bg">
        <button 
          className="swipe-action-btn"
          onClick={async (e) => {
            e.stopPropagation()
            haptic.light()
            if (window.confirm(`¿Estás seguro de que querés eliminar ${symbol}?`)) {
              try {
                await deletePosition(id)
                haptic.medium()
                showToast('Posición eliminada')
                await refresh()
              } catch (error) {
                console.error(error)
                showToast('Error al eliminar', 'error')
                haptic.error()
              }
            } else {
              setSwipeOffset(0)
            }
          }}
        >
          <Trash2 size={24} />
        </button>
      </div>

      <div
        className={`position-card ${isSwiping ? 'is-swiping' : ''}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onClick={() => {
          if (swipeOffset === 0) navigate(`/stock/${id}`)
          else setSwipeOffset(0)
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
        <div className="position-symbol">{symbol}</div>
        <div className="position-name">{name || symbol}</div>
      </div>

      {/* Sparkline */}
      <div className="position-sparkline">
        {quoteLoaded ? (
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
        ) : (
          <div className="shimmer" style={{ width: 60, height: 28, borderRadius: 6 }} />
        )}
      </div>

      {/* Price & Change */}
      <div className="position-right">
        {quoteLoaded ? (
          <>
            <div className="position-price">
              {formatPrice(currentPrice, currency)}
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
    </div>
    </div>
  )
}
