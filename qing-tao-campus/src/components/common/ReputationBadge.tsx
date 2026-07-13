import { FiCheck, FiStar, FiAward } from 'react-icons/fi';

interface ReputationBadgeProps {
  tradeCount: number;
  approvalRate: number; // 0-100
  level?: string;
}

const LEVEL_CONFIG = [
  { max: 5, label: '新手上路', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', icon: FiCheck },
  { max: 20, label: '靠谱同学', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: FiStar },
  { max: 50, label: '资深用户', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: FiAward },
  { max: Infinity, label: '校园达人', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: FiAward },
];

function getLevel(tradeCount: number) {
  return LEVEL_CONFIG.find((c) => tradeCount < c.max) ?? LEVEL_CONFIG[LEVEL_CONFIG.length - 1];
}

export function ReputationBadge({ tradeCount, approvalRate, level }: ReputationBadgeProps) {
  const config = getLevel(tradeCount);
  const Icon = config.icon;

  // 如果已从后端传了 level 字符串，优先使用
  const label = level || config.label;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className="text-xs" />
      <span>{label}</span>
      <span className="mx-0.5 opacity-40">·</span>
      <span>{tradeCount} 笔交易</span>
      {approvalRate > 0 && (
        <>
          <span className="mx-0.5 opacity-40">·</span>
          <span>{approvalRate}% 好评</span>
        </>
      )}
    </div>
  );
}

export { getLevel, LEVEL_CONFIG };
