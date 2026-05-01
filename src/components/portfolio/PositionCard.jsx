import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatPrice, formatPercent } from '../../utils/formatters'
import useAppStore from '../../store/useAppStore'
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

  const {
    id, symbol, name,
    currentPrice, pnlPercent,
    changePercent, isGain, quoteLoaded
  } = position

  const sparklinePath = useMemo(() => generateSparklinePath(isGain), [isGain])

  return (
    <div
      className="position-card"
      onClick={() => navigate(`/stock/${id}`)}
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
  )
}
