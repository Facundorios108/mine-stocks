import { useEffect } from 'react'
import { onAuthChange } from '../services/auth'
import useAppStore from '../store/useAppStore'
import { getUserPreferences } from '../services/firestore'

export function useAuth() {
  const { user, isAuthLoading, setUser, setAuthLoading } = useAppStore()

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Set user immediately to unblock UI and allow navigation
        setUser(firebaseUser)
        
        // Load user preferences in background
        try {
          const prefs = await getUserPreferences(firebaseUser.uid)
          if (prefs?.preferredCurrency) {
            useAppStore.getState().setCurrency(prefs.preferredCurrency)
          }
          if (prefs?.preferredDollarType) {
            useAppStore.getState().setDollarType(prefs.preferredDollarType)
          }
          if (prefs?.cashBalance !== undefined) {
            useAppStore.getState().setCashBalance(prefs.cashBalance)
          }
        } catch (err) {
          console.warn('Failed to load user preferences:', err)
        }
      } else {
        setUser(null)
      }
    })

    return () => unsubscribe()
  }, [])

  return { user, isAuthLoading }
}
