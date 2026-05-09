import { useState, useEffect } from 'react'
import { X, DollarSign, PieChart, Info, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency, formatPrice } from '../../utils/formatters'
import useAppStore from '../../store/useAppStore'
import { updatePosition, updateUserPreferences } from '../../services/firestore'
import { haptic } from '../../utils/haptics'
import './SellModal.css'

export default function SellModal({ isOpen, onClose, position, onSold }) {
  const currency = useAppStore(s => s.currency)
  const cashBalance = useAppStore(s => s.cashBalance)
  const setCashBalance = useAppStore(s => s.setCashBalance)
  const updatePositionInStore = useAppStore(s => s.updatePositionInStore)
  const showToast = useAppStore(s => s.showToast)
  const user = useAppStore(s => s.user)

  const [sharesToSell, setSharesToSell] = useState(0)
  const [sellingPrice, setSellingPrice] = useState(0)
  const [isSelling, setIsSelling] = useState(false)

  useEffect(() => {
    if (position && isOpen) {
      setSharesToSell(position.shares)
      
      const dollarRates = useAppStore.getState().dollarRates
      let exchangeRate = 1
      if (currency === 'ARS' && dollarRates) {
        const rate = dollarRates['oficial']
        exchangeRate = rate?.buy || rate?.sell || 1
      }
      
      // Default to current market price in display currency
      setSellingPrice(position.currentPriceUsd * exchangeRate)
    }
  }, [position, isOpen, currency])

  const isInvalid = sharesToSell <= 0 || sharesToSell > position?.shares || sellingPrice <= 0

  const handleSell = async () => {
    if (isInvalid) return

    haptic.medium()
    setIsSelling(true)

    try {
      const dollarRates = useAppStore.getState().dollarRates
      let exchangeRate = 1
      if (currency === 'ARS' && dollarRates) {
        const rate = dollarRates['oficial']
        exchangeRate = rate?.buy || rate?.sell || 1
      }

      // Convert entered price back to USD for storage
      const priceInUsd = sellingPrice / exchangeRate
      const totalCreditUsd = sharesToSell * priceInUsd

      const remainingShares = position.shares - sharesToSell
      const newCashBalance = cashBalance + totalCreditUsd

      const transaction = {
        id: crypto.randomUUID(),
        type: 'sell',
        shares: Number(sharesToSell),
        price: Number(priceInUsd),
        averageCostAtSale: position.averageCost,
        date: new Date().toISOString(),
        total: totalCreditUsd
      }

      const updatedTransactions = [...(position.transactions || []), transaction]
      const positionUpdates = {
        shares: remainingShares,
        transactions: updatedTransactions
      }

      // Optimistic
      updatePositionInStore(position.id, positionUpdates)
      setCashBalance(newCashBalance)

      // Sync
      updatePosition(user.uid, position.id, positionUpdates)
      await updateUserPreferences(user.uid, { cashBalance: newCashBalance })

      showToast(`Vendiste ${sharesToSell} ${position.symbol}`)
      if (onSold) onSold()
      onClose()
    } catch (error) {
      console.error('Error selling:', error)
      showToast('Error al procesar la venta', 'error')
    } finally {
      setIsSelling(false)
    }
  }

  // Calculate preview in USD (underlying logic) and then convert for display if needed
  const totalCreditUsd = (sharesToSell * sellingPrice) / (currency === 'ARS' ? (useAppStore.getState().dollarRates?.['oficial']?.buy || 1) : 1)
  
  return (
    <AnimatePresence>
      {isOpen && position && (
        <div className="sell-modal-root">
          <motion.div 
            className="sell-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div 
            className="sell-modal-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose()
            }}
          >
            <div className="sheet-handle" />
            
            <header className="sell-sheet-header">
              <div className="sell-sheet-title-row">
                <div className="symbol-badge">{position.symbol}</div>
                <h2>Vender Posición</h2>
              </div>
              <button className="sheet-close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </header>

            <div className="sell-sheet-body">
              <div className="sell-summary-cards">
                <div className="sell-summary-card">
                  <span className="card-label">Disponibles</span>
                  <span className="card-value">{position.shares.toLocaleString()}</span>
                </div>
                <div className="sell-summary-card">
                  <span className="card-label">Precio Mercado</span>
                  <span className="card-value">{formatPrice(position.currentPrice, currency)}</span>
                </div>
              </div>

              <div className="sell-input-section">
                <div className="sell-input-group">
                  <div className="input-label-row">
                    <label>Cantidad a vender</label>
                    <button className="max-link" onClick={() => setSharesToSell(position.shares)}>
                      Vender todo
                    </button>
                  </div>
                  <div className="premium-input-wrapper">
                    <input 
                      type="number" 
                      inputMode="decimal"
                      value={sharesToSell || ''}
                      onChange={e => setSharesToSell(Number(e.target.value))}
                      placeholder="0.00"
                    />
                    <span className="input-suffix">Shares</span>
                  </div>
                  {sharesToSell > position.shares && (
                    <motion.div 
                      className="input-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <AlertCircle size={14} />
                      <span>Excede el máximo disponible</span>
                    </motion.div>
                  )}
                </div>

                <div className="sell-input-group">
                  <label>Precio de Venta ({currency})</label>
                  <div className="premium-input-wrapper">
                    <DollarSign size={18} className="input-icon" />
                    <input 
                      type="number" 
                      inputMode="decimal"
                      value={sellingPrice || ''}
                      onChange={e => setSellingPrice(Number(e.target.value))}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="sell-total-preview">
                <div className="preview-content">
                  <span className="preview-label">Recibirás estimado</span>
                  <span className="preview-value">{formatCurrency(sharesToSell * (sellingPrice / (currency === 'ARS' ? (useAppStore.getState().dollarRates?.['oficial']?.buy || 1) : 1)), 'USD')}</span>
                </div>
                <div className="preview-info">
                  <Info size={14} />
                  <span>El monto se sumará a tu poder de compra (USD).</span>
                </div>
              </div>
            </div>

            <footer className="sell-sheet-footer">
              <button 
                className={`sell-action-btn ${isInvalid ? 'disabled' : ''}`}
                disabled={isInvalid || isSelling}
                onClick={handleSell}
              >
                {isSelling ? (
                  <div className="loader-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                ) : (
                  'Confirmar Venta'
                )}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
