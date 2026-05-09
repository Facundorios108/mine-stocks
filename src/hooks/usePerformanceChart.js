import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCandles } from '../services/marketData'
import { usePortfolio } from './usePortfolio'
import useAppStore from '../store/useAppStore'

const FILTER_MAP = {
  '1D': { res: '15', days: 1 },
  '1W': { res: '60', days: 7 },
  '1M': { res: 'D', days: 30 },
  '3M': { res: 'D', days: 90 },
  '6M': { res: 'D', days: 180 },
  '1Y': { res: 'D', days: 365 },
  'ALL': { res: 'D', days: 730 }
}

export function usePerformanceChart(positionId = null, timeFilter = '1M') {
  const { getEnrichedPositions, dollarRates } = usePortfolio()
  const cashBalance = useAppStore(s => s.cashBalance)
  const currency = useAppStore(s => s.currency)
  const dollarType = useAppStore(s => s.dollarType)

  // 1. Get the target positions
  const allPositions = getEnrichedPositions()
  const positions = useMemo(() => {
    if (positionId) {
      return allPositions.filter(p => p.id === positionId)
    }
    return allPositions
  }, [allPositions, positionId])

  // 2. Extract unique symbols needed
  const symbols = useMemo(() => {
    return [...new Set(positions.map(p => p.symbol))]
  }, [positions])

  // 3. Fetch historical candles
  const { data: candlesBySymbol, isLoading } = useQuery({
    queryKey: ['candles', symbols.join(','), timeFilter],
    queryFn: async () => {
      const config = FILTER_MAP[timeFilter] || FILTER_MAP['1M']
      const to = Date.now()
      const from = to - (config.days * 24 * 60 * 60 * 1000)
      
      // Fetch ALL candles in parallel with a timeout per request
      const fetchWithTimeout = (symbol) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s max per symbol
        
        return getCandles(symbol, config.res, from, to)
          .then(data => ({ symbol, data }))
          .catch(error => {
            console.warn(`Candle fetch failed/timeout for ${symbol}`, error.message)
            return { symbol, data: null }
          })
          .finally(() => clearTimeout(timeoutId))
      }

      const settled = await Promise.allSettled(symbols.map(fetchWithTimeout))
      
      const results = {}
      settled.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results[result.value.symbol] = result.value.data
        }
      })
      return results
    },
    enabled: symbols.length > 0,
    staleTime: 10 * 60 * 1000, // Cache 10 mins (avoid refetching on every navigation)
    gcTime: 15 * 60 * 1000, // Keep in memory 15 mins
    retry: false, // Don't retry Finnhub API infinitely
    networkMode: 'offlineFirst'
  })

  // 4. Align data and calculate PnL
  const chartData = useMemo(() => {
    if (!candlesBySymbol || positions.length === 0) return []

    // Get all unique timestamps
    const allTimestamps = new Set()
    Object.values(candlesBySymbol).forEach(data => {
      if (data && data.s === 'ok' && data.t) {
        data.t.forEach(t => allTimestamps.add(t))
      }
    })

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)
    
    // Inject current timestamp to ensure we always have the latest value,
    // especially for newly added positions or when market data is delayed.
    const nowUnix = Math.floor(Date.now() / 1000)
    if (sortedTimestamps.length === 0 || sortedTimestamps[sortedTimestamps.length - 1] < nowUnix - 86400) {
      sortedTimestamps.push(nowUnix)
    }
    
    const exchangeRate = currency === 'ARS' && dollarRates 
      ? (dollarRates[dollarType]?.sell || 1) 
      : 1

    const finalData = sortedTimestamps.map(t => {
      let totalValue = positionId ? 0 : (cashBalance * exchangeRate)
      let totalCost = positionId ? 0 : (cashBalance * exchangeRate)
      let hasAnyShares = false

      positions.forEach(pos => {
        // Reconstruct share count at time t from transactions
        const txs = pos.transactions || []
        
        // If no transactions, fallback to the initial position date/shares
        let sharesAtT = 0
        if (txs.length === 0) {
          const buyDateMs = pos.date ? new Date(pos.date).getTime() : 0
          if (t >= Math.floor(buyDateMs / 1000) - 86400) {
            sharesAtT = pos.shares
          }
        } else {
          // Calculate cumulative shares from transactions up to time t
          sharesAtT = txs
            .filter(tx => {
              const txDate = new Date(tx.date).getTime()
              return Math.floor(txDate / 1000) <= t
            })
            .reduce((acc, tx) => {
              return acc + (tx.type === 'buy' ? Number(tx.shares) : -Number(tx.shares))
            }, 0)
        }

        if (sharesAtT > 0) {
          hasAnyShares = true
          const symbolData = candlesBySymbol[pos.symbol]
          let price = pos.currentPriceUsd || pos.averageCost || 0
          
          if (symbolData && symbolData.s === 'ok' && symbolData.t) {
            // Find closest previous price in candles
            let found = false
            for (let i = symbolData.t.length - 1; i >= 0; i--) {
              if (symbolData.t[i] <= t) {
                price = symbolData.c[i]
                found = true
                break
              }
            }
          }

          const value = sharesAtT * price * exchangeRate
          const cost = sharesAtT * pos.averageCost * exchangeRate
          
          totalValue += value
          totalCost += cost
        }
      })

      // Skip timestamps where we owned nothing
      if (!hasAnyShares) return null

      return {
        t,
        date: new Date(t * 1000).toLocaleDateString(),
        v: totalValue,
        pnl: totalValue - totalCost
      }
    }).filter(Boolean)

    // Ensure we have at least 2 points for the chart to render properly.
    // If only 1 point (today), add a previous point 24h ago with same value.
    if (finalData.length === 1) {
      const firstPoint = finalData[0]
      const prevTime = firstPoint.t - 86400
      finalData.unshift({
        ...firstPoint,
        t: prevTime,
        date: new Date(prevTime * 1000).toLocaleDateString()
      })
    }

    // Quick Fix: If chart is still empty but we have positions, 
    // add a dummy point with current value to avoid "broken" feel.
    if (finalData.length === 0 && positions.length > 0) {
      const now = Math.floor(Date.now() / 1000)
      const currentStats = positions.reduce((acc, p) => {
        const val = p.shares * (p.currentPriceUsd || p.averageCost || 0) * exchangeRate
        const cst = p.shares * p.averageCost * exchangeRate
        return { v: acc.v + val, c: acc.c + cst }
      }, { v: positionId ? 0 : (cashBalance * exchangeRate), c: positionId ? 0 : (cashBalance * exchangeRate) })

      if (currentStats.v > 0 || currentStats.c > 0) {
        const point = {
          t: now,
          date: new Date(now * 1000).toLocaleDateString(),
          v: currentStats.v,
          pnl: currentStats.v - currentStats.c
        }
        // Add twice to ensure it renders as a line
        finalData.push({ ...point, t: now - 86400 }, point)
      }
    }

    return finalData
  }, [candlesBySymbol, positions, currency, dollarRates, dollarType])

  return {
    chartData,
    isLoading
  }
}
