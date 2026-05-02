/**
 * Trigger device vibration for haptic feedback.
 * Works on Android. iOS web support is very limited/non-existent for navigator.vibrate, 
 * but it's safe to call without breaking anything.
 */
export const haptic = {
  light: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
  },
  medium: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20)
    }
  },
  heavy: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40)
    }
  },
  success: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 100, 20])
    }
  },
  error: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 100, 50, 100, 50])
    }
  }
}
