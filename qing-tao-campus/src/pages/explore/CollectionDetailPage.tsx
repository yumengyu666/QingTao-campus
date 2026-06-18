import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { LazyImage } from '@/components/common/LazyImage';
import { apiFetch } from '@/utils/api';
import { formatCount } from '@/utils/format';

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<any[]>([]);
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cr, nr] = await Promise.all([
          apiFetch(`/api/collections`),
          apiFetch(`/api/collections/${id}/notes`),
        ]);
        const [cj, nj] = await Promise.all([cr.json(), nr.json()]);
        if (cj.code === 200) setCollection((cj.data || []).find((c: any) => c.id === parseInt(id!)));
        if (nj.code === 200) setNotes(nj.data?.list || []);
      } catch {} finally { setLoading(false); }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <MobileHeader title={collection?.name || '收藏夹'} />
      {loading ? (
        <div className="p-4"><Skeleton.Grid count={4} cols={2} /></div>
      ) : notes.length === 0 ? (
        <EmptyState message="收藏夹是空的" icon={<span className="text-5xl">📂</span>} />
      ) : (
        <div className="p-3 columns-2 gap-3">
          {notes.map((n: any) => {
            const imgs = typeof n.images === 'string' ? JSON.parse(n.images) : (n.images || []);
            return (
              <motion.div key={n.id} whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/explore/note/${n.id}`)}
                className="break-inside-avoid mb-3 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm cursor-pointer">
                {imgs[0] ? <LazyImage src={imgs[0]} alt="" className="w-full object-cover" aspectRatio="3/4" />
                  : <div className="aspect-[3/4] flex items-center justify-center text-3xl bg-gray-100 dark:bg-gray-700">📝</div>}
                <div className="p-2.5">
                  <div className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2">{n.title}</div>
                  <div className="text-[10px] text-gray-500 mt-1">❤️ {formatCount(n.likeCount || 0)}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
