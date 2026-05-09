import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownCircle, ArrowUpCircle, DollarSign, AlertCircle } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { updateUserPreferences } from '../../services/firestore';
import { formatCurrency } from '../../utils/formatters';
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
    e.preventDefault();
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

    // Amount to update in the USD-based store
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

      // Update local state first for instant feedback
      setCashBalance(newBalance);
      
      // Sync with Firestore
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
      // Rollback local state if sync fails significantly? 
      // For now, let persist handle it.
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="modal-content cash-modal glass"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">Gestión de Efectivo</h2>
            <p className="modal-subtitle">Actualiza tu poder de compra</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="cash-balance-summary">
          <span className="summary-label">Saldo Actual</span>
          <span className="summary-value">{formatCurrency(cashBalance * (currency === 'ARS' ? (useAppStore.getState().dollarRates?.['oficial']?.buy || 1) : 1), currency)}</span>
        </div>

        <div className="cash-tabs">
          <button 
            className={`cash-tab ${action === 'deposit' ? 'active' : ''}`}
            onClick={() => { setAction('deposit'); setError(''); }}
          >
            <ArrowDownCircle size={18} />
            Depositar
          </button>
          <button 
            className={`cash-tab ${action === 'withdraw' ? 'active' : ''}`}
            onClick={() => { setAction('withdraw'); setError(''); }}
          >
            <ArrowUpCircle size={18} />
            Retirar
          </button>
        </div>

        <form className="cash-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Monto a {action === 'deposit' ? 'depositar' : 'retirar'} ({currency})</label>
            <div className="input-wrapper">
              <DollarSign size={20} className="input-icon" />
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className={error ? 'input-error' : ''}
              />
            </div>
            {error && (
              <div className="error-message">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting || !amount}
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Operación'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
