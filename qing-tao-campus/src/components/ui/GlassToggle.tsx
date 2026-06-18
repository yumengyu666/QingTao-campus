import { motion } from "framer-motion";

interface GlassToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function GlassToggle({
  checked,
  onChange,
  disabled = false,
  className = "",
  label,
}: GlassToggleProps) {
  const toggle = (
    <motion.button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      whileTap={{ scale: 0.92 }}
      onClick={() => !disabled && onChange(!checked)}
      className={`lg-toggle ${checked ? "lg-toggle-on" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    />
  );

  if (label) {
    return (
      <label className="flex items-center gap-3 cursor-pointer select-none">
        {toggle}
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </span>
      </label>
    );
  }

  return toggle;
}
