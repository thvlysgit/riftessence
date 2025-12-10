import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';

type ToastType = 'success' | 'error' | 'info';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface GlobalUIContextValue {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const GlobalUIContext = createContext<GlobalUIContextValue | undefined>(undefined);

export const GlobalUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastState, setToastState] = useState<{ open: boolean; message: string; type: ToastType }>(
    { open: false, message: '', type: 'info' }
  );
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', resolve: null });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToastState({ open: true, message, type });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        open: true,
        title: options.title || 'Confirm',
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    // Replace window.alert with toast for consistency
    if (typeof window !== 'undefined') {
      window.alert = (msg?: any) => {
        const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
        showToast(text, 'info');
      };
    }
  }, [showToast]);

  const handleConfirm = (result: boolean) => {
    if (confirmState.resolve) confirmState.resolve(result);
    setConfirmState(c => ({ ...c, open: false, resolve: null }));
  };

  return (
    <GlobalUIContext.Provider value={{ showToast, confirm }}>
      {children}
      <Toast
        open={toastState.open}
        message={toastState.message}
        type={toastState.type}
        onClose={() => setToastState(t => ({ ...t, open: false }))}
      />
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={() => handleConfirm(true)}
        onCancel={() => handleConfirm(false)}
      />
    </GlobalUIContext.Provider>
  );
};

export const useGlobalUI = (): GlobalUIContextValue => {
  const ctx = useContext(GlobalUIContext);
  if (!ctx) throw new Error('useGlobalUI must be used within GlobalUIProvider');
  return ctx;
};
