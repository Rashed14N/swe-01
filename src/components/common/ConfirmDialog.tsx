import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const buttonColors = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] rounded-lg transition-all duration-150 disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 text-sm font-medium rounded-lg active:scale-[0.98] transition-all duration-150 flex items-center gap-2 ${buttonColors[variant]} disabled:opacity-50`}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};
