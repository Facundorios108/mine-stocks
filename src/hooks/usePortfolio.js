import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPositions } from '../services/firestore'
import { getBatchQuotes } from '../services/marketData'
import { getAllDollarRates } from '../services/currency'
import useAppStore from '../store/useAppStore'

export function usePortfolio() {
  const user = useAppStore(s => s.user)
  const positions = useAppStore(s => s.positions)
  const setPositions = useAppStore(s => s.setPositions)
  const quotes = useAppStore(s => s.quotes)
  const setQuotes = useAppStore(s => s.setQuotes)
  const setDollarRates = useAppStore(s => s.setDollarRates)
  const dollarRates = useAppStore(s => s.dollarRates)
  const currency = useAppStore(s => s.currency)
  const cashBalance = useAppStore(s => s.cashBalance)
  const setLastFetchedAt = useAppStore(s => s.setLastFetchedAt)
  const queryClient = useQueryClient()

  // Check if we have cached data from localStorage (via zustand persist)
  const hasCachedPositions = positions.length > 0
  const hasCachedQuotes = Object.keys(quotes).length > 0

  // Fetch positions from Firestore
  const positionsQuery = useQuery({
    queryKey: ['positions', user?.uid],
    queryFn: () => getPositions(user.uid),
    enabled: !!user?.uid,
    staleTime: 60000, // 60s — don't refetch on every navigation
    gcTime: 10 * 60 * 1000,
    retry: 1,
    networkMode: 'offlineFirst',
    // If we have cached positions, use them as placeholder while fresh data loads
    placeholderData: hasCachedPositions ? positions : undefined
  })

  // Extract unique symbols from positions
  const symbols = [...new Set(positions.map(p => p.symbol))]

  // Fetch quotes for all position symbols
  const quotesQuery = useQuery({
    queryKey: ['quotes', symbols.join(',')],
    queryFn: () => getBatchQuotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60000,
    retry: false, // Do not retry Finnhub API if it fails, fallback to cache
    networkMode: 'offlineFirst',
    // Use cached quotes as placeholder
    placeholderData: hasCachedQuotes ? quotes : undefined
  })

  // Fetch dollar rates
  const ratesQuery = useQuery({
    queryKey: ['dollarRates'],
    queryFn: getAllDollarRates,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
    networkMode: 'offlineFirst',
    placeholderData: dollarRates || undefined
  })

  // Update positions when Firestore data changes
  useEffect(() => {
    if (positionsQuery.data) {
      setPositions(positionsQuery.data)
      setLastFetchedAt()
    }
  }, [positionsQuery.data])

  // Update quotes when fetched
  useEffect(() => {
    if (quotesQuery.data) {
      setQuotes(quotesQuery.data)
    }
  }, [quotesQuery.data])

  // Update dollar rates
  useEffect(() => {
    if (ratesQuery.data) {
      setDollarRates(ratesQuery.data)
    }
  }, [ratesQuery.data])

  // Refresh everything
  const refresh = useCallback(async () => {
    useAppStore.getState().setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['positions'] }),
      queryClient.invalidateQueries({ queryKey: ['quotes'] }),
      queryClient.invalidateQueries({ queryKey: ['dollarRates'] })
    ])
    useAppStore.getState().setRefreshing(false)
  }, [queryClient])

  // Calculate portfolio metrics
  const getPortfolioValue = useCallback(() => {
    let totalCostBasis = 0; // Actual money invested in current open positions (USD)
    let totalMarketValue = 0; // Current market value of open positions (USD)
    let totalRealizedPnL = 0;
    let totalRealizedCost = 0;

    positions.forEach(pos => {
      // 1. Open positions contribution
      const quote = quotes[pos.symbol]
      const currentPrice = quote?.c || 0
      const cost = pos.shares * pos.averageCost
      const value = pos.shares * currentPrice

      totalCostBasis += cost
      totalMarketValue += value

      // 2. Realized PnL contribution from sell transactions
      if (pos.transactions) {
        pos.transactions.forEach(t => {
          if (t.type === 'sell') {
            // Use historical average cost if available, otherwise fallback
            const costAtSale = t.averageCostAtSale || pos.averageCost || t.price
            const pnl = t.shares * (t.price - costAtSale)
            totalRealizedPnL += pnl
            totalRealizedCost += (t.shares * costAtSale)
          }
        })
      }
    })

    let dailyPnL = 0
    positions.forEach(pos => {
      const quote = quotes[pos.symbol]
      if (quote && pos.shares > 0) {
        dailyPnL += pos.shares * (quote.d || 0)
      }
    })

    // Unrealized PnL = Current Market Value - Cost Basis
    const unrealizedPnL = totalMarketValue - totalCostBasis
    // Total PnL = Unrealized + Realized
    const totalPnL = unrealizedPnL + totalRealizedPnL
    
    // Calculate PnL % based on total capital used (active cost + historical sold cost)
    // This gives a true representation of portfolio performance over time
    const totalCapitalUsed = totalCostBasis + totalRealizedCost
    const totalPnLPercent = totalCapitalUsed > 0 ? (totalPnL / totalCapitalUsed) * 100 : 0
    
    const netWorth = totalMarketValue + cashBalance

    // Convert to ARS if needed
    let exchangeRate = 1
    if (currency === 'ARS' && dollarRates) {
      const rate = dollarRates['oficial']
      exchangeRate = rate?.buy || rate?.sell || 1
    }

    const displayMarketValue = totalMarketValue * exchangeRate
    const displayCash = cashBalance * exchangeRate
    const displayNetWorth = netWorth * exchangeRate
    const displayInvested = totalCostBasis * exchangeRate
    const displayPnL = totalPnL * exchangeRate
    const displayDailyPnL = dailyPnL * exchangeRate
    
    // Daily percent change = (today_change) / (previous_day_market_value)
    const prevMarketValue = totalMarketValue - dailyPnL
    const displayDailyPnLPercent = prevMarketValue > 0 ? (dailyPnL / prevMarketValue) * 100 : 0

    return {
      netWorth: displayNetWorth,
      totalValue: displayNetWorth, 
      marketValue: displayMarketValue,
      invested: displayInvested, // This is what the user actually spent
      cashBalance: displayCash,
      totalPnL: displayPnL,
      totalPnLPercent,
      dailyPnL: displayDailyPnL,
      dailyPnLPercent: displayDailyPnLPercent,
      unrealizedPnL: unrealizedPnL * exchangeRate,
      realizedPnL: totalRealizedPnL * exchangeRate,
      exchangeRate,
      positionCount: positions.filter(p => p.shares > 0).length
    }
  }, [positions, quotes, currency, dollarRates, cashBalance])

  // Get enriched position data (with current prices)
  const getEnrichedPositions = useCallback(() => {
    return positions.map(pos => {
      const quote = quotes[pos.symbol]
      const currentPrice = quote?.c || 0
      const change = quote?.d || 0
      const changePercent = quote?.dp || 0
      const cost = pos.shares * pos.averageCost
      const value = pos.shares * currentPrice
      const pnl = value - cost
      const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0

      let displayPrice = currentPrice
      let displayValue = value
      let displayCost = cost
      let displayPnl = pnl

      if (currency === 'ARS' && dollarRates) {
        const rate = dollarRates['oficial']?.buy || dollarRates['oficial']?.sell || 1
        displayPrice = currentPrice * rate
        displayValue = value * rate
        displayCost = cost * rate
        displayPnl = pnl * rate
      }

      return {
        ...pos,
        currentPrice: displayPrice,
        currentPriceUsd: currentPrice,
        change,
        changePercent,
        totalValue: displayValue,
        cost: displayCost,
        pnlAmount: displayPnl,
        pnlPercent,
        isGain: pnl >= 0,
        quoteLoaded: !!quote
      }
    })
  }, [positions, quotes, currency, dollarRates])

  // The key insight: if we have cached data, we are NOT loading
  // We show cached data instantly and update silently in background
  const isActuallyLoading = positionsQuery.isLoading && !hasCachedPositions
  const quotesActuallyLoading = quotesQuery.isLoading && !hasCachedQuotes

  return {
    positions,
    quotes,
    isLoading: isActuallyLoading,
    quotesLoading: quotesActuallyLoading,
    isRefreshing: quotesQuery.isFetching && !quotesQuery.isLoading,
    refresh,
    getPortfolioValue,
    getEnrichedPositions,
    dollarRates,
    error: positionsQuery.error || quotesQuery.error
  }
}
