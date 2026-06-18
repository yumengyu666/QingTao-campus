import { motion, LayoutGroup } from "framer-motion";
import type { ReactNode } from "react";

interface GlassTab {
  key: string;
  label: ReactNode;
  badge?: number;
}

interface GlassTabsProps {
  tabs: GlassTab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  /** Display as pill-shaped floating tab bar */
  pill?: boolean;
}

export function GlassTabs({
  tabs,
  activeKey,
  onChange,
  className = "",
  pill = false,
}: GlassTabsProps) {
  if (pill) {
    return (
      <div className={`lg-tabbar ${className}`}>
        <LayoutGroup>
          <div className="lg-tabbar-pill">
            {tabs.map((tab) => {
              const isActive = tab.key === activeKey;
              return (
                <motion.button
                  key={tab.key}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onChange(tab.key)}
                  className={`lg-tabbar-item ${isActive ? "lg-tabbar-item-active" : "lg-tabbar-item-inactive"}`}
                >
                  <span className={isActive ? "lg-tabbar-label-active" : "lg-tabbar-label-inactive"}>
                    {tab.label}
                  </span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="lg-tabbar-badge">{tab.badge > 99 ? "99+" : tab.badge}</span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="glass-tab-pill-indicator"
                      className="absolute inset-0 bg-[rgba(0,102,214,0.18)] rounded-[24px] border border-[rgba(0,102,214,0.25)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    );
  }

  return (
    <div className={`lg-tab-row ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <motion.button
            key={tab.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(tab.key)}
            className={`lg-tab ${isActive ? "lg-tab-active" : "lg-tab-inactive"}`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#FF3B30] text-white text-[10px] font-bold px-1">
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export type { GlassTab };
