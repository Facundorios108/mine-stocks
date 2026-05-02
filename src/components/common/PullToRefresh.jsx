import { useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { haptic } from '../../utils/haptics'
import './PullToRefresh.css'

export default function PullToRefresh({ children, onRefresh }) {
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  
  const MAX_PULL = 120 // max distance in px
  const THRESHOLD = 70 // distance to trigger refresh
  
  const handleTouchStart = (e) => {
    // Only engage if we are at the very top
    if (window.scrollY <= 0) {
      setStartY(e.touches[0].clientY)
    } else {
      setStartY(0)
    }
  }

  const handleTouchMove = (e) => {
    if (startY === 0 || isRefreshing) return
    
    const y = e.touches[0].clientY
    const delta = y - startY
    
    if (delta > 0 && window.scrollY <= 0) {
      // Pulling down
      const newY = Math.min(delta * 0.4, MAX_PULL) // Add resistance
      setCurrentY(newY)
      setPullProgress(Math.min(newY / THRESHOLD, 1))
      // e.preventDefault() is not used here to avoid passive listener issues
      // overscroll-behavior-y: none in globals.css handles browser native pull-to-refresh prevention
    } else if (delta < 0) {
       // Scrolling down normally
       setCurrentY(0)
       setPullProgress(0)
       setStartY(0) // Reset to allow normal scrolling
    }
  }

  const handleTouchEnd = async () => {
    if (currentY === 0 || isRefreshing) return
    
    if (currentY >= THRESHOLD) {
      // Trigger refresh
      haptic.medium()
      setIsRefreshing(true)
      setCurrentY(60) // Hold at 60px while refreshing
      
      try {
        if (onRefresh) await onRefresh()
        haptic.success()
      } catch (error) {
        haptic.error()
      } finally {
        setIsRefreshing(false)
        setCurrentY(0)
        setPullProgress(0)
      }
    } else {
      // Cancel
      setCurrentY(0)
      setPullProgress(0)
    }
    setStartY(0)
  }

  return (
    <div 
      className="pull-to-refresh-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={`pull-indicator ${isRefreshing ? 'refreshing' : ''}`}
        style={{ 
          transform: `translateY(${currentY}px)`,
          opacity: pullProgress > 0 || isRefreshing ? 1 : 0
        }}
      >
        <div 
          className={`pull-spinner ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: isRefreshing ? 'none' : `rotate(${pullProgress * 360}deg)` }}
        >
          <RefreshCcw size={22} strokeWidth={2} />
        </div>
      </div>
      
      <div 
        className="pull-content"
        style={{ 
          transform: `translateY(${currentY}px)`,
          transition: isRefreshing || startY === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}
