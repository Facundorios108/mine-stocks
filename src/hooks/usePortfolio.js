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
  const dollarType = useAppStore(s => s.dollarType)
  const queryClient = useQueryClient()

  // Fetch positions from Firestore
  const positionsQuery = useQuery({
    queryKey: ['positions', user?.uid],
    queryFn: () => getPositions(user.uid),
    enabled: !!user?.uid,
    staleTime: 30000,
    onSuccess: (data) => setPositions(data)
  })

  // Extract unique symbols from positions
  const symbols = [...new Set(positions.map(p => p.symbol))]

  // Fetch quotes for all position symbols
  const quotesQuery = useQuery({
    queryKey: ['quotes', symbols.join(',')],
    queryFn: () => getBatchQuotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 30000, // 30 second cache
    refetchInterval: 60000, // Auto-refetch every 60s
    onSuccess: (data) => setQuotes(data)
  })

  // Fetch dollar rates
  const ratesQuery = useQuery({
    queryKey: ['dollarRates'],
    queryFn: getAllDollarRates,
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchInterval: 5 * 60 * 1000,
    onSuccess: (data) => setDollarRates(data)
  })

  // Update positions when Firestore data changes
  useEffect(() => {
    if (positionsQuery.data) {
      setPositions(positionsQuery.data)
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
    let totalCost = 0
    let totalValue = 0

    positions.forEach(pos => {
      const quote = quotes[pos.symbol]
      const currentPrice = quote?.c || 0
      const cost = pos.quantity * pos.avgPrice
      const value = pos.quantity * currentPrice

      totalCost += cost
      totalValue += value
    })

    const totalPnL = totalValue - totalCost
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

    // Convert to ARS if needed
    let displayValue = totalValue
    let displayCost = totalCost
    let displayPnL = totalPnL
    let exchangeRate = 1

    if (currency === 'ARS' && dollarRates) {
      const rate = dollarRates[dollarType]
      exchangeRate = rate?.sell || 1
      displayValue = totalValue * exchangeRate
      displayCost = totalCost * exchangeRate
      displayPnL = totalPnL * exchangeRate
    }

    return {
      totalValue: displayValue,
      totalCost: displayCost,
      totalPnL: displayPnL,
      totalPnLPercent,
      exchangeRate,
      positionCount: positions.length
    }
  }, [positions, quotes, currency, dollarRates, dollarType])

  // Get enriched position data (with current prices)
  const getEnrichedPositions = useCallback(() => {
    return positions.map(pos => {
      const quote = quotes[pos.symbol]
      const currentPrice = quote?.c || 0
      const change = quote?.d || 0
      const changePercent = quote?.dp || 0
      const cost = pos.quantity * pos.avgPrice
      const value = pos.quantity * currentPrice
      const pnl = value - cost
      const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0

      let displayPrice = currentPrice
      let displayValue = value
      let displayCost = cost
      let displayPnl = pnl

      if (currency === 'ARS' && dollarRates) {
        const rate = dollarRates[dollarType]?.sell || 1
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
        value: displayValue,
        cost: displayCost,
        pnl: displayPnl,
        pnlPercent,
        isGain: pnl >= 0,
        quoteLoaded: !!quote
      }
    })
  }, [positions, quotes, currency, dollarRates, dollarType])

  return {
    positions,
    quotes,
    isLoading: positionsQuery.isLoading || quotesQuery.isLoading,
    isRefreshing: quotesQuery.isFetching,
    refresh,
    getPortfolioValue,
    getEnrichedPositions,
    dollarRates,
    error: positionsQuery.error || quotesQuery.error
  }
}
