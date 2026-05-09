import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BottomSheet.css';

export default function BottomSheet({ isOpen, onClose, children, title, footer }) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="bottom-sheet-container glass"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150 || info.velocity.y > 500) {
                onClose();
              }
            }}
          >
            <div className="bottom-sheet-handle-wrapper">
              <div className="bottom-sheet-handle" />
            </div>
            
            {title && (
              <div className="bottom-sheet-header">
                <h3 className="bottom-sheet-title">{title}</h3>
              </div>
            )}
            
            <div className="bottom-sheet-content">
              {children}
            </div>

            {footer && (
              <div className="bottom-sheet-footer bottom-sheet-footer-fixed">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
