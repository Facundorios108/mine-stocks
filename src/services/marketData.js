/**
 * Market Data Service
 * Primary: Finnhub API (stocks, ETFs, crypto)
 * Fallback: CoinGecko (crypto details)
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

// Finnhub free API key (register at finnhub.io)
// Users should set their own key
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY || ''

// ── Rate Limiter ──
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = []
  }

  async waitForSlot() {
    const now = Date.now()
    this.requests = this.requests.filter(t => now - t < this.windowMs)

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.windowMs - (now - oldestRequest) + 50
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return this.waitForSlot()
    }

    this.requests.push(now)
  }
}

const finnhubLimiter = new RateLimiter(55, 60000) // 55 req/min (5 buffer)

// ── Finnhub API ──

async function finnhubFetch(endpoint, params = {}) {
  await finnhubLimiter.waitForSlot()

  const url = new URL(`${FINNHUB_BASE}${endpoint}`)
  url.searchParams.set('token', FINNHUB_KEY)
  Object.entries(params).forEach(([key, val]) => {
    url.searchParams.set(key, val)
  })

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`)
  }
  return response.json()
}

/**
 * Get real-time quote for a stock/ETF
 * Returns: { c: currentPrice, d: change, dp: changePercent, h: high, l: low, o: open, pc: prevClose, t: timestamp }
 */
export async function getQuote(symbol) {
  return finnhubFetch('/quote', { symbol: symbol.toUpperCase() })
}

/**
 * Get quotes for multiple symbols (batched)
 */
export async function getBatchQuotes(symbols) {
  const results = {}
  const batchSize = 10

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const promises = batch.map(async (symbol) => {
      try {
        const quote = await getQuote(symbol)
        results[symbol] = quote
      } catch (err) {
        console.warn(`Failed to fetch quote for ${symbol}:`, err)
        results[symbol] = null
      }
    })
    await Promise.all(promises)
  }

  return results
}

/**
 * Search for symbols
 */
export async function searchSymbols(query) {
  const data = await finnhubFetch('/search', { q: query })
  return (data.result || []).slice(0, 15).map(item => ({
    symbol: item.symbol,
    name: item.description,
    type: item.type,
    exchange: item.displaySymbol
  }))
}

/**
 * Get company profile/info
 */
export async function getCompanyProfile(symbol) {
  return finnhubFetch('/stock/profile2', { symbol: symbol.toUpperCase() })
}

/**
 * Get stock candles (historical data)
 * resolution: 1, 5, 15, 30, 60, D, W, M
 */
export async function getCandles(symbol, resolution = 'D', from, to) {
  return finnhubFetch('/stock/candle', {
    symbol: symbol.toUpperCase(),
    resolution,
    from: Math.floor(from / 1000),
    to: Math.floor(to / 1000)
  })
}

// ── CoinGecko API (Crypto fallback) ──

async function coingeckoFetch(endpoint) {
  const response = await fetch(`${COINGECKO_BASE}${endpoint}`)
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`)
  }
  return response.json()
}

/**
 * Get crypto price by id (e.g., 'bitcoin', 'ethereum')
 */
export async function getCryptoPrice(coinId) {
  const data = await coingeckoFetch(
    `/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
  )
  return data[coinId] || null
}

/**
 * Search crypto coins
 */
export async function searchCrypto(query) {
  const data = await coingeckoFetch(`/search?query=${encodeURIComponent(query)}`)
  return (data.coins || []).slice(0, 10).map(coin => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    thumb: coin.thumb,
    type: 'crypto'
  }))
}

// ── Unified Search ──

export async function searchAssets(query) {
  if (!query || query.length < 1) return []

  try {
    const [stocks, cryptos] = await Promise.allSettled([
      searchSymbols(query),
      searchCrypto(query)
    ])

    const results = []

    if (stocks.status === 'fulfilled') {
      results.push(...stocks.value.map(s => ({ ...s, assetType: s.type === 'ETP' ? 'etf' : 'stock' })))
    }

    if (cryptos.status === 'fulfilled') {
      results.push(...cryptos.value.map(c => ({
        symbol: c.symbol,
        name: c.name,
        type: 'Crypto',
        assetType: 'crypto',
        cryptoId: c.id,
        thumb: c.thumb
      })))
    }

    return results
  } catch (err) {
    console.error('Search failed:', err)
    return []
  }
}
