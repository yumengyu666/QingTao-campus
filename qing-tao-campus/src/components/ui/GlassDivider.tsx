interface GlassDividerProps {
  className?: string;
  /** Optional label in the middle of the divider */
  label?: string;
  /** Vertical margin */
  my?: number;
}

export function GlassDivider({ className = "", label, my = 16 }: GlassDividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`} style={{ marginTop: my, marginBottom: my }}>
        <hr className="lg-divider flex-1" />
        <span className="text-xs font-medium text-[var(--color-text-tertiary)] whitespace-nowrap">
          {label}
        </span>
        <hr className="lg-divider flex-1" />
      </div>
    );
  }

  return (
    <hr
      className={`lg-divider ${className}`}
      style={{ marginTop: my, marginBottom: my }}
    />
  );
}
