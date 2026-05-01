import { useEffect } from 'react'
import { onAuthChange } from '../services/auth'
import useAppStore from '../store/useAppStore'
import { getUserPreferences } from '../services/firestore'

export function useAuth() {
  const { user, isAuthLoading, setUser, setAuthLoading } = useAppStore()

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Load user preferences
        try {
          const prefs = await getUserPreferences(firebaseUser.uid)
          if (prefs?.preferredCurrency) {
            useAppStore.getState().setCurrency(prefs.preferredCurrency)
          }
          if (prefs?.preferredDollarType) {
            useAppStore.getState().setDollarType(prefs.preferredDollarType)
          }
        } catch (err) {
          console.warn('Failed to load user preferences:', err)
        }
        setUser(firebaseUser)
      } else {
        setUser(null)
      }
    })

    return () => unsubscribe()
  }, [])

  return { user, isAuthLoading }
}
