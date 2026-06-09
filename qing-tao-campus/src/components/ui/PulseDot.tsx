interface PulseDotProps {
  color?: 'green' | 'red' | 'yellow' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const colors = { green: 'bg-emerald-500', red: 'bg-rose-500', yellow: 'bg-amber-500', gray: 'bg-gray-400' };
const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };

export function PulseDot({ color = 'green', size = 'md', pulse = true, className = '' }: PulseDotProps) {
  return (
    <span className={`relative flex ${sizes[size]} ${className}`}>
      <span className={`absolute inline-flex h-full w-full rounded-full ${colors[color]} ${pulse ? 'animate-ping opacity-75' : ''}`} />
      <span className={`relative inline-flex rounded-full ${sizes[size]} ${colors[color]}`} />
    </span>
  );
}
