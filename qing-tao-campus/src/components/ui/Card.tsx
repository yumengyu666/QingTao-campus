import { type ReactNode, type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'flat' | 'bordered' | 'highlight';
  padding?: 'default' | 'lg' | 'none';
  interactive?: boolean;
  hover?: boolean;
}

const paddingMap = {
  default: 'p-4',
  lg: 'p-6',
  none: 'p-0',
};

const variantMap = {
  default: '',
  flat: 'card-flat',
  bordered: 'card-bordered',
  highlight: 'card-highlight',
};

export function Card({
  children,
  variant = 'default',
  padding = 'default',
  interactive = false,
  hover = true,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`card ${variantMap[variant]} ${paddingMap[padding]} ${
        interactive && hover ? 'card-interactive' : ''
      } ${className}`}
      {...(interactive ? { tabIndex: 0, role: 'article' } : {})}
      {...props}
    >
      {children}
    </div>
  );
}

/* Card sub-components */
export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between mb-3 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`font-semibold text-[var(--color-text-primary)] ${className}`}>{children}</h3>;
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border-divider)] ${className}`}>{children}</div>;
}
