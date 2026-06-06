import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Pagination } from '@/components/common/Pagination';
import { ImageUploader } from '@/components/common/ImageUploader';
import type { ImageItem } from '@/components/common/ImageUploader';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiHelpCircle, FiPlus, FiMessageSquare, FiCheckCircle, FiEye } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { key: '', label: '全部', icon: '📚' },
  { key: 'dorm', label: '宿舍', icon: '🏠' },
  { key: 'canteen', label: '食堂', icon: '🍜' },
  { key: 'study', label: '学习', icon: '📖' },
  { key: 'sport', label: '体育', icon: '⚽' },
  { key: 'course', label: '选课', icon: '📋' },
  { key: 'transport', label: '交通', icon: '🚌' },
  { key: 'other', label: '其他', icon: '📌' },
];

export default function QaListPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort] = useState<'newest' | 'hot'>('newest');
  const [myQuestions, setMyQuestions] = useState(false);
  const [showAsk, setShowAsk] = useState(false);

  const fetchPosts = (p: number = page) => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (activeCategory) params.set('category', activeCategory);
    if (typeFilter) params.set('type', typeFilter);
    if (sort !== 'newest') params.set('sort', sort);
    if (myQuestions && currentUser) params.set('userId', String(currentUser.id));
    apiFetch(`/api/qa?${params.toString()}`)
      .then(r => r.json()).then(json => {
        if (json.code === 200) { setPosts(json.data.list || []); setTotal(json.data.total || 0); }
      }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts(1);
    setPage(1);
  }, [token, activeCategory, typeFilter, sort, myQuestions]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 dark:from-[var(--color-bg)] dark:via-[var(--color-bg)] dark:to-[var(--color-bg)]">
      <Header title="校园答疑" />

      {/* Category Scroll */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-3 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(c => (
          <motion.button key={c.key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(c.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-all font-medium shadow-sm ${
              activeCategory === c.key
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-300/40 scale-105'
                : 'bg-white/80 dark:bg-[var(--color-card)]/80 text-gray-600 dark:text-[var(--color-text-secondary)] border border-gray-100 dark:border-[var(--color-border)]/30 hover:border-amber-300/50'
            }`}>{c.icon} {c.label}</motion.button>
        ))}
      </motion.div>

      {/* Type filter */}
      <div className="px-4 pb-2 flex gap-2">
        {[{ key: '', label: '全部' }, { key: 'question', label: '求助' }, { key: 'share', label: '分享' }].map(t => (
          <button key={t.key} onClick={() => setTypeFilter(t.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${typeFilter === t.key ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {/* Sort + My Questions */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <div className="flex gap-1">
          <button onClick={() => setSort('newest')} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${sort === 'newest' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'text-gray-400 hover:text-gray-600'}`}>最新</button>
          <button onClick={() => setSort('hot')} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${sort === 'hot' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'text-gray-400 hover:text-gray-600'}`}>热门</button>
        </div>
        {currentUser && (
          <button onClick={() => setMyQuestions(!myQuestions)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${myQuestions ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600'}`}>
            我的提问
          </button>
        )}
      </div>

      {/* Posts */}
      <div className="px-4 mt-1 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white/80 dark:bg-[var(--color-card)]/80 rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[var(--color-card-hover)]" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 bg-gray-200 dark:bg-[var(--color-card-hover)] rounded" /><div className="h-3 w-full bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded" /><div className="flex gap-4"><div className="h-3 w-12 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded" /><div className="h-3 w-12 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded" /></div></div></div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FiHelpCircle className="text-4xl text-amber-300 mb-3" />
            <p className="text-sm">暂无问题</p>
            <p className="text-xs mt-1">点击右下角 + 来提问吧</p>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {posts.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/qa/${p.id}`)}
                  className="bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer active:scale-[0.99] border border-white/50 dark:border-[var(--color-border)]/30 group">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{p.type === 'question' ? '❓' : '💡'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {p.isResolved && <FiCheckCircle className="text-green-500 text-sm flex-shrink-0" />}
                        <h3 className="font-semibold text-sm truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{p.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${p.type === 'question' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                          {p.type === 'question' ? '求助' : '分享'}
                        </span>
                      </div>
                      {p.content && <p className="text-xs text-gray-500 dark:text-[var(--color-text-secondary)] line-clamp-2 mt-1 leading-relaxed">{p.content}</p>}
                      <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><FiMessageSquare className="text-[11px]" /> {p.answerCount}</span>
                        <span className="flex items-center gap-1"><FiEye className="text-[11px]" /> {p.viewCount}</span>
                        <span>{formatTime(p.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        <Pagination page={page} total={total} pageSize={20} onPageChange={(p) => { setPage(p); fetchPosts(p); }} />
      </div>

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
        onClick={() => setShowAsk(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-2xl shadow-amber-300/50 flex items-center justify-center text-2xl z-30">
        <FiPlus />
      </motion.button>

      {/* Ask Question Modal */}
      {showAsk && <AskModal onClose={() => setShowAsk(false)} onCreated={() => {
        setShowAsk(false); fetchPosts();
      }} />}
    </div>
  );
}

function AskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [category, setCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('请输入标题'); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/qa', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category, images: images.map(img => img.url) }),
      });
      const json = await res.json();
      if (json.code === 201 || json.code === 200) { toast.success('发布成功'); onCreated(); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-[var(--color-card)] rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">发布问题</h3>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="问题标题（必填）" maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-amber-400/50" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="详细描述（选填）" rows={4} maxLength={2000}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-amber-400/50 resize-none" />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">图片（选填，最多3张）</label>
            <ImageUploader images={images} onChange={setImages} max={3} />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none">
            {CATEGORIES.filter(c => c.key).map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border text-sm font-medium">取消</button>
          <button onClick={handleSubmit} disabled={submitting || !title.trim()}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold disabled:opacity-40">
            {submitting ? '发布中...' : '发布'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
