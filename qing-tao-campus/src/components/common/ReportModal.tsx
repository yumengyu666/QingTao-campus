import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

interface ReportModalProps {
  targetId: number;
  targetType: 'goods' | 'post' | 'comment' | 'user';
  onClose: () => void;
}

const CATEGORIES = [
  { key: 'spam', label: '垃圾广告', icon: '📢' },
  { key: 'fake', label: '虚假信息', icon: '⚠' },
  { key: 'copyright', label: '侵权', icon: '©' },
  { key: 'harassment', label: '骚扰', icon: '🚫' },
  { key: 'prohibited', label: '违禁品', icon: '🔞' },
  { key: 'other', label: '其他', icon: '📌' },
] as const;

type Step = 'category' | 'detail' | 'done';

export function ReportModal({ targetId, targetType, onClose }: ReportModalProps) {
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          targetId,
          reason: category,
          description: description.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.code === 201) {
        setStep('done');
      } else {
        toast.error(json.message || '举报提交失败');
        setSubmitting(false);
      }
    } catch {
      toast.error('网络错误');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('category');
    setCategory('');
    setDescription('');
    setSubmitting(false);
    onClose();
  };

  // Step 3: Done
  if (step === 'done') {
    return (
      <Modal open={true} onClose={handleClose} size="sm" bottomSheet>
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle className="text-3xl text-green-500" />
          </div>
          <h3 className="text-lg font-bold mb-2">举报已提交</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            我们会尽快处理，处理结果将通过通知告知您。
          </p>
          <button
            onClick={handleClose}
            className="mt-6 px-8 py-2.5 rounded-xl bg-indigo-500 text-white font-medium text-sm hover:bg-indigo-600 transition-colors"
          >
            知道了
          </button>
        </div>
      </Modal>
    );
  }

  // Step 1: Category
  if (step === 'category') {
    return (
      <Modal
        open={true}
        onClose={handleClose}
        title="举报"
        description="请选择举报原因"
        size="sm"
        bottomSheet
      >
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setCategory(cat.key);
                setStep('detail');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.98] transition-all"
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="font-medium">{cat.label}</span>
              <span className="ml-auto text-gray-400 text-xs">→</span>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  // Step 2: Detail
  const selectedLabel = CATEGORIES.find((c) => c.key === category)?.label || category;
  return (
    <Modal
      open={true}
      onClose={handleClose}
      title="举报详情"
      description={`举报类型：${selectedLabel}`}
      size="sm"
      bottomSheet
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs">
          <FiAlertTriangle className="flex-shrink-0" />
          <span>请如实描述问题，虚假举报可能导致账号受限。</span>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">
            详细描述 <span className="text-gray-400 font-normal">（选填）</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="请描述具体问题，帮助我们更快处理..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setStep('category')}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[var(--color-border)] text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            上一步
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? '提交中...' : '提交举报'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
