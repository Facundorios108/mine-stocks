import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '¿Estás seguro?', 
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger' // 'danger' | 'warning' | 'primary'
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="confirm-modal-root">
          <motion.div
            className="confirm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="confirm-modal-container">
            <motion.div
              className="confirm-modal-content glass"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <button className="confirm-modal-close" onClick={onClose}>
                <X size={20} />
              </button>
              
              <div className="confirm-modal-body">
                <div className={`confirm-modal-icon ${variant}`}>
                  <AlertTriangle size={32} />
                </div>
                <h3 className="confirm-modal-title">{title}</h3>
                <p className="confirm-modal-message">{message}</p>
              </div>
              
              <div className="confirm-modal-footer">
                <button className="confirm-btn-cancel" onClick={onClose}>
                  {cancelText}
                </button>
                <button 
                  className={`confirm-btn-action ${variant}`} 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
