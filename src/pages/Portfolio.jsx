import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Briefcase, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePortfolio } from '../hooks/usePortfolio'
import PositionCard from '../components/portfolio/PositionCard'
import PullToRefresh from '../components/common/PullToRefresh'
import PageTransition, { staggerContainer, staggerItem } from '../components/common/PageTransition'
import { formatCurrency, formatPercent, formatPnL } from '../utils/formatters'
import useAppStore from '../store/useAppStore'
import './Portfolio.css'

const COLORS = ['#00b86b', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0']

export default function Portfolio() {
  const navigate = useNavigate()
  const currency = useAppStore(s => s.currency)
  const { getPortfolioValue, getEnrichedPositions, isLoading, refresh } = usePortfolio()

  const portfolio = getPortfolioValue()
  const positions = getEnrichedPositions()
  const isGain = portfolio.totalPnL >= 0

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
  }, [positions, portfolio.totalValue])

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
          <span>Valor Actual</span>
        </div>
        <div className="portfolio-card-value">
          {isLoading ? (
            <div className="shimmer" style={{ width: 180, height: 40, borderRadius: 8 }} />
          ) : (
            formatCurrency(portfolio.totalValue, currency)
          )}
        </div>
        {!isLoading && portfolio.positionCount > 0 && (
          <div className={`portfolio-card-change ${isGain ? 'gain' : 'loss'}`}>
            {isGain ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{formatPnL(portfolio.totalPnL, currency)}</span>
            <span className="portfolio-card-change-pct">({formatPercent(portfolio.totalPnLPercent)})</span>
          </div>
        )}
      </section>

      {/* Stats Grid */}
      <section className="portfolio-stats-grid">
        <div className="portfolio-stat-box">
          <div className="stat-box-label">Inversión Total</div>
          <div className="stat-box-value">
            {isLoading ? (
              <div className="shimmer" style={{ width: 100, height: 24, borderRadius: 4 }} />
            ) : (
              formatCurrency(portfolio.totalCost, currency)
            )}
          </div>
        </div>
        <div className="portfolio-stat-box">
          <div className="stat-box-label">Posiciones</div>
          <div className="stat-box-value">
            {isLoading ? (
              <div className="shimmer" style={{ width: 40, height: 24, borderRadius: 4 }} />
            ) : (
              portfolio.positionCount
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
              <div className="allocation-center">
                <span>{positions.length}</span>
                <small>Activos</small>
              </div>
            </div>
            
            <div className="allocation-legend">
              {donutData.map((item, idx) => (
                <div key={item.name} className="legend-item">
                  <div className="legend-color" style={{ background: COLORS[idx % COLORS.length] }} />
                  <div className="legend-name">{item.name}</div>
                  <div className="legend-pct">
                    {formatPercent((item.value / portfolio.totalValue) * 100)}
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
                <PositionCard position={pos} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
      </div>
    </PullToRefresh>
    </PageTransition>
  )
}
