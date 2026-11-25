import { X, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export function StatusBadge({ status }) {
  const styles = {
    Scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    Confirmed: 'bg-teal-50 text-teal-700 border-teal-200',
    Completed: 'bg-green-50 text-green-700 border-green-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
    Active: 'bg-green-50 text-green-700 border-green-200',
    'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Cancelled: 'bg-red-50 text-red-700 border-red-200',
    'No Show': 'bg-slate-100 text-slate-700 border-slate-200',
    Unpaid: 'bg-red-50 text-red-700 border-red-200',
    Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const cls = styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}

export function Modal({ open, onClose, title, subtitle, size = 'lg', children }) {
  if (!open) return null;

  const maxWidths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm no-print">
      <div
        className={`bg-white rounded-xl shadow-xl border border-slate-200 w-full ${maxWidths[size] || maxWidths.lg} max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-white">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{start}</span> to{' '}
        <span className="font-medium text-slate-700">{end}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span> results
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <span className="text-sm text-slate-600 px-2">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-base font-semibold text-slate-800">{title}</h4>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AlertBanner({ type = 'info', message, onClose }) {
  if (!message) return null;

  const config = {
    success: {
      bg: 'bg-green-50 border-green-200 text-green-800',
      Icon: CheckCircle2,
    },
    error: {
      bg: 'bg-red-50 border-red-200 text-red-800',
      Icon: AlertTriangle,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      Icon: AlertTriangle,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      Icon: Info,
    },
  };

  const { bg, Icon } = config[type] || config.info;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${bg}`}>
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 shrink-0" />
        <span>{message}</span>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="p-0.5 hover:opacity-75">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
