import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Briefcase, TrendingUp, TrendingDown, ChevronRight, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePortfolio } from '../hooks/usePortfolio'
import PositionCard from '../components/portfolio/PositionCard'
import PullToRefresh from '../components/common/PullToRefresh'
import PageTransition, { staggerContainer, staggerItem } from '../components/common/PageTransition'
import AnimatedCounter from '../components/common/AnimatedCounter'
import CashModal from '../components/portfolio/CashModal'
import SellModal from '../components/portfolio/SellModal'
import { formatCurrency, formatPercent, formatPnL } from '../utils/formatters'
import useAppStore from '../store/useAppStore'
import './Portfolio.css'

const COLORS = ['#00b86b', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0']

export default function Portfolio() {
  const navigate = useNavigate()
  const currency = useAppStore(s => s.currency)
  const { getPortfolioValue, getEnrichedPositions, isLoading, refresh } = usePortfolio()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('performance') // 'performance', 'gain', 'value', 'date', 'symbol'

  const portfolio = getPortfolioValue()
  const positions = useMemo(() => {
    let filtered = getEnrichedPositions().filter(p => p.shares > 0)

    // 1. Filter by search query (symbol)
    if (searchQuery) {
      const q = searchQuery.toUpperCase()
      filtered = filtered.filter(p => p.symbol.includes(q))
    }

    // 2. Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.pnlPercent - a.pnlPercent
        case 'gain':
          return b.pnlAmount - a.pnlAmount
        case 'value':
          return b.totalValue - a.totalValue
        case 'date':
          const timeA = a.createdAt?.seconds || new Date(a.date || 0).getTime() / 1000
          const timeB = b.createdAt?.seconds || new Date(b.date || 0).getTime() / 1000
          return timeB - timeA
        case 'symbol':
          return a.symbol.localeCompare(b.symbol)
        default:
          return 0
      }
    })
  }, [getEnrichedPositions, searchQuery, sortBy])
  const isGain = portfolio.totalPnL >= 0

  const [activeIndex, setActiveIndex] = useState(null)
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)
  const [isSellModalOpen, setIsSellModalOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [cashAction, setCashAction] = useState('deposit')

  // Calculate allocation data
  const donutData = useMemo(() => {
    if (positions.length === 0) return []
    // Sort by value and take top 4, group rest into "Otros"
    const sorted = [...positions].sort((a, b) => b.totalValue - a.totalValue)
    const top = sorted.slice(0, 4)
    const others = sorted.slice(4)
    
    const data = top.map(p => ({ name: p.symbol, value: p.totalValue }))
    if (others.length > 0) {
      const othersValue = others.reduce((sum, p) => sum + p.totalValue, 0)
      data.push({ name: 'Otros', value: othersValue })
    }
    return data
  }, [positions, portfolio.totalInvested])

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <PageTransition>
    <PullToRefresh onRefresh={refresh}>
      <div className="page portfolio-page">
        {/* Header */}
        <header className="portfolio-header">
          <h1 className="portfolio-title">Mi Portafolio</h1>
        </header>

        {/* Main Metrics Card */}
        <section className="portfolio-main-card">
          <div className="portfolio-card-header">
            <Briefcase size={20} className="portfolio-card-icon" />
            <span>Patrimonio Neto</span>
          </div>
          <div className="portfolio-card-value">
            {isLoading ? (
              <div className="shimmer" style={{ width: 180, height: 40, borderRadius: 8 }} />
            ) : (
              <AnimatedCounter 
                value={portfolio.netWorth} 
                formatter={(v) => formatCurrency(v, currency)} 
              />
            )}
          </div>
          {!isLoading && portfolio.positionCount > 0 && (
            <div className="portfolio-hero-performance">
              <div className={`portfolio-perf-item ${portfolio.totalPnL >= 0 ? 'gain' : 'loss'}`}>
                <span className="perf-label">Ganancia Total</span>
                <div className="perf-value">
                  {portfolio.totalPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{formatPnL(portfolio.totalPnL, currency)}</span>
                  <small>({formatPercent(portfolio.totalPnLPercent)})</small>
                </div>
              </div>
              <div className="portfolio-perf-divider" />
              <div className={`portfolio-perf-item ${portfolio.dailyPnL >= 0 ? 'gain' : 'loss'}`}>
                <span className="perf-label">Hoy</span>
                <div className="perf-value">
                  {portfolio.dailyPnL >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{formatPnL(portfolio.dailyPnL, currency)}</span>
                  <small>({formatPercent(portfolio.dailyPnLPercent)})</small>
                </div>
              </div>
            </div>
          )}
        </section>

      {/* Stats Grid */}
      <section className="portfolio-stats-grid">
        <div className="portfolio-stat-box">
          <div className="stat-box-label">Invertido</div>
          <div className="stat-box-value">
            {isLoading ? (
              <div className="shimmer" style={{ width: 100, height: 24, borderRadius: 4 }} />
            ) : (
              formatCurrency(portfolio.invested, currency)
            )}
          </div>
        </div>
        <div className="portfolio-stat-box" onClick={() => { setCashAction('deposit'); setIsCashModalOpen(true); }}>
          <div className="stat-box-label">Efectivo</div>
          <div className="stat-box-value">
            {isLoading ? (
              <div className="shimmer" style={{ width: 40, height: 24, borderRadius: 4 }} />
            ) : (
              formatCurrency(portfolio.cashBalance, currency)
            )}
          </div>
        </div>
      </section>

      {/* Allocation Donut */}
      {donutData.length > 0 && (
        <section className="portfolio-allocation">
          <h2 className="portfolio-section-title">Distribución</h2>
          <div className="allocation-container">
            <div className="allocation-chart">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        onMouseEnter={() => onPieEnter(null, index)}
                        onMouseLeave={onPieLeave}
                        style={{
                          outline: 'none',
                          filter: activeIndex === index ? `drop-shadow(0px 0px 8px ${COLORS[index % COLORS.length]}80)` : 'none',
                          transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: 'center',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            background: '#1a1d24',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '500',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}>
                            {payload[0].name}: {formatCurrency(payload[0].value, currency)}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="allocation-center" style={{ pointerEvents: 'none', zIndex: 10 }}>
                {activeIndex !== null && donutData[activeIndex] ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key="active-state"
                  >
                    <span style={{ fontSize: '1.2rem', color: COLORS[activeIndex % COLORS.length] }}>
                      {formatPercent((donutData[activeIndex].value / portfolio.marketValue) * 100)}
                    </span>
                    <small>{donutData[activeIndex].name}</small>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key="default-state"
                  >
                    <span>{positions.length}</span>
                    <small>Activos</small>
                  </motion.div>
                )}
              </div>
            </div>
            
            <div className="allocation-legend">
              {donutData.map((item, idx) => (
                <div key={item.name} className="legend-item">
                  <div className="legend-color" style={{ background: COLORS[idx % COLORS.length] }} />
                  <div className="legend-name">{item.name}</div>
                  <div className="legend-pct">
                    {formatPercent((item.value / portfolio.marketValue) * 100)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Positions List */}
      <section className="portfolio-positions">
        <h2 className="portfolio-section-title">Todas las Posiciones</h2>
        
        <div className="portfolio-filters">
          <div className="portfolio-search-box glass">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Buscar ticker..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="portfolio-sort-scroll">
            {[
              { id: 'performance', label: 'Rendimiento' },
              { id: 'gain', label: 'Ganancia' },
              { id: 'value', label: 'Valor' },
              { id: 'date', label: 'Fecha' },
              { id: 'symbol', label: 'Ticker' }
            ].map(opt => (
              <button
                key={opt.id}
                className={`sort-chip ${sortBy === opt.id ? 'active' : ''}`}
                onClick={() => setSortBy(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {isLoading ? (
          <div className="portfolio-skeleton-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="shimmer" style={{ height: 76, borderRadius: 16, marginBottom: 8 }} />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <div className="portfolio-empty-state">
            <div className="empty-icon-container">
              <Briefcase size={32} strokeWidth={1.5} className="empty-icon" />
            </div>
            <h3>Tu portafolio está vacío</h3>
            <p>Aún no agregaste ningún activo. ¡Empezá a invertir hoy!</p>
            <button className="empty-btn" onClick={() => navigate('/add')}>
              Agregar Activos
            </button>
          </div>
        ) : (
          <motion.div
            className="portfolio-position-list"
            variants={staggerContainer}
            initial="initial"
            animate="enter"
          >
            {positions.map(pos => (
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
      </section>
      </div>
    </PullToRefresh>
    <CashModal 
      isOpen={isCashModalOpen} 
      onClose={() => setIsCashModalOpen(false)} 
      initialAction={cashAction} 
    />
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
