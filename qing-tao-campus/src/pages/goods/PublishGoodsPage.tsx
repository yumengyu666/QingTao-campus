import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ImageUploader } from '@/components/common/ImageUploader';
import type { ImageItem } from '@/components/common/ImageUploader';
import { Skeleton } from '@/components/common/Skeleton';
import { CAMPUS_MAP } from '@/utils/constants';
import { CONDITION_MAP, type GoodsCondition, type GoodsListType } from '@/types/goods';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { useDraft } from '@/hooks/useDraft';
import { useKeyboardAvoid } from '@/hooks/useKeyboardAvoid';
import toast from 'react-hot-toast';

export default function PublishGoodsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const token = useAuthStore((s) => s.token);
  const keyboardHeight = useKeyboardAvoid();

  const { data, setData, clear } = useDraft('publish_goods', {
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    categoryId: 0,
    listType: 'sale' as GoodsListType,
    deposit: '',
    rentStart: '',
    rentEnd: '',
    condition: 'used' as GoodsCondition,
    campus: 'kexue' as 'kexue' | 'dongfeng',
    location: '',
  });

  const { title, description, price, originalPrice, categoryId, listType, deposit, rentStart, rentEnd, condition, campus, location } = data;
  const update = (partial: Partial<typeof data>) => setData({ ...data, ...partial });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editLoading, setEditLoading] = useState(isEdit);
  const [categories, setCategories] = useState<{ id: number; name: string; icon: string }[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  // Auto-save draft to API every 30 seconds
  useEffect(() => {
    const save = () => {
      const draftData: Record<string, any> = {
        title, description, price, originalPrice, categoryId,
        listType, deposit, rentStart, rentEnd, condition, campus,
        campusLocation: location,
        images: images.map(img => ({ url: img.url, blurredUrl: img.blurredUrl, reviewId: img.reviewId })),
      };
      // Only save if there's meaningful content
      const hasContent = title.trim() || description.trim() || price || images.length > 0;
      if (!hasContent) return;

      apiFetch('/api/drafts', {
        method: 'POST',
        body: JSON.stringify({ type: 'goods', data: draftData }),
      })
        .then(() => setDraftSavedAt(Date.now()))
        .catch(() => {});
    };

    const interval = setInterval(save, 30000);
    return () => clearInterval(interval);
  }, [title, description, price, originalPrice, categoryId, listType, condition, campus, location, deposit, rentStart, rentEnd, images]);

  // Load existing data in edit mode
  useEffect(() => {
    // Fetch categories from API
    apiFetch('/api/categories')
      .then(r => r.json())
      .then(json => { if (json.code === 200) setCategories(json.data || []); })
      .catch(() => {});

    if (isEdit && id) {
      setEditLoading(true);
      apiFetch(`/api/goods/${id}`)
        .then(r => r.json())
        .then(json => {
          if (json.code === 200) {
            const g = json.data;
            setData({
              title: g.title || '',
              description: g.description || '',
              price: String(g.price || ''),
              originalPrice: g.originalPrice ? String(g.originalPrice) : '',
              categoryId: g.categoryId || 0,
              listType: g.listType || 'sale',
              deposit: g.deposit ? String(g.deposit) : '',
              rentStart: g.rentStart || '',
              rentEnd: g.rentEnd || '',
              condition: g.condition || 'used',
              campus: g.campus || 'kexue',
              location: g.campusLocation || '',
            });
            setImages((g.images || []).map((img: any) =>
              typeof img === 'string'
                ? { url: img, blurredUrl: img, reviewId: 0, status: 'approved' as const }
                : img
            ));
          }
        })
        .catch(() => toast.error('加载商品信息失败'))
        .finally(() => setEditLoading(false));
    }
  }, [isEdit, id]);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('请输入商品标题'); return; }
    if (!price || Number(price) <= 0) { toast.error('请输入有效价格'); return; }
    if (!categoryId) { toast.error('请选择分类'); return; }

    setSubmitting(true);
    try {
      const body: any = {
        title: title.trim(),
        description,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        categoryId,
        listType,
        condition,
        images: images.map((img) => ({ url: img.url, blurredUrl: img.blurredUrl, reviewId: img.reviewId })),
        campus,
        campusLocation: location,
      };
      if (listType === 'rent' || listType === 'rent_want') {
        body.deposit = deposit ? Number(deposit) : undefined;
        body.rentStart = rentStart || undefined;
        body.rentEnd = rentEnd || undefined;
      }

      const url = isEdit ? `/api/goods/${id}` : '/api/goods';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      const json = await res.json();

      if (json.code === 200 || json.code === 201) {
        toast.success(json.message || (isEdit ? '修改成功' : '发布成功'));
        clear();
        navigate('/profile/goods');
      } else {
        toast.error(json.message || '提交失败');
      }
    } catch {
      toast.error('网络错误');
    }
    setSubmitting(false);
  };

  if (editLoading) return <div><Header title="加载中..." /><div className="p-4"><Skeleton.Detail /></div></div>;

  return (
    <div>
      <Header title={isEdit ? '编辑商品' : '发布商品'} />

      <div className="p-4 space-y-5">
        {/* Quick Templates — only show when creating new (not editing) */}
        {!isEdit && (
          <div>
            <label className="text-sm font-medium mb-2 block">快捷模板</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '📚 卖教材', data: { listType: 'sale', categoryId: 'books', title: '教材《》', price: '' } },
                { label: '💻 卖电子产品', data: { listType: 'sale', categoryId: 'electronics', title: '', price: '' } },
                { label: '👔 卖衣物', data: { listType: 'sale', categoryId: 'clothing', title: '', price: '' } },
                { label: '🏠 出租房源', data: { listType: 'rent', categoryId: 'rental', title: '', price: '' } },
                { label: '🔍 求购', data: { listType: 'buy', categoryId: '', title: '求购：', price: '' } },
              ].map(tpl => (
                <button key={tpl.label} onClick={() => update(tpl.data)}
                  className="px-3 py-1.5 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Images */}
        <div>
          <label className="text-sm font-medium mb-2 block">商品图片 <span className="text-gray-400 font-normal">({images.length}/9)</span></label>
          <ImageUploader images={images} onChange={setImages} max={9} showStatus />
          <p className="text-xs text-gray-400 mt-1">首张为封面，最多9张，单张不超过5MB</p>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium mb-2 block">商品标题</label>
          <input value={title} onChange={(e) => update({ title: e.target.value })} placeholder="请输入商品标题（最多50字）" maxLength={50}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
          <p className="text-xs text-gray-400 text-right mt-1">{title.length}/50</p>
        </div>

        {/* Sale / Rental / Buy / Rent-want toggle */}
        <div>
          <label className="text-sm font-medium mb-2 block">发布类型</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { update({ listType: 'sale' }); }}
              className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${listType === 'sale' ? 'bg-green-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
              💰 出售
            </button>
            <button onClick={() => { update({ listType: 'buy' }); }}
              className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${listType === 'buy' ? 'bg-red-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
              🔍 求购
            </button>
            <button onClick={() => { update({ listType: 'rent' }); }}
              className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${listType === 'rent' ? 'bg-green-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
              📅 出租
            </button>
            <button onClick={() => { update({ listType: 'rent_want' }); }}
              className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${listType === 'rent_want' ? 'bg-red-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
              📅 求租
            </button>
          </div>
          {(listType === 'rent' || listType === 'rent_want') && (
            <div className="space-y-4 mt-2 pt-4 border-t border-gray-100 dark:border-[var(--color-border)]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">开始时间</label>
                  <input type="datetime-local" value={rentStart} onChange={(e) => update({ rentStart: e.target.value })}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">结束时间</label>
                  <input type="datetime-local" value={rentEnd} onChange={(e) => update({ rentEnd: e.target.value })}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium mb-2 block">商品分类</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => update({ categoryId: cat.id })}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${categoryId === cat.id ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-[var(--color-card)] text-gray-600 dark:text-[var(--color-text-secondary)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Condition — only for sale */}
        {listType !== 'buy' && (
          <div>
            <label className="text-sm font-medium mb-2 block">成色</label>
            <div className="flex gap-2">
              {(Object.entries(CONDITION_MAP) as [GoodsCondition, string][]).map(([k, v]) => (
                <button key={k} onClick={() => update({ condition: k })}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${condition === k ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-[var(--color-card)] text-gray-600 dark:text-[var(--color-text-secondary)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              {listType === 'rent' ? '日租金/天' : listType === 'rent_want' ? '求租价/天' : listType === 'buy' ? '求购价' : '价格'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
              <input value={price} onChange={(e) => update({ price: e.target.value })} type="number" placeholder="0" min="0"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
            </div>
          </div>
          {listType === 'sale' ? (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">原价 <span className="text-gray-400 font-normal">(选填)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input value={originalPrice} onChange={(e) => update({ originalPrice: e.target.value })} type="number" placeholder="0" min="0"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
              </div>
            </div>
          ) : (listType === 'rent' || listType === 'rent_want') ? (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">押金 <span className="text-gray-400 font-normal">(选填)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input value={deposit} onChange={(e) => update({ deposit: e.target.value })} type="number" placeholder={listType === 'rent_want' ? '可接受押金，如20' : '如：50'} min="0"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        {/* Campus */}
        <div>
          <label className="text-sm font-medium mb-2 block">所在校区</label>
          <div className="flex gap-2">
            {(Object.entries(CAMPUS_MAP) as ['kexue' | 'dongfeng', string][]).map(([k, v]) => (
              <button key={k} onClick={() => update({ campus: k })}
                className={`flex-1 py-2.5 rounded-lg text-sm transition-colors ${campus === k ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-[var(--color-card)] text-gray-600 dark:text-[var(--color-text-secondary)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-medium mb-2 block">详细交易地点</label>
          <input value={location} onChange={(e) => update({ location: e.target.value })} placeholder="如：东区5号宿舍楼下" maxLength={100}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium mb-2 block">商品描述</label>
          <textarea value={description} onChange={(e) => update({ description: e.target.value })} placeholder="详细描述商品的使用情况、瑕疵、配件等信息..." rows={5} maxLength={2000}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors resize-none" />
          <p className="text-xs text-gray-400 text-right mt-1">{description.length}/2000</p>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors text-lg">
          {submitting ? '提交中...' : isEdit ? '保存修改' : '发布'}
        </button>
        {draftSavedAt && (
          <p className="text-xs text-green-600 dark:text-green-400 text-center -mt-2">
            ✓ 草稿已自动保存于 {new Date(draftSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <p className="text-xs text-gray-400 text-center -mt-2">图片需审核，文字 AI 自动检测</p>

        <div style={{ height: keyboardHeight ? `${keyboardHeight}px` : '4rem' }} />
      </div>
    </div>
  );
}
