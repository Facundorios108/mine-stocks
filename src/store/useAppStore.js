import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // Auth
  user: null,
  isAuthLoading: true,
  setUser: (user) => set({ user, isAuthLoading: false }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),

  // Currency
  currency: 'USD', // 'USD' | 'ARS'
  dollarType: 'blue',
  dollarRates: null,
  toggleCurrency: () => set((state) => ({
    currency: state.currency === 'USD' ? 'ARS' : 'USD'
  })),
  setCurrency: (currency) => set({ currency }),
  setDollarType: (dollarType) => set({ dollarType }),
  setDollarRates: (rates) => set({ dollarRates: rates }),

  // Positions
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

  // Quotes (real-time prices)
  quotes: {},
  setQuotes: (quotes) => set({ quotes }),
  updateQuote: (symbol, quote) => set((state) => ({
    quotes: { ...state.quotes, [symbol]: quote }
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
}))

export default useAppStore
