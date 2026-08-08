import React, { createContext, useContext, useState, useRef } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default',
    loading: false
  });

  const resolver = useRef(null);

  const confirm = (options) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        loading: false,
        onConfirm: async () => {
          if (options.onConfirm) {
            setState((prev) => ({ ...prev, loading: true }));
            try {
              await options.onConfirm();
              setState((prev) => ({ ...prev, isOpen: false, loading: false }));
              resolve(true);
            } catch (err) {
              setState((prev) => ({ ...prev, loading: false }));
              // Fail the promise with false to indicate it was aborted due to errors
              resolve(false);
            }
          } else {
            setState((prev) => ({ ...prev, isOpen: false }));
            resolve(true);
          }
        },
        onCancel: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={state.isOpen}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
        loading={state.loading}
        onConfirm={state.onConfirm}
        onCancel={state.onCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
