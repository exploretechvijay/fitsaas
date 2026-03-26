import clsx from 'clsx';

const colorMap = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  indigo: 'bg-primary-50 text-primary-700 ring-primary-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  pink: 'bg-pink-50 text-pink-700 ring-pink-200',
};

const sizeMap = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export default function Badge({
  children,
  color = 'gray',
  size = 'md',
  dot = false,
  className,
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium rounded-full ring-1 ring-inset whitespace-nowrap',
        colorMap[color],
        sizeMap[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', {
            'bg-gray-500': color === 'gray',
            'bg-emerald-500': color === 'green',
            'bg-red-500': color === 'red',
            'bg-amber-500': color === 'yellow',
            'bg-blue-500': color === 'blue',
            'bg-primary-500': color === 'indigo',
            'bg-purple-500': color === 'purple',
            'bg-pink-500': color === 'pink',
          })}
        />
      )}
      {children}
    </span>
  );
}
