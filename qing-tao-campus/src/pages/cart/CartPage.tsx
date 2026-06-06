import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { CONDITION_MAP } from '@/types/goods';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';
import { FiTrash2, FiShoppingCart, FiCopy, FiChevronRight } from 'react-icons/fi';

export default function CartPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  const fetchCart = () => {
    setLoading(true);
    apiFetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 200) setItems(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchCart();
  }, []);

  const removeItem = async (id: number) => {
    setRemoving(id);
    await apiFetch(`/api/cart/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setRemoving(null);
    toast.success('已移除');
  };

  const copyContact = async (text: string, label: string) => {
    if (!text) {
      toast.error(`卖家未填写${label}`);
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success(`${label}已复制`);
  };

  if (loading) {
    return (
      <div>
        <Header title="购物车" />
        <div className="p-4 md:p-0">
          <Skeleton.List rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="购物车" />
      {items.length === 0 ? (
        <EmptyState
          message="购物车是空的"
          description="去首页逛逛，把心仪的商品加入购物车吧"
          icon={
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] flex items-center justify-center">
              <FiShoppingCart className="text-2xl text-gray-400" />
            </div>
          }
          action={
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 active:scale-95 transition-all"
            >
              去逛逛
            </button>
          }
        />
      ) : (
        <div className="p-4 md:p-0 space-y-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40, height: 0 }}
                className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 flex gap-3 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] overflow-hidden flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                  onClick={() => navigate(`/goods/${item.goodsId}`)}
                >
                  {item.goods?.images?.[0] ? (
                    <img
                      src={item.goods.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-indigo-500 transition-colors"
                    onClick={() => navigate(`/goods/${item.goodsId}`)}
                  >
                    {item.goods?.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CONDITION_MAP[
                      item.goods?.condition as keyof typeof CONDITION_MAP
                    ] || ''}{' '}
                    · {item.goods?.user?.nickname}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-red-500 font-bold text-base">
                      ¥{item.goods?.price}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() =>
                          copyContact(item.goods?.user?.wechat, '微信')
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 font-medium active:scale-90 transition-transform"
                      >
                        微信
                      </button>
                      <button
                        onClick={() =>
                          copyContact(item.goods?.user?.qq, 'QQ')
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium active:scale-90 transition-transform"
                      >
                        QQ
                      </button>
                      <button
                        onClick={() => navigate(`/messages/${item.goods?.userId}`)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 active:scale-90 transition-transform"
                      >
                        联系
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={removing === item.id}
                        className="text-[11px] px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 active:scale-90 transition-transform disabled:opacity-50"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors"
            >
              继续逛逛 <FiChevronRight className="text-xs" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
