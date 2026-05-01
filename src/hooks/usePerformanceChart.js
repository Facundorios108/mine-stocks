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
      
      const results = {}
      // We process sequentially or with a slight delay if there are many to respect rate limits
      for (const symbol of symbols) {
        try {
          const data = await getCandles(symbol, config.res, from, to)
          results[symbol] = data
        } catch (error) {
          console.error(`Error fetching candles for ${symbol}`, error)
          results[symbol] = null
        }
      }
      return results
    },
    enabled: symbols.length > 0,
    staleTime: 5 * 60 * 1000 // Cache for 5 mins
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
    
    const exchangeRate = currency === 'ARS' && dollarRates 
      ? (dollarRates[dollarType]?.sell || 1) 
      : 1

    const finalData = sortedTimestamps.map(t => {
      let totalValue = 0
      let totalCost = 0
      let hasDataForTimestamp = false

      positions.forEach(pos => {
        // Did we own this at time t?
        // Note: pos.date is expected to be 'YYYY-MM-DD'
        const buyDateMs = pos.date ? new Date(pos.date).getTime() : 0
        const buyDateUnix = Math.floor(buyDateMs / 1000)
        
        // Include if purchased before or on this timestamp
        // (adding a small buffer because of timezone differences)
        if (t >= (buyDateUnix - 86400)) {
          const symbolData = candlesBySymbol[pos.symbol]
          let price = pos.currentPriceUsd || 0
          
          if (symbolData && symbolData.s === 'ok' && symbolData.t) {
            // Find closest previous price
            let found = false
            for (let i = symbolData.t.length - 1; i >= 0; i--) {
              if (symbolData.t[i] <= t) {
                price = symbolData.c[i]
                found = true
                break
              }
            }
            if (found) hasDataForTimestamp = true
          }

          const value = pos.shares * price * exchangeRate
          const cost = pos.shares * pos.averageCost * exchangeRate
          
          totalValue += value
          totalCost += cost
        }
      })

      // Skip timestamps where we owned nothing
      if (totalCost === 0) return null

      return {
        t,
        date: new Date(t * 1000).toLocaleDateString(),
        v: totalValue, // total portfolio value
        pnl: totalValue - totalCost // absolute PnL
      }
    }).filter(Boolean)

    return finalData
  }, [candlesBySymbol, positions, currency, dollarRates, dollarType])

  return {
    chartData,
    isLoading
  }
}
