import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, TrendingUp, TrendingDown, Plus, ChevronRight } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { usePortfolio } from '../hooks/usePortfolio'
import { usePerformanceChart } from '../hooks/usePerformanceChart'
import PositionCard from '../components/portfolio/PositionCard'
import PullToRefresh from '../components/common/PullToRefresh'
import PageTransition, { staggerContainer, staggerItem } from '../components/common/PageTransition'
import AnimatedCounter from '../components/common/AnimatedCounter'
import { formatCurrency, formatPercent, formatPnL } from '../utils/formatters'
import useAppStore from '../store/useAppStore'
import './Dashboard.css'

const TIME_FILTERS = ['1W', '1M', '3M', '6M', '1Y', 'ALL']

// Fade-in variant for content replacing shimmer
const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const currency = useAppStore(s => s.currency)
  const user = useAppStore(s => s.user)
  const [activeFilter, setActiveFilter] = useState('1M')

  const {
    isLoading,
    quotesLoading,
    getPortfolioValue,
    getEnrichedPositions,
    error,
    refresh
  } = usePortfolio()

  const portfolio = getPortfolioValue()
  const enrichedPositions = getEnrichedPositions()
  const isGain = portfolio.totalPnL >= 0
  const balanceReady = !isLoading && !quotesLoading

  const { chartData, isLoading: chartLoading } = usePerformanceChart(null, activeFilter)

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const firstName = user?.displayName?.split(' ')[0] || 'Inversor'

  // Memoize formatter to avoid re-creating on every render
  const balanceFormatter = useCallback((v) => formatCurrency(v, currency), [currency])
  const pnlFormatter = useCallback((v) => formatPnL(v, currency), [currency])

  return (
    <PageTransition>
    <PullToRefresh onRefresh={refresh}>
      <div className="page dashboard">
        {/* Header */}
      <motion.header 
        className="dash-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
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
      </motion.header>

      {/* Balance Hero */}
      <section className="dash-hero" id="portfolio-summary">
        <div className="dash-hero-label">TOTAL BALANCE</div>
        <div className="dash-hero-value">
          <AnimatePresence mode="wait">
            {!balanceReady ? (
              <motion.div
                key="shimmer-balance"
                className="shimmer"
                style={{ width: 220, height: 48, borderRadius: 12 }}
                {...fadeIn}
              />
            ) : (
              <motion.div key="balance-value" {...fadeIn}>
                <AnimatedCounter
                  value={portfolio.totalValue}
                  formatter={balanceFormatter}
                  duration={1}
                />
                <span className="dash-hero-currency"> {currency}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {balanceReady && portfolio.positionCount > 0 && (
            <motion.div 
              className={`dash-hero-change ${isGain ? 'gain' : 'loss'}`}
              {...fadeIn}
            >
              {isGain ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{formatPercent(portfolio.totalPnLPercent)}</span>
              <span className="dash-hero-change-amount">
                (<AnimatedCounter
                  value={portfolio.totalPnL}
                  formatter={pnlFormatter}
                  duration={0.8}
                />) this month
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Time Filters */}
      {portfolio.positionCount > 0 && (
        <motion.div 
          className="dash-time-filters"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {TIME_FILTERS.map(f => (
            <button
              key={f}
              className={`dash-time-chip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </motion.div>
      )}

      {/* Portfolio Chart */}
      <section className="dash-chart">
        <AnimatePresence mode="wait">
          {chartLoading ? (
            <motion.div key="chart-shimmer" className="dash-skeleton-chart" {...fadeIn}>
              <div className="shimmer" style={{ width: '100%', height: 160, borderRadius: 16 }} />
            </motion.div>
          ) : chartData.length > 0 ? (
            <motion.div key="chart-data" {...fadeIn}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isGain ? '#00b86b' : '#ff5252'} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={isGain ? '#00b86b' : '#ff5252'} stopOpacity={0.02} />
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
                            {balanceFormatter(payload[0].value)}
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={{ stroke: isGain ? '#00b86b' : '#ff5252', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={isGain ? '#00b86b' : '#ff5252'}
                    strokeWidth={2}
                    fill="url(#chartGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: isGain ? '#00b86b' : '#ff5252' }}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div key="chart-empty" className="dash-chart-empty" {...fadeIn}>
              <p>No hay datos suficientes para el período seleccionado.</p>
            </motion.div>
          )}
        </AnimatePresence>
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

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="positions-shimmer" className="dash-skeleton-list" {...fadeIn}>
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
            </motion.div>
          ) : enrichedPositions.length === 0 ? (
            <motion.div key="positions-empty" className="dash-empty" {...fadeIn}>
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
            </motion.div>
          ) : (
            <motion.div
              key="positions-list"
              className="dash-position-list"
              variants={staggerContainer}
              initial="initial"
              animate="enter"
            >
              {enrichedPositions.slice(0, 5).map((pos, index) => (
                <motion.div key={pos.id} variants={staggerItem}>
                  <PositionCard position={pos} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {error && (
        <div className="dash-error">
          <p>Error cargando datos. Intentá de nuevo.</p>
          <button onClick={refresh}>Reintentar</button>
        </div>
      )}
      </div>
    </PullToRefresh>
    </PageTransition>
  )
}
