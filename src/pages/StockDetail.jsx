import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { usePortfolio } from '../hooks/usePortfolio'
import { usePerformanceChart } from '../hooks/usePerformanceChart'
import { formatCurrency, formatPercent, formatPrice, formatPnL } from '../utils/formatters'
import useAppStore from '../store/useAppStore'
import { deletePosition } from '../services/firestore'
import { haptic } from '../utils/haptics'
import './StockDetail.css'

const TIME_FILTERS = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

// Mock chart data generator removed

export default function StockDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getEnrichedPositions, refresh } = usePortfolio()
  const currency = useAppStore(s => s.currency)
  const showToast = useAppStore(s => s.showToast)
  
  const [activeFilter, setActiveFilter] = useState('1M')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const position = useMemo(() => {
    return getEnrichedPositions().find(p => p.id === id)
  }, [id, getEnrichedPositions])

  const { chartData, isLoading: chartLoading } = usePerformanceChart(position?.id, activeFilter)

  useEffect(() => {
    if (!position) {
      // Si la posición no existe y no estamos cargando, volver atrás
      // Pero como getEnrichedPositions es síncrono, si es undefined, no existe
      navigate('/')
    }
  }, [position, navigate])

  if (!position) return null

  const {
    symbol, name, shares, averageCost, currentPrice,
    totalValue, totalCost, pnlAmount, pnlPercent, isGain, notes
  } = position

  const handleDelete = async () => {
    haptic.light()
    try {
      setIsDeleting(true)
      await deletePosition(id)
      haptic.medium()
      await refresh()
      showToast('Posición eliminada')
      navigate('/')
    } catch (error) {
      haptic.error()
      console.error(error)
      showToast('Error al eliminar', 'error')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <div className="page stock-detail">
      {/* Header */}
      <header className="detail-header">
        <button className="detail-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <div className="detail-header-title">
          <div className="detail-symbol">{symbol}</div>
          <div className="detail-name">{name || symbol}</div>
        </div>
        <button className="detail-edit-btn" onClick={() => navigate(`/add?edit=${id}`)}>
          <Edit2 size={20} />
        </button>
      </header>

      {/* Hero Price */}
      <section className="detail-hero">
        <div className="detail-price">
          {formatPrice(currentPrice, currency)}
        </div>
        <div className={`detail-change ${isGain ? 'gain' : 'loss'}`}>
          {isGain ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{formatPercent(pnlPercent)}</span>
          <span className="detail-change-amount">
            ({formatPnL(pnlAmount, currency)})
          </span>
        </div>
      </section>

      {/* Time Filters */}
      <div className="detail-time-filters">
        {TIME_FILTERS.map(f => (
          <button
            key={f}
            className={`detail-time-chip ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Chart */}
      <section className="detail-chart">
        {chartLoading ? (
          <div className="shimmer" style={{ width: '100%', height: 200, borderRadius: 16 }} />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isGain ? '#00b86b' : '#ff5252'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isGain ? '#00b86b' : '#ff5252'} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={isGain ? '#00b86b' : '#ff5252'}
                strokeWidth={2}
                fill="url(#detailGrad)"
                dot={false}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="detail-chart-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-on-surface-variant)', font: 'var(--font-body-sm)' }}>
            No hay suficientes datos históricos.
          </div>
        )}
      </section>

      {/* Position Metrics */}
      <section className="detail-metrics">
        <h3 className="detail-section-title">Tu Posición</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Acciones</div>
            <div className="metric-value">{shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Valor Total</div>
            <div className="metric-value">{formatCurrency(totalValue, currency)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Costo Promedio</div>
            <div className="metric-value">{formatPrice(averageCost, currency)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Costo Total</div>
            <div className="metric-value">{formatCurrency(totalCost, currency)}</div>
          </div>
          <div className="metric-card full-width">
            <div className="metric-label">Retorno Total (PnL)</div>
            <div className={`metric-value ${isGain ? 'gain' : 'loss'}`}>
              {formatPnL(pnlAmount, currency)} ({formatPercent(pnlPercent)})
            </div>
          </div>
        </div>
      </section>

      {/* Notes */}
      {notes && (
        <section className="detail-notes">
          <h3 className="detail-section-title">Notas</h3>
          <div className="notes-card">
            <p>{notes}</p>
          </div>
        </section>
      )}

      {/* Danger Zone */}
      <section className="detail-danger">
        <button 
          className="detail-delete-btn"
          onClick={() => {
            haptic.light()
            setShowDeleteModal(true)
          }}
        >
          <Trash2 size={18} />
          Eliminar Posición
        </button>
      </section>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="detail-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="detail-modal-header">
              <h3>Eliminar {symbol}</h3>
            </div>
            <div className="detail-modal-body">
              <p>¿Estás seguro de que querés eliminar esta posición? Esta acción no se puede deshacer y los datos se perderán para siempre.</p>
            </div>
            <div className="detail-modal-actions">
              <button 
                className="modal-cancel-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                className="modal-confirm-btn"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
