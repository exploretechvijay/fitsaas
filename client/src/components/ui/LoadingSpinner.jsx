import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export default function LoadingSpinner({ size = 'md', className, text }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12',
        className
      )}
    >
      <Loader2
        className={clsx('animate-spin text-primary-500', sizeMap[size])}
      />
      {text && <p className="mt-3 text-sm text-gray-500">{text}</p>}
    </div>
  );
}

/** Full-page spinner that covers the viewport */
export function FullPageSpinner({ text = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
      {text && (
        <p className="mt-4 text-sm font-medium text-gray-600">{text}</p>
      )}
    </div>
  );
}

/** Inline spinner for buttons / small areas */
export function InlineSpinner({ size = 'sm', className }) {
  return (
    <Loader2
      className={clsx('animate-spin text-current', sizeMap[size], className)}
    />
  );
}
