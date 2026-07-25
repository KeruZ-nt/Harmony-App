import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) => {
  if (!open) return null;

  const colorClasses = {
    danger: {
      icon: 'bg-destructive/10 border-destructive/20 text-destructive',
      button: 'bg-destructive hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/25',
    },
    warning: {
      icon: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
      button: 'bg-orange-500 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/25',
    },
    default: {
      icon: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
      button: 'bg-indigo-500 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25',
    },
  };

  const colors = colorClasses[variant];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-md rounded-2xl glass border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full border ${colors.icon}`}>
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <div className="mt-2 text-sm text-muted-foreground">{message}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-border bg-foreground/5 px-4 py-2 text-sm font-medium hover:bg-black/10 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50 ${colors.button}`}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
