import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, TrendingUp, TrendingDown, Plus, ChevronRight } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { usePortfolio } from '../hooks/usePortfolio'
import { usePerformanceChart } from '../hooks/usePerformanceChart'
import PositionCard from '../components/portfolio/PositionCard'
import { formatCurrency, formatPercent, formatPnL } from '../utils/formatters'
import useAppStore from '../store/useAppStore'
import './Dashboard.css'

const TIME_FILTERS = ['1W', '1M', '3M', '6M', '1Y', 'ALL']

// Mock generator removed in favor of usePerformanceChart

export default function Dashboard() {
  const navigate = useNavigate()
  const currency = useAppStore(s => s.currency)
  const user = useAppStore(s => s.user)
  const [activeFilter, setActiveFilter] = useState('1M')

  const {
    isLoading,
    getPortfolioValue,
    getEnrichedPositions,
    error,
    refresh
  } = usePortfolio()

  const portfolio = getPortfolioValue()
  const enrichedPositions = getEnrichedPositions()
  const isGain = portfolio.totalPnL >= 0

  const { chartData, isLoading: chartLoading } = usePerformanceChart(null, activeFilter)

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const firstName = user?.displayName?.split(' ')[0] || 'Inversor'

  return (
    <div className="page dashboard">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" />
            ) : (
              <span>{firstName[0]}</span>
            )}
          </div>
          <span className="dash-greeting">{greeting()}, {firstName}</span>
        </div>
        <button className="dash-notification-btn" id="btn-notifications">
          <Bell size={20} strokeWidth={1.8} />
          <div className="dash-notif-dot" />
        </button>
      </header>

      {/* Balance Hero */}
      <section className="dash-hero" id="portfolio-summary">
        <div className="dash-hero-label">TOTAL BALANCE</div>
        <div className="dash-hero-value">
          {isLoading ? (
            <div className="shimmer" style={{ width: 220, height: 48, borderRadius: 12 }} />
          ) : (
            <>
              {formatCurrency(portfolio.totalValue, currency)}
              <span className="dash-hero-currency"> {currency}</span>
            </>
          )}
        </div>
        {!isLoading && portfolio.positionCount > 0 && (
          <div className={`dash-hero-change ${isGain ? 'gain' : 'loss'}`}>
            {isGain ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{formatPercent(portfolio.totalPnLPercent)}</span>
            <span className="dash-hero-change-amount">
              ({formatPnL(portfolio.totalPnL, currency)}) this month
            </span>
          </div>
        )}
      </section>

      {/* Time Filters */}
      {portfolio.positionCount > 0 && (
        <div className="dash-time-filters">
          {TIME_FILTERS.map(f => (
            <button
              key={f}
              className={`dash-time-chip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Portfolio Chart */}
      <section className="dash-chart">
        {chartLoading ? (
          <div className="dash-skeleton-chart">
            <div className="shimmer" style={{ width: '100%', height: 160, borderRadius: 16 }} />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isGain ? '#00b86b' : '#ff5252'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isGain ? '#00b86b' : '#ff5252'} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Area
                type="monotone"
                dataKey="v"
                stroke={isGain ? '#00b86b' : '#ff5252'}
                strokeWidth={2}
                fill="url(#chartGrad)"
                dot={false}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="dash-chart-empty">
            <p>No hay datos suficientes para el período seleccionado.</p>
          </div>
        )}
      </section>

      {/* Positions List */}
      <section className="dash-positions">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Mis Posiciones</h2>
          {enrichedPositions.length > 0 && (
            <button className="dash-see-all" onClick={() => navigate('/portfolio')}>
              Ver todas <ChevronRight size={14} />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="dash-skeleton-list">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="dash-skeleton-card">
                <div className="dash-skeleton-left">
                  <div className="shimmer" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                  <div>
                    <div className="shimmer" style={{ width: 60, height: 16, marginBottom: 4 }} />
                    <div className="shimmer" style={{ width: 100, height: 12 }} />
                  </div>
                </div>
                <div className="shimmer" style={{ width: 50, height: 32, borderRadius: 8 }} />
                <div className="dash-skeleton-right">
                  <div className="shimmer" style={{ width: 70, height: 16, marginBottom: 4 }} />
                  <div className="shimmer" style={{ width: 50, height: 14 }} />
                </div>
              </div>
            ))}
          </div>
        ) : enrichedPositions.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">
              <TrendingUp size={48} strokeWidth={1} />
            </div>
            <h3>Tu portafolio está vacío</h3>
            <p>Agregá tu primera posición para comenzar a trackear tus inversiones.</p>
            <button
              className="dash-empty-btn"
              onClick={() => navigate('/add')}
              id="btn-add-first-position"
            >
              <Plus size={18} />
              <span>Agregar posición</span>
            </button>
          </div>
        ) : (
          <div className="dash-position-list">
            {enrichedPositions.slice(0, 5).map(pos => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="dash-error">
          <p>Error cargando datos. Intentá de nuevo.</p>
          <button onClick={refresh}>Reintentar</button>
        </div>
      )}
    </div>
  )
}
