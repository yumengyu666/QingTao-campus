import { useState, useEffect } from 'react';
import { FiClock, FiCheck, FiAlertTriangle } from 'react-icons/fi';

/**
 * AI 审核状态标签
 *
 * 用法：
 *   <ModerationBadge status="checking" />   → "AI审核中"
 *   <ModerationBadge status="passed" />     → "✓" (3秒后自动消失)
 *   <ModerationBadge status="flagged" />    → "违规"
 *
 * Creates content → shows "AI审核中" → after delay → shows "✓" → fades out
 */

type Status = 'checking' | 'passed' | 'flagged';

export function ModerationBadge({ status, onDone }: { status: Status; onDone?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (status === 'passed') {
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
    if (status === 'flagged') {
      return; // stay visible
    }
    // 'checking': stay until status changes
  }, [status]);

  useEffect(() => {
    if (!visible && onDone) onDone();
  }, [visible]);

  if (!visible) return null;

  const config: Record<Status, { icon: React.ReactNode; label: string; className: string }> = {
    checking: {
      icon: <FiClock className="animate-spin" />,
      label: 'AI审核中',
      className: 'bg-yellow-50 text-yellow-600',
    },
    passed: {
      icon: <FiCheck />,
      label: '已通过',
      className: 'bg-green-50 text-green-600',
    },
    flagged: {
      icon: <FiAlertTriangle />,
      label: '违规',
      className: 'bg-red-50 text-red-600',
    },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.className} transition-opacity duration-300`}>
      {c.icon}
      {c.label}
    </span>
  );
}

/**
 * 聊天消息审核标签 — 紧凑版，显示在消息气泡右下角
 */
export function ChatModerationBadge({ status }: { status: Status }) {
  if (status === 'passed') return null; // passed = nothing shown

  const config = {
    checking: { label: '审核中', className: 'text-yellow-500 text-[9px]' },
    flagged: { label: '违规', className: 'text-red-500 text-[9px]' },
  };

  const c = config[status];
  return (
    <span className={`${c.className} flex items-center gap-0.5`}>
      {status === 'checking' && <FiClock className="text-[9px] animate-spin" />}
      {c.label}
    </span>
  );
}
