import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set, get) => ({
      // Auth (NOT persisted - handled by Firebase)
      user: null,
      isAuthLoading: true,
      setUser: (user) => set({ user, isAuthLoading: false }),
      setAuthLoading: (loading) => set({ isAuthLoading: loading }),

      // Currency
      currency: 'USD', // 'USD' | 'ARS'
      dollarRates: null,
      dollarType: 'oficial', // preferred dollar rate type: 'blue' | 'oficial' | 'bolsa' | 'contadoconliqui'
      toggleCurrency: () => set((state) => ({
        currency: state.currency === 'USD' ? 'ARS' : 'USD'
      })),
      setCurrency: (currency) => set({ currency }),
      setDollarRates: (rates) => set({ dollarRates: rates }),
      setDollarType: (type) => set({ dollarType: type }),

      // Cash Management
      cashBalance: 0,
      setCashBalance: (amount) => set({ cashBalance: amount }),

      // Positions (PERSISTED → instant load on app open)
      positions: [],
      setPositions: (positions) => set({ positions }),
      addPositionToStore: (position) => set((state) => ({
        positions: [position, ...state.positions]
      })),
      removePositionFromStore: (id) => set((state) => ({
        positions: state.positions.filter(p => p.id !== id)
      })),
      updatePositionInStore: (id, updates) => set((state) => ({
        positions: state.positions.map(p =>
          p.id === id ? { ...p, ...updates } : p
        )
      })),

      // Quotes (PERSISTED → show last known prices instantly)
      quotes: {},
      setQuotes: (quotes) => set({ quotes }),
      updateQuote: (symbol, quote) => set((state) => ({
        quotes: { ...state.quotes, [symbol]: quote }
      })),

      // Cache timestamp
      lastFetchedAt: null,
      setLastFetchedAt: () => set({ lastFetchedAt: Date.now() }),

      // Search Cache (PERSISTED)
      searchCache: {
        trending: [],
        categories: {} // { 'Tecnología': [...], 'Finanzas': [...] }
      },
      setSearchCache: (updates) => set((state) => ({
        searchCache: { ...state.searchCache, ...updates }
      })),

      // UI
      isRefreshing: false,
      setRefreshing: (isRefreshing) => set({ isRefreshing }),

      // Toast
      toast: null,
      showToast: (message, type = 'success') => {
        set({ toast: { message, type } })
        setTimeout(() => set({ toast: null }), 3000)
      }
    }),
    {
      name: 'mine-stocks-cache',
      // Only persist these keys to localStorage (not auth, toast, etc.)
      partialize: (state) => ({
        positions: state.positions,
        quotes: state.quotes,
        currency: state.currency,
        dollarRates: state.dollarRates,
        dollarType: state.dollarType,
        cashBalance: state.cashBalance,
        lastFetchedAt: state.lastFetchedAt,
        searchCache: state.searchCache
      })
    }
  )
)

export default useAppStore
