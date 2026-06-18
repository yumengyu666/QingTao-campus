import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassBadgeProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  /** Color variant */
  variant?: "default" | "success" | "danger" | "warning" | "info";
}

const variantStyles: Record<NonNullable<GlassBadgeProps["variant"]>, string> = {
  default: "",
  success: "!bg-[rgba(52,199,89,0.2)] !text-[#34C759] !border-[rgba(52,199,89,0.3)]",
  danger: "!bg-[rgba(255,59,48,0.2)] !text-[#FF3B30] !border-[rgba(255,59,48,0.3)]",
  warning: "!bg-[rgba(255,149,0,0.2)] !text-[#FF9500] !border-[rgba(255,149,0,0.3)]",
  info: "!bg-[rgba(0,102,214,0.2)] !text-[#0066D6] !border-[rgba(0,102,214,0.3)]",
};

export function GlassBadge({
  children,
  active = false,
  onClick,
  className = "",
  variant = "default",
}: GlassBadgeProps) {
  const variantClass = variantStyles[variant];

  return (
    <motion.span
      whileTap={onClick ? { scale: 0.94 } : undefined}
      onClick={onClick}
      className={`lg-chip ${active ? "lg-chip-active" : "lg-chip-inactive"} ${variant === "default" ? "" : variantClass} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </motion.span>
  );
}
