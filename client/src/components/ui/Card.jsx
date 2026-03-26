import clsx from 'clsx';

const variantMap = {
  default: 'bg-white border border-gray-200 shadow-sm',
  flat: 'bg-white border border-gray-100',
  elevated: 'bg-white shadow-md border border-gray-100',
  outlined: 'bg-transparent border border-gray-200',
};

export default function Card({
  children,
  variant = 'default',
  padding = true,
  className,
  ...props
}) {
  return (
    <div
      className={clsx(
        'rounded-xl',
        variantMap[variant],
        padding && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className }) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

function CardTitle({ children, className }) {
  return (
    <h3 className={clsx('text-base font-semibold text-gray-900', className)}>
      {children}
    </h3>
  );
}

function CardDescription({ children, className }) {
  return (
    <p className={clsx('text-sm text-gray-500 mt-1', className)}>
      {children}
    </p>
  );
}

function CardBody({ children, className }) {
  return <div className={clsx(className)}>{children}</div>;
}

function CardFooter({ children, className }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100',
        className
      )}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;
