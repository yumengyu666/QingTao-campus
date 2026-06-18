import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { ImageUploader } from '@/components/common/ImageUploader';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['教材教辅', '电子产品', '运动户外', '生活用品', '服饰鞋包', '乐器设备', '数码配件', '其他'];

export default function PublishWantedPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [campus, setCampus] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!title.trim()) { toast.error('请输入标题'); return; }
    setPublishing(true);
    try {
      const res = await apiFetch('/api/wanted', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), category, campus, budget: budget ? parseFloat(budget) : null, description, images }),
      });
      const json = await res.json();
      if (json.code === 201) { toast.success('发布成功'); nav('/wanted'); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    finally { setPublishing(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header title="发布求购" />
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-[var(--color-text)]">标题 *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={50}
            placeholder="例如：求购高等数学第七版教材" className="w-full mt-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-primary)]" />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-[var(--color-text)]">分类</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === c ? 'bg-[var(--color-primary)] text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-[var(--color-text)]">校区</label>
            <div className="flex gap-2 mt-1">
              {['', '科学校区', '东风校区'].map(c => (
                <button key={c} onClick={() => setCampus(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${campus === c ? 'bg-[var(--color-primary)] text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>{c || '不限'}</button>
              ))}
            </div>
          </div>
          <div className="w-32">
            <label className="text-sm font-medium text-gray-700 dark:text-[var(--color-text)]">预算 ¥</label>
            <input value={budget} onChange={e => setBudget(e.target.value)} type="number" min="0" step="0.01"
              placeholder="0.00" className="w-full mt-1 px-3 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-primary)]" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-[var(--color-text)]">描述</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3}
            placeholder="描述你需要的物品..." className="w-full mt-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none resize-none focus:border-[var(--color-primary)]" />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-[var(--color-text)]">图片（最多9张）</label>
          <div className="mt-1"><ImageUploader images={images} onChange={setImages} max={9} /></div>
        </div>

        <button onClick={handlePublish} disabled={publishing || !title.trim()}
          className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">
          {publishing ? '发布中...' : '发布求购'}
        </button>
      </div>
    </div>
  );
}
