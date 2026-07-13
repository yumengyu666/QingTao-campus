import type { ReactNode } from 'react';
import { FiAlertCircle } from 'react-icons/fi';

interface Props {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, required, error, children, className = '' }: Props) {
  return (
    <div className={className}>
      <label className="text-sm font-medium mb-2 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
          <FiAlertCircle className="flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
