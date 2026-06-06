import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { apiFetch } from '@/utils/api';
import { FiHeart, FiMessageCircle, FiShoppingCart, FiX } from 'react-icons/fi';

export default function MyFavoritesPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCart, setAddingCart] = useState<Set<number>>(new Set());

  const fetchFavorites = () => {
    setLoading(true);
    apiFetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(json => { if (json.code === 200) setItems(json.data.list || []); })
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchFavorites(); }, []);

  const removeFavorite = async (favoriteId: number) => {
    await apiFetch(`/api/favorites/${favoriteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('已取消收藏');
    fetchFavorites();
  };

  const addToCart = async (e: React.MouseEvent, goodsId: number) => {
    e.stopPropagation();
    setAddingCart(prev => new Set(prev).add(goodsId));
    try {
      const res = await apiFetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ goodsId }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 201) {
        toast.success('已加入购物车');
      } else {
        toast.error(json.message || '添加失败');
      }
    } catch { toast.error('网络错误'); }
    setAddingCart(prev => { const next = new Set(prev); next.delete(goodsId); return next; });
  };

  return (
    <div>
      <Header title="我的收藏" rightAction={!loading && items.length > 0 ? <span className="text-xs text-gray-400 font-normal">{items.length} 件</span> : undefined} />
      {loading ? <div className="p-4"><Skeleton.Grid count={4} cols={2} /></div>
      : items.length === 0 ? <EmptyState message="还没有收藏商品" icon={<FiHeart className="text-5xl mb-4" />} />
      : (
        <div className="p-4 grid grid-cols-2 gap-3">
          {items.map((g) => (
            <div key={g.favoriteId || g.id} className={`bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${g._offline ? 'opacity-70' : ''}`}>
              <div className="h-32 bg-gray-100 flex items-center justify-center text-3xl cursor-pointer relative" onClick={() => navigate(`/goods/${g.id}`)}>
                {g.images?.[0] ? <img src={g.images[0]} alt="" className="w-full h-full object-cover" /> : '📦'}
                {g._offline && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-bold bg-black/60 px-3 py-1 rounded-full">已下架</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className={`text-sm font-medium line-clamp-2 cursor-pointer hover:text-indigo-500 ${g._offline ? 'text-gray-400' : ''}`} onClick={() => navigate(`/goods/${g.id}`)}>{g.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`font-bold ${g._offline ? 'text-gray-400' : 'text-red-500'}`}>¥{g.price}</span>
                  {g._offline && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">已下架</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-gray-50 dark:border-[var(--color-border)]">
                  <button
                    onClick={() => navigate(`/messages/${g.userId}`)}
                    disabled={g._offline}
                    className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-40"
                  >
                    <FiMessageCircle className="text-[10px]" /> 联系
                  </button>
                  <button
                    onClick={(e) => addToCart(e, g.id)}
                    disabled={addingCart.has(g.id) || g._offline}
                    className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-40"
                  >
                    <FiShoppingCart className="text-[10px]" /> {addingCart.has(g.id) ? '...' : '加购'}
                  </button>
                  <button
                    onClick={() => removeFavorite(g.favoriteId)}
                    className="ml-auto p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <FiX className="text-xs" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
