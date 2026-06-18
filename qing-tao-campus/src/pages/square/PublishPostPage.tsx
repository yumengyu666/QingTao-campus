import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { ImageUploader } from '@/components/common/ImageUploader';
import type { ImageItem } from '@/components/common/ImageUploader';
import { Skeleton } from '@/components/common/Skeleton';
import { useDraft } from '@/hooks/useDraft';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

export default function PublishPostPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { data: draft, setData: setDraft, clear: clearDraft } = useDraft('publish_post', {
    title: '', content: '',
  });

  const [title, setTitle] = useState(draft.title);
  const [content, setContent] = useState(draft.content);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editLoading, setEditLoading] = useState(isEdit);

  // Save draft on change
  useEffect(() => { setDraft({ title, content }); }, [title, content, setDraft]);

  useEffect(() => {
    if (isEdit && id) {
      setEditLoading(true);
      apiFetch(`/api/posts/${id}`)
        .then(r => r.json())
        .then(json => {
          if (json.code === 200) {
            setTitle(json.data.title || '');
            setContent(json.data.content || '');
            setImages((json.data.images || []).map((img: any) =>
              typeof img === 'string'
                ? { url: img, blurredUrl: img, reviewId: 0, status: 'approved' as const }
                : img
            ));
          }
        })
        .catch(() => toast.error('加载帖子信息失败'))
        .finally(() => setEditLoading(false));
    }
  }, [isEdit, id]);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('请输入帖子标题'); return; }
    if (!content.trim()) { toast.error('请输入帖子内容'); return; }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/posts/${id}` : '/api/posts';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ title: title.trim(), content: content.trim(), images: images.map(img => ({ url: img.url, blurredUrl: img.blurredUrl, reviewId: img.reviewId })) }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 201) {
        clearDraft();
        toast.success(json.message || (isEdit ? '修改成功' : '发布成功'));
        nav('/square');
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
      <Header title={isEdit ? '编辑帖子' : '发布帖子'} />
      <div className="p-4 space-y-5">
        <div>
          <label className="text-sm font-medium mb-2 block">帖子标题</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入帖子标题" maxLength={50}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
          <p className="text-xs text-gray-400 text-right mt-1">{title.length}/50</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">正文内容</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="分享你的想法..." rows={8} maxLength={5000}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors resize-none" />
          <p className="text-xs text-gray-400 text-right mt-1">{content.length}/5000</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">图片 <span className="text-gray-400 font-normal">({images.length}/9)</span></label>
          <ImageUploader images={images} onChange={setImages} max={9} showStatus />
        </div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors text-lg">
          {submitting ? '提交中...' : isEdit ? '保存修改' : '发布'}
        </button>
        <p className="text-xs text-gray-400 text-center -mt-2">
          {isEdit ? '修改后重新提交审核' : (draft.title || draft.content) && !isEdit ? '草稿已自动保存' : '发布后立即可见'}
        </p>
      </div>
    </div>
  );
}
