import { motion } from "framer-motion";
import { useAppNavigate } from "@/hooks/useAppNavigate";

const entries = [
  { label: "求购专区", icon: "🔍", path: "/wanted", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  { label: "预约管理", icon: "📅", path: "/reservations", color: "#3B82F6", bg: "rgba(59,130,246,0.10)" },
  { label: "物品交换", icon: "🔄", path: "/barter", color: "#10B981", bg: "rgba(16,185,129,0.10)" },
  { label: "交友", icon: "💕", path: "/dating", color: "#EC4899", bg: "rgba(236,72,153,0.10)" },
  { label: "答疑", icon: "❓", path: "/qa", color: "#6366F1", bg: "rgba(99,102,241,0.10)" },
  { label: "AI助手", icon: "🤖", path: "/agent", color: "#8B5CF6", bg: "rgba(139,92,246,0.10)" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export function QuickEntries() {
  const nav = useAppNavigate();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-2.5 px-4 py-3"
    >
      {entries.map((e) => (
        <motion.button
          key={e.label}
          variants={item}
          whileTap={{ scale: 0.90 }}
          onClick={() => nav(e.path)}
          className="lg-quick-entry"
        >
          <div
            className="lg-quick-icon shadow-sm"
            style={{ background: e.bg }}
          >
            {e.icon}
          </div>
          <span className="lg-quick-label">{e.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
