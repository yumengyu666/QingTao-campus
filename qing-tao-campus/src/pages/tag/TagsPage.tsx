import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { motion } from 'framer-motion';

export default function TagsPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/tags').then(r => r.json()).then(j => {
      if (j.code === 200) setTags(j.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTag) return;
    setLoading(true);
    apiFetch(`/api/tags/${selectedTag.name}/posts?page=${page}&pageSize=20`).then(r => r.json()).then(j => {
      if (j.code === 200) { setPosts(j.data.list || []); setTotal(j.data.total); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedTag, page]);

  const maxCount = Math.max(...tags.map(t => t.postCount || 0), 1);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header title={selectedTag ? `#${selectedTag.name}` : '热门标签'} onBack={selectedTag ? () => setSelectedTag(null) : undefined} />

      {!selectedTag ? (
        <div className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {tags.map(t => {
              const size = 0.7 + ((t.postCount || 0) / maxCount) * 1.3;
              return (
                <motion.button key={t.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setSelectedTag(t); setPage(1); }}
                  className="px-3 py-1.5 rounded-full font-medium transition-colors hover:opacity-80"
                  style={{ fontSize: `${size}rem`, backgroundColor: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}>
                  #{t.name}
                  <span className="ml-1 text-xs opacity-50">{t.postCount}</span>
                </motion.button>
              );
            })}
            {tags.length === 0 && <EmptyState message="暂无标签" description="当帖子添加标签后这里会显示热门话题" />}
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {loading ? <div className="text-center py-10 text-gray-400">加载中...</div> :
           posts.length === 0 ? <EmptyState message="暂无相关帖子" /> :
            posts.map(p => (
              <div key={p.id} onClick={() => nav(`/square/post/${p.id}`)}
                className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow">
                <h3 className="font-medium text-sm">{p.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <span>{p.user?.nickname}</span>
                  <span>· {formatTime(p.createdAt)}</span>
                </div>
              </div>
            ))}
          {total > 20 && <Pagination page={page} total={total} pageSize={20} onChange={setPage} />}
        </div>
      )}
    </div>
  );
}
