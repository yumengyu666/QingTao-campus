import { useState } from 'react';
import { FiX } from 'react-icons/fi';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
}

export function TagInput({ tags, onChange, placeholder = '输入标签后按回车', max = 5 }: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !tags.includes(trimmed) && tags.length < max) {
        onChange([...tags, trimmed]);
        setInput('');
      }
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] min-h-[42px] items-center">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-indigo-800 dark:hover:text-indigo-200">
            <FiX className="text-[10px]" />
          </button>
        </span>
      ))}
      {tags.length < max && (
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          maxLength={20}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-gray-400 py-1"
        />
      )}
      {tags.length >= max && (
        <span className="text-xs text-gray-400">已达上限({max}个)</span>
      )}
    </div>
  );
}
