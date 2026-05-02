import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search as SearchIcon, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { searchAssets } from '../services/marketData'
import useAppStore from '../store/useAppStore'
import './Search.css'

const CATEGORIES = ['Todas', 'Tecnología', 'Finanzas', 'Salud', 'Energía', 'Crypto']

// Mock trending stocks for default view
const TRENDING = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 875.42, change: +3.21, isGain: true },
  { symbol: 'META', name: 'Meta Platforms', price: 498.15, change: +1.87, isGain: true },
  { symbol: 'TSLA', name: 'Tesla Inc', price: 178.30, change: -2.45, isGain: false },
]

const POPULAR = [
  { symbol: 'AAPL', name: 'Apple Inc', price: 198.45, change: +1.19, isGain: true },
  { symbol: 'GOOGL', name: 'Alphabet Inc', price: 167.82, change: +0.85, isGain: true },
  { symbol: 'AMZN', name: 'Amazon.com', price: 185.20, change: -0.32, isGain: false },
  { symbol: 'MSFT', name: 'Microsoft Corp', price: 420.50, change: +0.62, isGain: true },
  { symbol: 'BTC', name: 'Bitcoin', price: 67420.00, change: +2.34, isGain: true },
]

export default function Search() {
  const navigate = useNavigate()
  const user = useAppStore(s => s.user)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Todas')

  const firstName = user?.displayName?.split(' ')[0] || 'Inversor'

  const searchTimeout = { current: null }
  const handleSearch = useCallback((q) => {
    setQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setResults([]); return }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchAssets(q)
        setResults(data)
      } catch (err) { console.error(err) }
      setSearching(false)
    }, 400)
  }, [])

  const showDefault = !searching && query.length < 2

  // Simple sparkline path for trending cards
  const sparkline = (isGain) => {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const x = (i / 7) * 60
      const y = 20 + (Math.random() - (isGain ? 0.55 : 0.45)) * 16
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`
    }).join(' ')
    return pts
  }

  return (
    <div className="page search-page">
      {/* Header */}
      <header className="explore-header">
        <div className="explore-header-left">
          <div className="explore-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" />
            ) : (
              <span>{firstName[0]}</span>
            )}
          </div>
          <h1 className="explore-title">Explore</h1>
        </div>
        <button className="explore-notification-btn">
          <Bell size={20} strokeWidth={1.8} />
        </button>
      </header>

      {/* Search Input */}
      <div className="search-field">
        <SearchIcon size={18} />
        <input
          type="text"
          placeholder="Buscar acciones..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          id="input-search"
        />
      </div>

      {/* Categories */}
      {showDefault && (
        <div className="explore-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`explore-cat-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Search Results */}
      {searching && (
        <div className="search-loading">
          {[1,2,3].map(i => (
            <div key={i} className="shimmer" style={{ width: '100%', height: 56, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="search-results">
          {results.map((r, idx) => (
            <button
              key={`${r.symbol}-${idx}`}
              className="search-result-item"
              onClick={() => navigate(`/add?symbol=${r.symbol}&name=${encodeURIComponent(r.name)}&type=${r.assetType}`)}
            >
              <div className="search-result-left">
                <div className="search-result-avatar">
                  {r.thumb ? <img src={r.thumb} alt="" /> : <span>{r.symbol?.slice(0,2)}</span>}
                </div>
                <div>
                  <div className="search-result-symbol">{r.symbol}</div>
                  <div className="search-result-name">{r.name}</div>
                </div>
              </div>
              <ChevronRight size={16} className="search-result-arrow" />
            </button>
          ))}
        </div>
      )}

      {!searching && results.length === 0 && query.length >= 2 && (
        <div className="search-empty-state">
           <div className="search-empty-icon">
             <SearchIcon size={32} strokeWidth={1.5} />
           </div>
           <h3>Sin resultados</h3>
           <p>No encontramos "{query}". Probá con otro término.</p>
        </div>
      )}

      {/* Default Content: Trending + Popular */}
      {showDefault && (
        <>
          {/* Trending */}
          <section className="explore-section">
            <div className="explore-section-header">
              <h2>Tendencias</h2>
              <button className="explore-see-all">Ver todas <ChevronRight size={14} /></button>
            </div>
            <div className="explore-trending-scroll">
              {TRENDING.map(stock => (
                <div key={stock.symbol} className="explore-trending-card" onClick={() => navigate(`/add?symbol=${stock.symbol}&name=${encodeURIComponent(stock.name)}&type=stock`)}>
                  <div className="trending-card-header">
                    <span className="trending-symbol">{stock.symbol}</span>
                    <span className={`trending-badge ${stock.isGain ? 'gain' : 'loss'}`}>
                      {stock.isGain ? '+' : ''}{stock.change}%
                    </span>
                  </div>
                  <div className="trending-card-chart">
                    <svg width="60" height="32" viewBox="0 0 60 32" fill="none">
                      <path d={sparkline(stock.isGain)} stroke={stock.isGain ? 'var(--color-gain)' : 'var(--color-loss)'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div className="trending-price">${stock.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  <div className="trending-name">{stock.name}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Popular */}
          <section className="explore-section">
            <div className="explore-section-header">
              <h2>Más Populares</h2>
              <button className="explore-see-all">Ver todas <ChevronRight size={14} /></button>
            </div>
            <div className="explore-popular-list">
              {POPULAR.map(stock => (
                <button key={stock.symbol} className="explore-popular-item" onClick={() => navigate(`/add?symbol=${stock.symbol}&name=${encodeURIComponent(stock.name)}&type=stock`)}>
                  <div className="popular-avatar">
                    <span>{stock.symbol[0]}</span>
                  </div>
                  <div className="popular-info">
                    <div className="popular-symbol">{stock.symbol}</div>
                    <div className="popular-name">{stock.name}</div>
                  </div>
                  <div className="popular-right">
                    <div className="popular-price">${stock.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div className={`popular-change ${stock.isGain ? 'gain' : 'loss'}`}>
                      {stock.isGain ? '+' : ''}{stock.change}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
