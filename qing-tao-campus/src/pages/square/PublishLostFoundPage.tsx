import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ImageUploader } from '@/components/common/ImageUploader';
import type { ImageItem } from '@/components/common/ImageUploader';
import { Skeleton } from '@/components/common/Skeleton';
import { CAMPUS_MAP } from '@/utils/constants';
import { useDraft } from '@/hooks/useDraft';
import { useKeyboardAvoid } from '@/hooks/useKeyboardAvoid';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

export default function PublishLostFoundPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { data: draft, setData: setDraft, clear: clearDraft } = useDraft('publish_lostfound', {
    type: 'lost' as 'lost' | 'found', title: '', description: '', location: '', lostTime: '', contactWechat: '', contactQq: '', reward: '',
  });

  const [type, setType] = useState<'lost' | 'found'>(draft.type);
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [campus, setCampus] = useState<'kexue' | 'dongfeng'>('kexue');
  const [location, setLocation] = useState(draft.location);
  const [lostTime, setLostTime] = useState(draft.lostTime);
  const [contactWechat, setContactWechat] = useState(draft.contactWechat);
  const [contactQq, setContactQq] = useState(draft.contactQq);
  const [reward, setReward] = useState(draft.reward);
  const [submitting, setSubmitting] = useState(false);
  const [editLoading, setEditLoading] = useState(isEdit);
  const keyboardHeight = useKeyboardAvoid();

  // Save draft
  useEffect(() => {
    if (!isEdit) setDraft({ type, title, description, location, lostTime, contactWechat, contactQq, reward });
  }, [type, title, description, location, lostTime, contactWechat, contactQq, reward, isEdit, setDraft]);

  // Load existing data in edit mode
  useEffect(() => {
    if (isEdit && id) {
      setEditLoading(true);
      apiFetch(`/api/lostfound/${id}`)
        .then(r => r.json())
        .then(json => {
          if (json.code === 200) {
            const d = json.data;
            setType(d.type || 'lost');
            setTitle(d.title || '');
            setDescription(d.description || '');
            setImages((d.images || []).map((img: any) =>
              typeof img === 'string'
                ? { url: img, blurredUrl: img, reviewId: 0, status: 'approved' as const }
                : img
            ));
            setCampus(d.campus || 'kexue');
            setLocation(d.location || '');
            setLostTime(d.lostTime || '');
            setContactWechat(d.contactWechat || '');
            setContactQq(d.contactQq || '');
            setReward(d.reward || '');
          }
        })
        .catch(() => toast.error('加载信息失败'))
        .finally(() => setEditLoading(false));
    }
  }, [isEdit, id]);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('请输入标题'); return; }
    if (!description.trim()) { toast.error('请输入描述'); return; }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/lostfound/${id}` : '/api/lostfound';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          type, title: title.trim(), description: description.trim(),
          images: images.map(img => ({ url: img.url, blurredUrl: img.blurredUrl, reviewId: img.reviewId })),
          campus, location, lostTime, contactWechat, contactQq, reward,
        }),
      });
      const json = await res.json();
      if (json.code === 201 || json.code === 200) {
        clearDraft();
        toast.success(json.message || (isEdit ? '修改成功' : '发布成功'));
        navigate('/square');
      } else {
        toast.error(json.message || '提交失败');
      }
    } catch {
      toast.error('网络错误');
    }
    setSubmitting(false);
  };

  if (editLoading) return (
    <div>
      <Header title="加载中..." />
      <div className="p-4"><Skeleton.Detail /></div>
    </div>
  );

  return (
    <div>
      <Header title={isEdit ? '编辑失物招领' : type === 'lost' ? '发布丢失物品' : '发布捡到物品'} />
      <div className="p-4 space-y-5">
        {/* Type */}
        <div>
          <label className="text-sm font-medium mb-2 block">类型</label>
          <div className="flex gap-2">
            <button onClick={() => setType('lost')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${type === 'lost' ? 'bg-red-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
              🔴 我丢了东西
            </button>
            <button onClick={() => setType('found')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${type === 'found' ? 'bg-green-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
              🟢 我捡到东西
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium mb-2 block">标题</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：丢失蓝色卡包、捡到一副耳机" maxLength={50}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none" />
          <p className="text-xs text-gray-400 text-right mt-1">{title.length}/50</p>
        </div>

        {/* Images */}
        <div>
          <label className="text-sm font-medium mb-2 block">图片 <span className="text-gray-400 font-normal">({images.length}/9)</span></label>
          <ImageUploader images={images} onChange={setImages} max={9} showStatus />
        </div>

        {/* Campus & Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">校区</label>
            <div className="flex gap-1">
              {(Object.entries(CAMPUS_MAP) as ['kexue' | 'dongfeng', string][]).map(([k, v]) => (
                <button key={k} onClick={() => setCampus(k)}
                  className={`flex-1 py-2 rounded-lg text-xs transition-colors ${campus === k ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>{v}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">具体地点</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：食堂二楼" maxLength={50}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none text-sm" />
          </div>
        </div>

        {/* Lost time */}
        <div>
          <label className="text-sm font-medium mb-2 block">时间</label>
          <input value={lostTime} onChange={(e) => setLostTime(e.target.value)} placeholder="如：5月30日中午12点左右" maxLength={100}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none" />
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">微信（选填）</label>
            <input value={contactWechat} onChange={(e) => setContactWechat(e.target.value)} placeholder="方便联系" maxLength={50}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">QQ（选填）</label>
            <input value={contactQq} onChange={(e) => setContactQq(e.target.value)} placeholder="方便联系" maxLength={20}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none text-sm" />
          </div>
        </div>

        {/* Reward */}
        {type === 'lost' && (
          <div>
            <label className="text-sm font-medium mb-2 block">酬谢（选填）</label>
            <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="如：50元酬谢" maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none" />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-sm font-medium mb-2 block">详细描述</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述物品特征、丢失/捡到的经过..." rows={5} maxLength={2000}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none resize-none" />
          <p className="text-xs text-gray-400 text-right mt-1">{description.length}/2000</p>
        </div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors text-lg">
          {submitting ? '提交中...' : isEdit ? '保存修改' : '发布'}
        </button>
        <p className="text-xs text-gray-400 text-center -mt-2">
          {isEdit ? '修改后重新提交审核' : (draft.title || draft.description) && !isEdit ? '草稿已自动保存' : '发布后立即可见'}
        </p>
        <div style={{ height: keyboardHeight ? `${keyboardHeight}px` : '4rem' }} />
      </div>
    </div>
  );
}
