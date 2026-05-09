import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, TrendingUp, TrendingDown, Plus, ChevronRight } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { usePortfolio } from '../hooks/usePortfolio'
import { usePerformanceChart } from '../hooks/usePerformanceChart'
import CashModal from '../components/portfolio/CashModal'
import SellModal from '../components/portfolio/SellModal'
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
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)
  const [isSellModalOpen, setIsSellModalOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [cashAction, setCashAction] = useState('deposit') // 'deposit' | 'withdraw'

  const {
    isLoading,
    quotesLoading,
    getPortfolioValue,
    getEnrichedPositions,
    error,
    refresh
  } = usePortfolio()

  const portfolio = getPortfolioValue()
  const enrichedPositions = useMemo(() => {
    return getEnrichedPositions()
      .filter(p => p.shares > 0)
      .sort((a, b) => {
        const timeA = a.createdAt?.seconds || new Date(a.date || 0).getTime() / 1000
        const timeB = b.createdAt?.seconds || new Date(b.date || 0).getTime() / 1000
        return timeB - timeA
      })
  }, [getEnrichedPositions])
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
        <div className="dash-ambient-bg" />
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
        <button className="dash-notification-btn glass" id="btn-notifications">
          <Bell size={20} strokeWidth={1.8} />
          <div className="dash-notif-dot" />
        </button>
      </motion.header>

      {/* Balance Hero */}
      <section className="dash-hero" id="portfolio-summary">
        <div className={`dash-hero-card glass ${isGain ? 'gain-bg' : 'loss-bg'}`}>
          <div className="dash-hero-main">
            <div className="dash-hero-label">PATRIMONIO NETO</div>
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
                <motion.div className="dash-hero-pnl" {...fadeIn}>
                  <div className={`dash-pnl-badge ${portfolio.totalPnL >= 0 ? 'gain' : 'loss'}`}>
                    <div className="pnl-main-info">
                      {portfolio.totalPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span>{formatPnL(portfolio.totalPnL, currency)}</span>
                    </div>
                    <div className="pnl-percent-info">
                      {portfolio.totalPnL >= 0 ? '+' : ''}{formatPercent(portfolio.totalPnLPercent)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {balanceReady && (
              <motion.div className="dash-hero-stats" {...fadeIn}>
                <div className="dash-stat-item">
                  <span className="dash-stat-label">Invertido</span>
                  <span className="dash-stat-value">{formatCurrency(portfolio.invested, currency)}</span>
                </div>
                <div className="dash-stat-divider" />
                <div className="dash-stat-item">
                  <span className="dash-stat-label">Hoy</span>
                  <span className={`dash-stat-value ${portfolio.dailyPnL >= 0 ? 'gain' : 'loss'}`}>
                    {portfolio.dailyPnL >= 0 ? '+' : ''}{formatPercent(portfolio.dailyPnLPercent)}
                  </span>
                </div>
                <div className="dash-stat-divider" />
                <div className="dash-stat-item">
                  <span className="dash-stat-label">Efectivo</span>
                  <span className="dash-stat-value">{formatCurrency(portfolio.cashBalance, currency)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="dash-hero-actions">
            <button 
              className="dash-btn-cash primary"
              onClick={() => { setCashAction('deposit'); setIsCashModalOpen(true) }}
            >
              <Plus size={18} /> Depositar
            </button>
            <button 
              className="dash-btn-cash secondary"
              onClick={() => { setCashAction('withdraw'); setIsCashModalOpen(true) }}
            >
              Retirar
            </button>
          </div>
        </div>
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
              <div className="shimmer" style={{ width: '100%', height: 180, borderRadius: 20 }} />
            </motion.div>
          ) : chartData.length > 0 ? (
            <motion.div key="chart-data" {...fadeIn}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isGain ? '#4ce08e' : '#ff7671'} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={isGain ? '#4ce08e' : '#ff7671'} stopOpacity={0} />
                    </linearGradient>
                    <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <YAxis 
                    domain={[
                      (dataMin) => {
                        const padding = dataMin * 0.01;
                        return Math.max(0, dataMin - padding);
                      },
                      (dataMax) => {
                        const padding = dataMax * 0.01;
                        return dataMax + padding;
                      }
                    ]} 
                    hide 
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="dash-chart-tooltip glass">
                            <div className="tooltip-value">{balanceFormatter(payload[0].value)}</div>
                            <div className="tooltip-date">{payload[0].payload.date}</div>
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={{ stroke: isGain ? '#4ce08e' : '#ff7671', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={isGain ? '#4ce08e' : '#ff7671'}
                    strokeWidth={4}
                    fill="url(#chartGrad)"
                    filter="url(#chartGlow)"
                    dot={false}
                    activeDot={{ 
                      r: 6, 
                      strokeWidth: 3, 
                      stroke: '#121212', 
                      fill: isGain ? '#4ce08e' : '#ff7671' 
                    }}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div key="chart-empty" className="dash-chart-empty glass" {...fadeIn}>
              <p>No hay datos suficientes para el gráfico.</p>
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
                  <PositionCard 
                    position={pos} 
                    onSellClick={() => {
                      setSelectedPosition(pos)
                      setIsSellModalOpen(true)
                    }}
                  />
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

    <AnimatePresence>
      {isCashModalOpen && (
        <CashModal 
          isOpen={isCashModalOpen} 
          onClose={() => setIsCashModalOpen(false)} 
          initialAction={cashAction}
        />
      )}
    </AnimatePresence>

    {selectedPosition && (
      <SellModal 
        isOpen={isSellModalOpen}
        onClose={() => {
          setIsSellModalOpen(false)
          setSelectedPosition(null)
        }}
        position={selectedPosition}
      />
    )}
    </PageTransition>
  )
}
