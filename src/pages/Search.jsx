import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search as SearchIcon, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { searchAssets, getBatchQuotes } from '../services/marketData'
import { motion, AnimatePresence } from 'framer-motion'
import useAppStore from '../store/useAppStore'
import { usePortfolio } from '../hooks/usePortfolio'
import PageTransition from '../components/common/PageTransition'
import './Search.css'

const CATEGORIES = ['Todas', 'Tecnología', 'Finanzas', 'Salud', 'Energía']

const CAT_SYMBOLS = {
  'Todas': ['AAPL', 'MSFT', 'NVDA', 'META', 'TSLA', 'AMZN', 'GOOGL', 'NFLX', 'BRK.B', 'UNH'],
  'Tecnología': ['AMD', 'INTC', 'CRM', 'CSCO', 'ADBE', 'ORCL', 'PYPL', 'SHOP', 'SNOW', 'TWLO'],
  'Finanzas': ['JPM', 'V', 'MA', 'BAC', 'GS', 'MS', 'WFC', 'BLK', 'AXP', 'PYPL'],
  'Salud': ['JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'MRK', 'ABBV', 'LLY', 'DHR', 'BMY'],
  'Energía': ['XOM', 'CVX', 'COP', 'OXY', 'MPC', 'SLB', 'EOG', 'PSX', 'VLO', 'PXD']
}

const SYMBOL_NAMES = {
  NVDA: 'NVIDIA Corp', META: 'Meta Platforms', TSLA: 'Tesla Inc',
  AAPL: 'Apple Inc', MSFT: 'Microsoft Corp', AMZN: 'Amazon.com Inc',
  GOOGL: 'Alphabet Inc', NFLX: 'Netflix Inc', 'BRK.B': 'Berkshire Hathaway',
  UNH: 'UnitedHealth Group',
  AMD: 'Advanced Micro Devices', INTC: 'Intel Corp', CRM: 'Salesforce',
  CSCO: 'Cisco Systems', ADBE: 'Adobe Inc', ORCL: 'Oracle Corp',
  PYPL: 'PayPal Holdings', SHOP: 'Shopify Inc', SNOW: 'Snowflake Inc', TWLO: 'Twilio Inc',
  JPM: 'JPMorgan Chase', V: 'Visa Inc', MA: 'Mastercard',
  BAC: 'Bank of America', GS: 'Goldman Sachs', MS: 'Morgan Stanley',
  WFC: 'Wells Fargo', BLK: 'BlackRock Inc', AXP: 'American Express',
  JNJ: 'Johnson & Johnson', PFE: 'Pfizer Inc',
  ABT: 'Abbott Labs', TMO: 'Thermo Fisher', MRK: 'Merck & Co',
  ABBV: 'AbbVie Inc', LLY: 'Eli Lilly', DHR: 'Danaher Corp', BMY: 'Bristol-Myers Squibb',
  XOM: 'Exxon Mobil', CVX: 'Chevron Corp', COP: 'ConocoPhillips',
  OXY: 'Occidental Petroleum', MPC: 'Marathon Petroleum', SLB: 'Schlumberger',
  EOG: 'EOG Resources', PSX: 'Phillips 66', VLO: 'Valero Energy', PXD: 'Pioneer Natural'
}

const TRENDING_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM', 'GLD', 'VTI']
const TRENDING_NAMES = {
  SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow Jones',
  IWM: 'Russell 2000', GLD: 'Gold', VTI: 'Total Market'
}

export default function Search() {
  const navigate = useNavigate()
  const user = useAppStore(s => s.user)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  
  const [loadingTrending, setLoadingTrending] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Todas')
  const [showAllInCategory, setShowAllInCategory] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(false)
  
  const searchCache = useAppStore(s => s.searchCache)
  const setSearchCache = useAppStore(s => s.setSearchCache)

  const [trendingData, setTrendingData] = useState(searchCache.trending || [])
  const [categoryData, setCategoryData] = useState(searchCache.categories[activeCategory] || [])

  const { positions } = usePortfolio()
  
  const portfolioSymbols = new Set(positions.map(p => p.symbol))

  const firstName = user?.displayName?.split(' ')[0] || 'Inversor'

  // Fetch Trending & Category real quotes
  useEffect(() => {
    let mounted = true
    
    const fetchCategory = async () => {
      setLoadingCategory(true)
      setLoadingTrending(true)
      
      try {
        const categorySymbols = CAT_SYMBOLS[activeCategory]
        const allSymbols = [...new Set([...categorySymbols, ...TRENDING_SYMBOLS])]
        const quotes = await getBatchQuotes(allSymbols)
        
        if (!mounted) return

        // Format Trending
        const trending = TRENDING_SYMBOLS.map(sym => {
          const q = quotes[sym]
          if (!q) return null
          return {
            symbol: sym,
            name: TRENDING_NAMES[sym],
            price: q.c || 0,
            change: q.d || 0,
            changePercent: q.dp || 0,
            isGain: (q.dp || 0) >= 0
          }
        }).filter(Boolean)
        setTrendingData(trending)

        // Format Category
        const formatted = categorySymbols.map(sym => {
          const q = quotes[sym]
          if (!q) return null
            return {
              symbol: sym,
              name: SYMBOL_NAMES[sym] || sym,
              price: q.c || 0,
              change: q.d || 0,
              changePercent: q.dp || 0,
              isGain: (q.dp || 0) >= 0
            }
        }).filter(Boolean)
        
        setCategoryData(formatted)

        // Update Global Cache
        setSearchCache({
          trending: trending,
          categories: {
            ...searchCache.categories,
            [activeCategory]: formatted
          }
        })
      } catch (e) {
        console.error('Error fetching category quotes', e)
        // If error, ensure we have at least cached data
        if (trendingData.length === 0 && searchCache.trending) {
          setTrendingData(searchCache.trending)
        }
        if (categoryData.length === 0 && searchCache.categories[activeCategory]) {
          setCategoryData(searchCache.categories[activeCategory])
        }
      } finally {
        if (mounted) {
          setLoadingCategory(false)
          setLoadingTrending(false)
        }
      }
    }
    
    // Only fetch if not currently searching something specific
    if (query.length < 2) {
      fetchCategory()
    }
    
    return () => { mounted = false }
  }, [activeCategory, query])

  const searchTimeout = useRef(null)
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

  return (
    <PageTransition>
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
              onClick={() => {
                setActiveCategory(cat)
                setShowAllInCategory(false)
              }}
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
                  <div className="search-result-symbol-row">
                    <div className="search-result-symbol">{r.symbol}</div>
                    {portfolioSymbols.has(r.symbol) && (
                      <span className="portfolio-badge">En Cartera</span>
                    )}
                  </div>
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

      {/* Default Content: Trending / Category */}
      {showDefault && (
        <>
          {/* Market Overview */}
          <section className="explore-section">
            <div className="explore-section-header">
              <h2>Mercado</h2>
            </div>
            <div className="explore-trending-scroll">
              {loadingTrending ? (
                [1,2,3].map(i => (
                  <div key={i} className="shimmer trending-shimmer" style={{ minWidth: 160, height: 100, borderRadius: 16 }} />
                ))
              ) : (
                trendingData.map(item => (
                  <div key={item.symbol} className="explore-trending-card">
                    <div className="trending-card-header">
                      <span className="trending-symbol">{item.symbol}</span>
                      <span className={`trending-badge ${item.isGain ? 'gain' : 'loss'}`}>
                        {item.isGain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {item.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="trending-price">${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div className="trending-name">{item.name}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Categories & Popular */}
          <section className="explore-section">
            <div className="explore-section-header">
              <h2>Populares</h2>
              <button className="explore-see-all" onClick={() => setShowAllInCategory(!showAllInCategory)}>
                {showAllInCategory ? 'Ver menos' : 'Ver todas'} 
                <ChevronRight size={14} style={{ transform: showAllInCategory ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            </div>

            <div className="explore-categories">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`explore-cat-chip ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat)
                    setShowAllInCategory(false)
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            {loadingCategory ? (
              <div className="search-loading">
                {[1,2,3].map(i => (
                  <div key={i} className="shimmer" style={{ width: '100%', height: 74, borderRadius: 16 }} />
                ))}
              </div>
            ) : (
              <div className="explore-popular-list">
                <AnimatePresence mode="popLayout">
                  {(showAllInCategory ? categoryData : categoryData.slice(0, 5)).map((stock, i) => (
                    <motion.button
                      key={stock.symbol}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      className="explore-popular-item"
                      onClick={() => navigate(`/add?symbol=${stock.symbol}&name=${encodeURIComponent(stock.name)}&type=stock`)}
                    >
                      <div className="popular-avatar">
                        <img 
                          src={`https://financialmodelingprep.com/image-stock/${stock.symbol}.png`} 
                          alt="" 
                          onError={(e) => {
                            e.target.style.display = 'none'
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                        <span style={{ display: 'none' }}>{stock.symbol[0]}</span>
                      </div>
                      <div className="popular-info">
                        <div className="popular-symbol-row">
                          <div className="popular-symbol">{stock.symbol}</div>
                          {portfolioSymbols.has(stock.symbol) && (
                            <span className="portfolio-badge mini">En Cartera</span>
                          )}
                        </div>
                        <div className="popular-name">{stock.name}</div>
                      </div>
                      <div className="popular-right">
                        <div className="popular-price">${stock.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className={`popular-change ${stock.isGain ? 'gain' : 'loss'}`}>
                          {stock.isGain ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          <span className="popular-change-abs">
                            ({stock.isGain ? '+' : ''}{stock.change.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
                
                {!loadingCategory && categoryData.length === 0 && (
                  <div className="search-empty-state" style={{ padding: '24px' }}>
                    <p>No se pudieron cargar las cotizaciones.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
    </PageTransition>
  )
}
