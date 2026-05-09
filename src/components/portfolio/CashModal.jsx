import React, { useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import useAppStore from '../../store/useAppStore';
import { updateUserPreferences } from '../../services/firestore';
import { formatCurrency } from '../../utils/formatters';
import { haptic } from '../../utils/haptics';
import BottomSheet from '../common/BottomSheet';
import './CashModal.css';

export default function CashModal({ isOpen, onClose, initialAction = 'deposit' }) {
  const { user, cashBalance, setCashBalance, currency, showToast } = useAppStore();
  const [action, setAction] = useState(initialAction);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAction(initialAction);
  }, [initialAction]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    const dollarRates = useAppStore.getState().dollarRates
    let exchangeRate = 1

    if (currency === 'ARS' && dollarRates) {
      const rate = dollarRates['oficial']
      exchangeRate = rate?.buy || rate?.sell || 1
    }

    const normalizedAmount = numAmount / exchangeRate

    if (action === 'withdraw' && normalizedAmount > cashBalance) {
      setError('Saldo insuficiente para retirar');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const newBalance = action === 'deposit' 
        ? cashBalance + normalizedAmount 
        : cashBalance - normalizedAmount;

      setCashBalance(newBalance);
      
      if (user?.uid) {
        await updateUserPreferences(user.uid, { cashBalance: newBalance });
      }

      showToast(
        `Efectivo ${action === 'deposit' ? 'depositado' : 'retirado'} con éxito`,
        'success'
      );
      onClose();
    } catch (err) {
      console.error('Error updating cash balance:', err);
      showToast('Error al actualizar el saldo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Gestión de Efectivo"
      footer={
        <button 
          type="submit" 
          form="cash-form"
          className="btn-primary" 
          disabled={isSubmitting || !amount}
          style={{ width: '100%', margin: 0 }}
        >
          {isSubmitting ? 'Procesando...' : 'Confirmar Operación'}
        </button>
      }
    >
      <div className="cash-modal-inner">
        <div className="cash-balance-card">
          <div className="balance-info">
            <span className="balance-label">Poder de compra actual</span>
            <div className="balance-value-row">
              <span className="balance-value">
                {formatCurrency(cashBalance * (currency === 'ARS' ? (useAppStore.getState().dollarRates?.['oficial']?.buy || 1) : 1), currency)}
              </span>
            </div>
          </div>
          <div className="balance-visual">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="cash-action-selector">
          <div className="tabs-container">
            <button 
              className={`action-tab ${action === 'deposit' ? 'active deposit' : ''}`}
              onClick={() => { setAction('deposit'); setError(''); haptic.light(); }}
            >
              <ArrowDownCircle size={20} />
              <span>Ingresar</span>
            </button>
            <button 
              className={`action-tab ${action === 'withdraw' ? 'active withdraw' : ''}`}
              onClick={() => { setAction('withdraw'); setError(''); haptic.light(); }}
            >
              <ArrowUpCircle size={20} />
              <span>Retirar</span>
            </button>
            <div className={`tab-indicator ${action}`} />
          </div>
        </div>

        <form className="cash-form" id="cash-form" onSubmit={handleSubmit}>
          <div className="input-premium-group">
            <label className="input-premium-label">Monto a {action === 'deposit' ? 'depositar' : 'retirar'}</label>
            <div className={`input-premium-wrapper ${error ? 'has-error' : ''}`}>
              <span className="currency-prefix">{currency === 'USD' ? '$' : 'AR$'}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
              />
            </div>
            
            {error && (
              <motion.div 
                className="error-bubble"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </motion.div>
            )}
          </div>

          <div className="quick-amounts">
            {[10, 50, 100, 500].map(val => (
              <button 
                key={val} 
                type="button" 
                className="quick-chip"
                onClick={() => { setAmount(val.toString()); haptic.light(); }}
              >
                +{val}
              </button>
            ))}
          </div>
        </form>
      </div>
    </BottomSheet>
  );
}
