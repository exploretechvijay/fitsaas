import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary-500',
  iconBg = 'bg-primary-50',
  className,
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0 || change === undefined || change === null;

  return (
    <div
      className={clsx(
        'bg-white border border-gray-200 rounded-xl p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 tracking-tight">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={clsx(
              'flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg',
              iconBg
            )}
          >
            <Icon className={clsx('h-5 w-5', iconColor)} />
          </div>
        )}
      </div>
      {!isNeutral && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 text-xs font-semibold',
              isPositive ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(change)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-gray-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
