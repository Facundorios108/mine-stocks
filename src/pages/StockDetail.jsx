import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, X } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { usePortfolio } from '../hooks/usePortfolio'
import { usePerformanceChart } from '../hooks/usePerformanceChart'
import { formatCurrency, formatPercent, formatPrice, formatPnL } from '../utils/formatters'
import useAppStore from '../store/useAppStore'
import { deletePosition } from '../services/firestore'
import { haptic } from '../utils/haptics'
import PageTransition from '../components/common/PageTransition'
import SellModal from '../components/portfolio/SellModal'
import './StockDetail.css'

const TIME_FILTERS = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

export default function StockDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getEnrichedPositions, refresh } = usePortfolio()
  const currency = useAppStore(s => s.currency)
  const showToast = useAppStore(s => s.showToast)
  
  const [activeFilter, setActiveFilter] = useState('1M')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const position = useMemo(() => {
    return getEnrichedPositions().find(p => p.id === id)
  }, [id, getEnrichedPositions])

  const { chartData, isLoading: chartLoading, isSynthetic } = usePerformanceChart(position?.id, activeFilter)

  useEffect(() => {
    if (!position) {
      navigate('/')
    }
  }, [position, navigate])

  if (!position) return null

  const {
    symbol, name, shares, averageCost, currentPrice,
    totalValue, totalCost, pnlAmount, pnlPercent, isGain, notes
  } = position

  const user = useAppStore(s => s.user)

  const handleDelete = async () => {
    haptic.light()
    try {
      setIsDeleting(true)
      
      // Fire and forget
      deletePosition(user.uid, id)
      
      // Optimistic UI update
      const currentPositions = useAppStore.getState().positions
      useAppStore.getState().setPositions(currentPositions.filter(p => p.id !== id))
      
      haptic.medium()
      refresh()
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
    <PageTransition>
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
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isGain ? '#00b86b' : '#ff5252'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isGain ? '#00b86b' : '#ff5252'} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="dash-chart-tooltip" style={{
                          background: '#1a1d24',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: '500',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}>
                          {formatCurrency(payload[0].value, currency)}
                        </div>
                      )
                    }
                    return null
                  }}
                  cursor={{ stroke: isGain ? '#00b86b' : '#ff5252', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke={isGain ? '#00b86b' : '#ff5252'}
                  strokeWidth={2}
                  fill="url(#detailGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: isGain ? '#00b86b' : '#ff5252' }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
            {isSynthetic && (
              <div style={{
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                marginTop: '8px',
                opacity: 0.7
              }}>
                Datos estimados (históricos no disponibles)
              </div>
            )}
          </>
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

      {/* Transaction History */}
      <section className="detail-transactions">
        <h3 className="detail-section-title">Historial de Transacciones</h3>
        {position.transactions && position.transactions.length > 0 ? (
          <div className="transactions-list">
            {[...position.transactions]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((tx, idx) => (
              <div key={tx.id || idx} className="transaction-card">
                <div className="transaction-info">
                  <div className={`transaction-type ${tx.type}`}>
                    {tx.type === 'buy' ? 'Compra' : 'Venta'}
                  </div>
                  <div className="transaction-date">
                    {new Date(tx.date).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <div className="transaction-details">
                  <div className="transaction-shares">
                    {tx.shares} acciones
                  </div>
                  <div className="transaction-price">
                    a {formatCurrency(tx.price, currency)} c/u
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="notes-card" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
            <p>No hay historial de transacciones detallado para esta posición.</p>
          </div>
        )}
      </section>

      {/* Actions Zone */}
      <section className="detail-actions-zone">
        <button 
          className="detail-sell-btn"
          onClick={() => {
            haptic.light()
            setShowSellModal(true)
          }}
          disabled={shares <= 0}
        >
          <DollarSign size={18} />
          Vender
        </button>
        
        <button 
          className="detail-delete-btn outline"
          onClick={() => {
            haptic.light()
            setShowDeleteModal(true)
          }}
        >
          <Trash2 size={18} />
          Eliminar
        </button>
      </section>

      {/* Modals */}
      <SellModal 
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
        position={position}
        onSold={() => refresh()}
      />

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div 
              className="modal-content glass"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '400px' }}
            >
              <div className="modal-header">
                <div className="modal-title-group">
                  <h3 className="modal-title" style={{ color: 'var(--color-error)' }}>Eliminar {symbol}</h3>
                  <p className="modal-subtitle">Esta acción no se puede deshacer</p>
                </div>
                <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ font: 'var(--font-body-md)', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                  ¿Estás seguro de que querés eliminar esta posición? Se borrará todo el historial y no se sumará dinero a tu efectivo.
                </p>
              </div>

              <div className="modal-footer">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </PageTransition>
  )
}
