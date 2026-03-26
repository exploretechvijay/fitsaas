import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  icon: Icon = AlertTriangle,
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const iconColorMap = {
    danger: 'bg-red-100 text-red-600',
    primary: 'bg-primary-100 text-primary-600',
  };

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'transition-opacity duration-200',
        open
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      )}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className={clsx(
          'absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative w-full max-w-sm bg-white rounded-xl shadow-xl p-6',
          'transition-all duration-200',
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={clsx(
              'flex items-center justify-center h-12 w-12 rounded-full mb-4',
              iconColorMap[variant] || iconColorMap.danger
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
