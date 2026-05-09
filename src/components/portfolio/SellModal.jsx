import { useState, useEffect } from 'react'
import { DollarSign, PieChart, Info, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatCurrency, formatPrice } from '../../utils/formatters'
import useAppStore from '../../store/useAppStore'
import { updatePosition, updateUserPreferences } from '../../services/firestore'
import { haptic } from '../../utils/haptics'
import BottomSheet from '../common/BottomSheet'
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

      updatePositionInStore(position.id, positionUpdates)
      setCashBalance(newCashBalance)

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

  const currentExchangeRate = (currency === 'ARS' ? (useAppStore.getState().dollarRates?.['oficial']?.buy || 1) : 1)
  const totalCreditPreviewUsd = (sharesToSell * sellingPrice) / currentExchangeRate

  return (
    <BottomSheet 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Vender ${position?.symbol}`}
      footer={
        <button 
          className={`sell-action-btn ${isInvalid ? 'disabled' : ''}`}
          disabled={isInvalid || isSelling}
          onClick={handleSell}
          style={{ width: '100%', margin: 0 }}
        >
          {isSelling ? 'Procesando...' : 'Confirmar Venta'}
        </button>
      }
    >
      <div className="sell-modal-inner">
        <div className="sell-summary-cards">
          <div className="sell-summary-card">
            <span className="card-label">Disponibles</span>
            <span className="card-value">{position?.shares?.toLocaleString()}</span>
          </div>
          <div className="sell-summary-card">
            <span className="card-label">Precio Mercado</span>
            <span className="card-value">{formatPrice(position?.currentPrice, currency)}</span>
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
            {sharesToSell > position?.shares && (
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
            <span className="preview-value">{formatCurrency(totalCreditPreviewUsd, 'USD')}</span>
          </div>
          <div className="preview-info">
            <Info size={14} />
            <span>El monto se sumará a tu poder de compra (USD).</span>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
