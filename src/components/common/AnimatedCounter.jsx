import { useEffect, useRef, useState } from 'react'
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'

/**
 * AnimatedCounter — Animates a number value change with smooth counting.
 * Used for portfolio balance, PnL, and other financial figures.
 *
 * @param {number} value - The target number
 * @param {function} formatter - Function to format the number for display (e.g., formatCurrency)
 * @param {number} duration - Animation duration in seconds
 * @param {string} className - CSS class for the container
 */
export default function AnimatedCounter({
  value = 0,
  formatter = (v) => v.toLocaleString(),
  duration = 0.8,
  className = ''
}) {
  const motionValue = useMotionValue(0)
  const [display, setDisplay] = useState(formatter(0))
  const prevValue = useRef(0)
  const isFirst = useRef(true)

  useEffect(() => {
    // Skip animation on first render if value is 0
    if (isFirst.current && value === 0) {
      isFirst.current = false
      return
    }

    const from = isFirst.current ? 0 : prevValue.current
    isFirst.current = false
    prevValue.current = value

    const controls = animate(from, value, {
      duration,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (latest) => {
        setDisplay(formatter(latest))
      }
    })

    return () => controls.stop()
  }, [value, duration, formatter])

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {display}
    </motion.span>
  )
}
