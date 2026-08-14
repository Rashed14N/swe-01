import React from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotifications();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    error: <XCircle className="w-5 h-5 text-rose-600" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  };

  const borderColors = {
    success: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
    error: 'border-rose-200 bg-rose-50/90 text-rose-900',
    warning: 'border-amber-200 bg-amber-50/90 text-amber-900',
    info: 'border-blue-200 bg-blue-50/90 text-blue-900',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-200 animate-toast-entry ${borderColors[toast.type]}`}
        >
          <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
          <div className="flex-1 text-sm">
            <h4 className="font-semibold leading-tight">{toast.title}</h4>
            {toast.message && <p className="text-xs opacity-80 mt-0.5">{toast.message}</p>}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-slate-400 hover:text-slate-600 p-1 active:scale-95 transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
