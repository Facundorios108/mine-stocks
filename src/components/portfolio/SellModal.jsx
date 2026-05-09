import { useState, useEffect } from 'react'
import { DollarSign, PieChart, Info, AlertCircle, ArrowUpRight, Wallet } from 'lucide-react'
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
          className={`sell-confirm-btn ${isInvalid ? 'disabled' : ''}`}
          disabled={isInvalid || isSelling}
          onClick={handleSell}
        >
          {isSelling ? (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ display: 'flex' }}
            >
              <ArrowUpRight size={20} />
            </motion.div>
          ) : (
            <>
              Confirmar Venta
              <ArrowUpRight size={20} />
            </>
          )}
        </button>
      }
    >
      <div className="sell-modal-inner">
        {/* Asset Header Card */}
        <div className="sell-asset-card">
          <div className="asset-info-main">
            <div className="asset-badge">
              <PieChart size={24} />
            </div>
            <div className="asset-details">
              <span className="asset-symbol">{position?.symbol}</span>
              <span className="asset-name">{position?.name || 'Asset'}</span>
            </div>
          </div>
          <div className="asset-stats">
            <div className="stat-item">
              <span className="stat-label">Disponibles</span>
              <span className="stat-value">{position?.shares?.toLocaleString()}</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-label">Precio Mercado</span>
              <span className="stat-value">{formatPrice(position?.currentPriceUsd * currentExchangeRate, currency)}</span>
            </div>
          </div>
        </div>

        <div className="sell-form-grid">
          {/* Shares Input */}
          <div className="input-premium-group">
            <div className="input-header-row">
              <label className="input-premium-label">Cantidad a vender</label>
              <button 
                className="max-action-link" 
                onClick={() => {
                  haptic.light();
                  setSharesToSell(position.shares);
                }}
              >
                Vender todo
              </button>
            </div>
            <div className={`input-premium-wrapper ${sharesToSell > position?.shares ? 'has-error' : ''}`}>
              <input 
                type="number" 
                inputMode="decimal"
                value={sharesToSell || ''}
                onChange={e => setSharesToSell(Number(e.target.value))}
                placeholder="0.00"
              />
              <span className="input-premium-unit">Shares</span>
            </div>
            {sharesToSell > position?.shares && (
              <motion.div 
                className="error-bubble"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={14} />
                <span>Supera tu tenencia actual</span>
              </motion.div>
            )}
          </div>

          {/* Price Input */}
          <div className="input-premium-group">
            <label className="input-premium-label">Precio de Venta ({currency})</label>
            <div className="input-premium-wrapper">
              <span className="currency-prefix">{currency === 'USD' ? '$' : 'AR$'}</span>
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

        {/* Credit Summary */}
        <div className="sell-credit-card">
          <div className="credit-main">
            <div className="credit-label">
              <Wallet size={16} />
              Recibirás estimado
            </div>
            <div className="credit-amount">
              {formatCurrency(totalCreditPreviewUsd, 'USD')}
            </div>
          </div>
          <div className="credit-note">
            <Info size={14} />
            <span>Se acreditará en tu saldo en USD</span>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
