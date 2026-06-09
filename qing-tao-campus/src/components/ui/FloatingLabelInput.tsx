import { useState } from 'react';

interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
}

export function FloatingLabelInput({
  label, value, onChange, type = 'text', error, required, maxLength, className = '',
}: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div className={`relative ${className}`}>
      <input
        type={type} value={value} required={required} maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full px-4 pt-6 pb-2 rounded-xl border bg-white dark:bg-gray-800 text-sm outline-none transition-colors
          ${error ? 'border-red-400 focus:border-red-500' : active ? 'border-indigo-400 focus:border-indigo-500' : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500'}
        `}
      />
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none
        ${active ? 'top-1.5 text-xs text-indigo-500' : 'top-4 text-sm text-gray-400'}
        ${error ? 'text-red-500' : ''}
      `}>
        {label}{required && ' *'}
      </label>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
