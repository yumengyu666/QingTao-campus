import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Enable hover lift effect (default: true) */
  hover?: boolean;
  onClick?: () => void;
  padding?: "sm" | "md" | "lg";
  /** Card visual variant */
  variant?: "default" | "featured" | "elevated" | "group";
  /** Disable backdrop filter for better performance on low-end devices */
  noBlur?: boolean;
}

const paddingMap = { sm: "p-3", md: "p-5", lg: "p-8" } as const;

const variantClasses: Record<NonNullable<GlassCardProps["variant"]>, string> = {
  default: "lg-card",
  featured: "lg-card-featured",
  elevated: "lg-card-elevated",
  group: "lg-card-group",
};

export function GlassCard({
  children,
  className = "",
  hover = true,
  onClick,
  padding = "md",
  variant = "default",
  noBlur = false,
}: GlassCardProps) {
  const p = paddingMap[padding];
  const variantClass = variantClasses[variant];

  return (
    <motion.div
      whileHover={hover ? { y: -1, scale: 1.008 } : {}}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      style={
        noBlur
          ? { backdropFilter: "none", WebkitBackdropFilter: "none" }
          : undefined
      }
      className={`${variantClass} ${p} ${onClick ? "cursor-pointer" : ""} ${hover && variant === "default" ? "lg-card-hover" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   Glass Section Header — for content sections
   ============================================================ */

interface GlassSectionProps {
  title: string;
  more?: string;
  onMore?: () => void;
  className?: string;
}

export function GlassSection({
  title,
  more,
  onMore,
  className = "",
}: GlassSectionProps) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <h2 className="lg-h2">{title}</h2>
      {more && (
        <button
          onClick={onMore}
          className="text-sm font-semibold text-[#0066D6] hover:text-[#0080FF] active:scale-95 transition-all"
        >
          {more}
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Glass Sheet — bottom sheet modal with animated backdrop
   ============================================================ */

interface GlassSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function GlassSheet({
  open,
  onClose,
  children,
  className = "",
}: GlassSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lg-backdrop"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={`lg-sheet ${className}`}
          >
            <div className="flex justify-center -mt-2 mb-5">
              <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/15" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
