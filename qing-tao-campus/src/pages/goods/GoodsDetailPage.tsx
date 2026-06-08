import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { UserAvatar } from '@/components/common/UserAvatar';
import { CampusTag } from '@/components/common/CampusTag';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { Skeleton } from '@/components/common/Skeleton';
import { CONDITION_MAP, STATUS_MAP } from '@/types/goods';
import { formatDate, formatTime } from '@/utils/format';
import { apiFetch } from '@/utils/api';
import { saveBrowseHistory } from '@/pages/profile/BrowseHistoryPage';
import { FiHeart, FiShoppingCart, FiCopy, FiCheck, FiEdit2, FiCheckCircle, FiTrash2, FiArrowDown, FiArrowUp, FiEye, FiClock, FiMessageCircle, FiFlag, FiShare2, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import 'swiper/css';
import 'swiper/css/pagination';

export default function GoodsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [goods, setGoods] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [bartering, setBartering] = useState(false);
  const [showBarterPick, setShowBarterPick] = useState(false);
  const [myGoods, setMyGoods] = useState<any[]>([]);
  const [selectedBarterGoods, setSelectedBarterGoods] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [intentStatus, setIntentStatus] = useState<string | null>(null); // 'pending' | 'accepted' | null
  const [intentSending, setIntentSending] = useState(false);

  const goodsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || goodsRef.current === id) return;
    goodsRef.current = id;
    setLoading(true);
    // Load goods detail
    apiFetch(`/api/goods/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) {
          setGoods(json.data);

          // AI 审核轮询（status=pending 时轮询，最多4次×3秒）
          if (json.data.status === 'pending') {
            let pollCount = 0;
            let cancelled = false;
            const poll = async () => {
              if (cancelled || pollCount >= 4) return;
              pollCount++;
              await new Promise(r => setTimeout(r, 3000));
              if (cancelled) return;
              try {
                const r = await apiFetch(`/api/goods/${id}`);
                const j = await r.json();
                if (j.code === 200 && j.data.status !== 'pending') {
                  setGoods(j.data);
                } else {
                  poll();
                }
              } catch { poll(); }
            };
            poll();
          }
          // Check image review status
          const imgs = json.data.images || [];
          const reviewIds = imgs.filter((img: any) => img?.reviewId).map((img: any) => img.reviewId);
          if (reviewIds.length > 0) {
            apiFetch(`/api/images/status?ids=${reviewIds.join(',')}`).then(r => r.json()).then(j => {
              if (j.code === 200) {
                const statusMap: Record<number, string> = {};
                (j.data || []).forEach((s: any) => { statusMap[s.id] = s.status; });
                json.data.images = imgs.map((img: any) => ({
                  ...img,
                  _status: img.reviewId ? (statusMap[img.reviewId] || 'pending') : 'approved',
                }));
                setGoods({ ...json.data });
              }
            }).catch(() => {});
          }
          // Save browse history
          saveBrowseHistory({
            id: json.data.id,
            title: json.data.title,
            price: json.data.price,
            condition: json.data.condition,
            campus: json.data.campus,
            categoryId: json.data.categoryId,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load comments
    apiFetch(`/api/goods/${id}/comments`).then(r => r.json()).then(j => {
      if (j.code === 200) setComments(j.data.list || []);
    }).catch(() => {});

    // Check favorite & cart status
    if (token) {
      apiFetch(`/api/favorites/check/${id}`).then(r => r.json()).then(j => {
        if (j.code === 200 && j.data?.favorited) {
          setFavorited(true);
          // Get favoriteId from my favorites list (for removal)
          apiFetch('/api/favorites').then(r => r.json()).then(fj => {
            const list = fj.data?.list || [];
            const fav = list.find((f: any) => f.id === Number(id));
            if (fav) setFavoriteId(fav.favoriteId);
          }).catch(() => {});
        }
      }).catch(() => {});
      apiFetch('/api/cart').then(r => r.json()).then(j => {
        if (j.code === 200) {
          const cartList = j.data || [];
          setInCart(cartList.some((c: any) => c.goodsId === Number(id)));
        }
      }).catch(() => {});
    }
  }, [id, token]);

  const copyText = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleFavorite = async () => {
    try {
      if (favorited && favoriteId) {
        const res = await apiFetch(`/api/favorites/${favoriteId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.code === 200) { setFavorited(false); setFavoriteId(null); toast.success('已取消收藏'); }
        else toast.error(json.message);
      } else {
        const res = await apiFetch('/api/favorites', { method: 'POST', body: JSON.stringify({ goodsId: Number(id) }) });
        const json = await res.json();
        if (json.code === 200) { setFavorited(true); setFavoriteId(json.data?.id || null); toast.success('已收藏'); }
        else toast.error(json.message);
      }
    } catch { toast.error('网络错误'); }
  };

  const toggleCart = async () => {
    try {
      if (inCart) {
        // Find cart item and remove
        const cartRes = await apiFetch('/api/cart');
        const cartJson = await cartRes.json();
        const cartList = cartJson.data || [];
        const item = cartList.find((c: any) => c.goodsId === Number(id));
        if (item) {
          const res = await apiFetch(`/api/cart/${item.id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.code === 200) { setInCart(false); toast.success('已从购物车移除'); }
          else toast.error(json.message);
        }
      } else {
        const res = await apiFetch('/api/cart', { method: 'POST', body: JSON.stringify({ goodsId: Number(id) }) });
        const json = await res.json();
        if (json.code === 200) { setInCart(true); toast.success('已加入购物车'); }
        else toast.error(json.message);
      }
    } catch { toast.error('网络错误'); }
  };

  const markSold = async () => {
    try {
      const res = await apiFetch(`/api/goods/${id}/sold`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已标记为已售');
        setGoods({ ...goods, status: 'sold' });
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleDelete = async () => {
    if (!confirm('确定删除该商品吗？')) return;
    try {
      const res = await apiFetch(`/api/goods/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已删除');
        navigate(-1);
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleOffline = async () => {
    try {
      const res = await apiFetch(`/api/goods/${id}/offline`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已下架');
        setGoods({ ...goods, status: 'offline' });
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleRelist = async () => {
    try {
      const res = await apiFetch(`/api/goods/${id}/relist`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已重新上架');
        setGoods({ ...goods, status: 'approved' });
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleIntent = async () => {
    if (!token) { toast.error('请先登录'); navigate('/login'); return; }
    setIntentSending(true);
    try {
      const res = await apiFetch('/api/trades/intent', {
        method: 'POST',
        body: JSON.stringify({ goodsId: Number(id), message: '' }),
      });
      const json = await res.json();
      if (json.code === 201) {
        toast.success('已发送购买意向，卖家会收到通知');
        setIntentStatus('pending');
        setGoods({ ...goods, status: 'reserved' });
      } else {
        toast.error(json.message || '操作失败');
      }
    } catch { toast.error('网络错误'); }
    setIntentSending(false);
  };

  const sendComment = async () => {
    if (!commentText.trim()) { toast.error('请输入评论内容'); return; }
    try {
      const res = await apiFetch(`/api/goods/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (json.code === 201) {
        toast.success('评论成功');
        setComments([...comments, json.data]);
        setCommentText('');
      } else {
        toast.error(json.message || '评论失败');
      }
    } catch { toast.error('网络错误'); }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: goods.title, text: `[轻淘] ${goods.title} — ¥${goods.price}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('链接已复制')).catch(() => {});
    }
  };

  if (loading) return <div><Header title="商品详情" /><div className="p-4"><Skeleton.Detail /></div></div>;
  if (!goods) return <div><Header title="商品详情" /><p className="text-center text-gray-400 py-20">商品不存在或已下架</p></div>;

  const isOwner = currentUser?.id === goods.userId;

  const getImgSrc = (img: any) => {
    if (typeof img === 'string') return img;
    // 发布者自己总能看到原图
    if (isOwner) return img.url || img;
    const approved = img._status === 'approved';
    return approved && img.url ? img.url : (img.blurredUrl || img.url || img);
  };
  const getImgStatus = (img: any) => {
    if (typeof img === 'string') return null;
    return img._status || null;
  };

  const ActionButtons = () => (
    <div className="flex gap-2">
      {!isOwner && (
        <button
          onClick={handleIntent}
          disabled={intentSending || intentStatus !== null || goods.status === 'sold' || goods.status === 'offline'}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium flex-[1.5] justify-center transition-all active:scale-[0.97] ${
            intentStatus === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
            intentStatus === 'accepted' ? 'bg-green-100 text-green-700 border border-green-300' :
            'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {intentStatus === 'pending' ? '⌛ 等待卖家回复' :
           intentStatus === 'accepted' ? '✅ 已接受，去私信' :
           intentSending ? '发送中...' : '我想要'}
        </button>
      )}
      {!isOwner && (
        <button
          onClick={() => navigate(`/messages/${goods.userId}`)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium flex-[2] justify-center bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.97] transition-all"
        >
          <FiMessageCircle />
          私信卖家
        </button>
      )}
      {!isOwner && goods.status === 'approved' && (
        <button onClick={handleReserve}
          disabled={reserving}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all active:scale-[0.97] ${
            reserving ? 'bg-gray-100 text-gray-400' : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
          }`}>
          <FiCalendar />
          {reserving ? '...' : '预约看货'}
        </button>
      )}
      {!isOwner && goods.status === 'approved' && (
        <button onClick={handleBarterPropose}
          disabled={bartering}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all active:scale-[0.97] ${
            bartering ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
          }`}>
          <FiRefreshCw />
          {bartering ? '...' : '提议交换'}
        </button>
      )}
      <button onClick={toggleFavorite}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium transition-all active:scale-[0.97] ${favorited ? 'border-red-300 text-red-500 bg-red-50' : 'border-gray-200 dark:border-[var(--color-border)] text-gray-600 dark:text-[var(--color-text-secondary)]'}`}>
        <FiHeart className={favorited ? 'fill-red-500' : ''} />
        {favorited ? '已收藏' : '收藏'}
      </button>
      <button onClick={toggleCart}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all active:scale-[0.97] ${inCart ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)]'}`}>
        <FiShoppingCart />
        {inCart ? '已加购' : '加购'}
      </button>
      {!isOwner && (
        <button onClick={() => setShowReport(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <FiFlag className="text-xs" />
        </button>
      )}
      <button onClick={handleShare}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors">
        <FiShare2 className="text-sm" />
      </button>
    </div>
  );

  const handleReserve = async () => {
    setReserving(true);
    try {
      const res = await apiFetch('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ goodsId: goods.id, message: '想约时间看看实物' }),
      });
      const json = await res.json();
      if (json.code === 201) toast.success('预约成功，等待卖家确认');
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    finally { setReserving(false); }
  };

  const handleBarterPropose = async () => {
    setBartering(true);
    // 加载我的商品列表
    try {
      const res = await apiFetch(`/api/users/${goods.userId}/goods?pageSize=5`);
      // 实际需要加载当前用户的商品来提议交换
      const myRes = await apiFetch(`/api/users/me`);
      // 简化版：直接弹窗让用户输入自己商品ID
      const myGoodsId = prompt('请输入你想用来交换的商品ID（可在你的商品列表查看）：');
      if (!myGoodsId) { setBartering(false); return; }
      const barterRes = await apiFetch('/api/barter', {
        method: 'POST',
        body: JSON.stringify({ fromGoodsId: parseInt(myGoodsId), toGoodsId: goods.id, message: '想用我的物品交换你的' }),
      });
      const json = await barterRes.json();
      if (json.code === 201) toast.success('交换提议已发送');
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    finally { setBartering(false); }
  };

  const handleReport = async () => {
    const finalReason = reportReason === '其他' ? customReason.trim() : reportReason;
    if (!finalReason) { toast.error('请选择或填写举报原因'); return; }
    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'goods', targetId: Number(id), reason: finalReason }),
      });
      const json = await res.json();
      if (json.code === 201) { toast.success('举报已提交'); setShowReport(false); setReportReason(''); setCustomReason(''); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  return (
    <div>
      <Header title="商品详情" onShare={() => {
        const url = window.location.href;
        if (navigator.share) {
          navigator.share({ title: goods.title, url }).catch(() => {});
        } else {
          navigator.clipboard.writeText(url).then(() => toast.success('链接已复制')).catch(() => {});
        }
      }} />
      <div className="md:flex md:gap-6">
        <div className="md:w-1/2 md:flex-shrink-0">
          <div className="bg-gray-100 dark:bg-[var(--color-card)] md:rounded-xl md:overflow-hidden md:sticky md:top-4 relative">
            {goods.images && goods.images.length > 0 ? (
              <>
                <Swiper modules={[Pagination]} pagination className="h-64 md:h-96">
                  {goods.images.map((img: any, i: number) => (
                    <SwiperSlide key={i} className="relative cursor-pointer" onClick={() => setLightboxIndex(i)}>
                      <img src={getImgSrc(img)} alt={`${goods.title} - 图片${i + 1}`} className="w-full h-full object-cover" />
                      {getImgStatus(img) === 'pending' && (
                        <span className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">图片待审核</span>
                      )}
                    </SwiperSlide>
                  ))}
                </Swiper>
                <span className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                  {goods.images.length} 张图片
                </span>
              </>
            ) : (
              <div className="h-72 md:h-96 flex flex-col items-center justify-center text-6xl md:text-8xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 gap-3">
                <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }}>📦</motion.span>
                <span className="text-sm text-gray-400 font-normal">暂无图片</span>
              </div>
            )}
          </div>
        </div>
        <div className="md:w-1/2 md:space-y-3">
          <div className="bg-white dark:bg-[var(--color-card)] px-4 py-4 md:rounded-xl">
            <div className="flex items-end gap-2">
              <span className="text-2xl md:text-3xl font-bold text-red-500">¥{goods.price}</span>
              {goods.originalPrice && <span className="text-sm text-gray-400 line-through">¥{goods.originalPrice}</span>}
            </div>
            <h1 className="text-lg md:text-xl font-medium mt-2">{goods.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">{CONDITION_MAP[goods.condition as keyof typeof CONDITION_MAP]}</span>
              {(goods.listType === 'sale' || goods.listType === 'rent') && <span className={`text-xs px-2 py-0.5 rounded ${goods.listType === 'sale' ? 'bg-green-50 text-green-600' : 'bg-green-50 text-green-600'}`}>{goods.listType === 'sale' ? '出售' : '出租'}</span>}
              {(goods.listType === 'buy' || goods.listType === 'rent_want') && <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600">{goods.listType === 'buy' ? '求购' : '求租'}</span>}
              <CampusTag campus={goods.campus} />
              {goods.status && STATUS_MAP[goods.status as keyof typeof STATUS_MAP] && (
                <span className={`text-xs px-2 py-0.5 rounded text-white ${STATUS_MAP[goods.status as keyof typeof STATUS_MAP].color}`}>{STATUS_MAP[goods.status as keyof typeof STATUS_MAP].label}</span>
              )}
              {goods.status === 'offline' && (goods as any)._aiFlagged && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 font-medium">AI审核未通过</span>
              )}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1"><FiEye className="text-xs" /> {goods.viewCount} 次</span>
              <span className="inline-flex items-center gap-1"><FiClock className="text-xs" /> {formatTime(goods.createdAt)}</span>
            </div>
            {goods.campusLocation && <span className="inline-block mt-2 text-sm text-gray-500">📍 交易地点：{goods.campusLocation}</span>}
          </div>
          <div className="hidden md:block bg-white dark:bg-[var(--color-card)] p-4 rounded-xl"><ActionButtons /></div>
          <div className="bg-white dark:bg-[var(--color-card)] px-4 py-4 md:rounded-xl mt-2 md:mt-0">
            <h3 className="font-medium mb-2">商品描述</h3>
            <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{goods.description || '(无描述)'}</p>
          </div>
          <div className="bg-white dark:bg-[var(--color-card)] px-4 py-4 md:rounded-xl mt-2 md:mt-0">
            <h3 className="font-medium mb-3">卖家信息</h3>
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-2 -mx-2 transition-colors"
              onClick={() => navigate(`/user/${goods.user?.id}`)}>
              <UserAvatar src={goods.user?.avatarUrl} nickname={goods.user?.nickname} size="lg" />
              <div className="flex-1"><p className="font-medium">{goods.user?.nickname}</p><p className="text-xs text-gray-400">点击查看TA的主页 →</p></div>
            </div>
            {!isOwner && (
              <button
                onClick={() => navigate(`/user/${goods.userId}`)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 text-indigo-500 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                查看TA的全部商品 →
              </button>
            )}
            {!isOwner && (
              <button
                onClick={() => navigate(`/messages/${goods.userId}`)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.97] transition-all"
              >
                <FiMessageCircle className="text-sm" />
                私信卖家
              </button>
            )}
            {!isOwner && (goods.user?.wechat || goods.user?.qq) && (
              <div className="border-t border-gray-50 dark:border-[var(--color-border)] pt-3 mt-3">
                {!showContact ? (
                  <button
                    onClick={() => setShowContact(true)}
                    className="w-full py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    查看卖家联系方式
                  </button>
                ) : (
                  <div className="space-y-2">
                    {goods.user?.wechat && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-gray-500">微信：{goods.user.wechat}</span>
                        <button onClick={() => copyText(goods.user.wechat, 'wechat')} className="flex items-center gap-1 text-xs text-indigo-500 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30">
                          {copiedField === 'wechat' ? <FiCheck /> : <FiCopy />} 复制
                        </button>
                      </div>
                    )}
                    {goods.user?.qq && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-gray-500">QQ：{goods.user.qq}</span>
                        <button onClick={() => copyText(goods.user.qq, 'qq')} className="flex items-center gap-1 text-xs text-indigo-500 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30">
                          {copiedField === 'qq' ? <FiCheck /> : <FiCopy />} 复制
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {isOwner && (
              <>
                {goods.user?.wechat && (
                  <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-[var(--color-border)]">
                    <span className="text-sm text-gray-500">微信：{goods.user.wechat}</span>
                    <button onClick={() => copyText(goods.user.wechat, 'wechat')} className="flex items-center gap-1 text-xs text-indigo-500 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30">
                      {copiedField === 'wechat' ? <FiCheck /> : <FiCopy />} 复制
                    </button>
                  </div>
                )}
                {goods.user?.qq && (
                  <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-[var(--color-border)]">
                    <span className="text-sm text-gray-500">QQ：{goods.user.qq}</span>
                    <button onClick={() => copyText(goods.user.qq, 'qq')} className="flex items-center gap-1 text-xs text-indigo-500 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30">
                      {copiedField === 'qq' ? <FiCheck /> : <FiCopy />} 复制
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Goods Comments */}
          <div className="bg-white dark:bg-[var(--color-card)] px-4 py-4 md:rounded-xl mt-2 md:mt-0">
            <h3 className="font-medium mb-3">全部评论（{comments.length}）</h3>
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无评论，来问问卖家吧</p>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {c.user?.nickname?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{c.user?.nickname}</span>
                        <span className="text-[10px] text-gray-400">{formatTime(c.createdAt)}</span>
                        {c.status === 'pending' && <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-600">审核中</span>}
                        {c.status === 'rejected' && <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-500">已拒绝</span>}
                        {currentUser?.id === c.userId && (
                          <button onClick={async () => {
                            try {
                              const res = await apiFetch(`/api/goods/${id}/comments/${c.id}`, { method: 'DELETE' });
                              const json = await res.json();
                              if (json.code === 200) {
                                setComments(comments.filter(x => x.id !== c.id));
                                toast.success('已删除');
                              }
                            } catch { toast.error('网络错误'); }
                          }} className="text-[10px] text-gray-400 hover:text-red-500 ml-auto">删除</button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] mt-0.5">{c.content}</p>
                      {c.status === 'rejected' && c.reviewComment && (
                        <p className="text-xs text-red-400 mt-0.5">原因：{c.reviewComment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="text" placeholder="说点什么..." value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                maxLength={500}
                className="flex-1 px-3 py-2 text-sm rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] outline-none" />
              <button onClick={sendComment} disabled={!commentText.trim()}
                className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-full font-medium disabled:opacity-40 hover:bg-indigo-600 transition-colors">发送</button>
            </div>
          </div>

          {isOwner && (
            <div className="bg-white dark:bg-[var(--color-card)] px-4 py-4 md:rounded-xl mt-2 md:mt-0 space-y-2">
              <button onClick={() => navigate(`/publish/goods/${goods.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors">
                <FiEdit2 /> 编辑商品
              </button>
              {goods.status === 'approved' && (
                <>
                  <button onClick={markSold}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                    <FiCheckCircle /> 标记为已售
                  </button>
                  <button onClick={handleOffline}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-50 text-yellow-600 rounded-xl text-sm font-medium hover:bg-yellow-100 transition-colors">
                    <FiArrowDown /> 下架商品
                  </button>
                </>
              )}
              {goods.status === 'offline' && (
                <button onClick={handleRelist}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                  <FiArrowUp /> 重新上架
                </button>
              )}
              <button onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                <FiTrash2 /> 删除商品
              </button>
            </div>
          )}
          <div className="hidden md:block h-4" />
        </div>
      </div>
      <div className="md:hidden fixed bottom-14 left-0 right-0 bg-white/90 dark:bg-[var(--color-card)]/90 backdrop-blur border-t border-gray-200 dark:border-[var(--color-border)] px-4 py-3 z-20">
        <ActionButtons />
      </div>
      <div className="md:hidden h-20" />

      {/* Image Lightbox */}
      <ImageLightbox
        images={goods ? (goods.images || []).map((img: any) => getImgSrc(img)) : []}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowReport(false); setReportReason(''); setCustomReason(''); }}>
          <div className="bg-white dark:bg-[var(--color-card)] rounded-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3">举报商品</h3>
            <div className="space-y-2 mb-3">
              {['虚假商品', '价格不实', '商品违规', '卖家欺诈', '其他'].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${reportReason === r ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{r}</button>
              ))}
            </div>
            <textarea value={customReason} onChange={e => setCustomReason(e.target.value)}
              placeholder={reportReason === '其他' ? '请描述具体原因...' : '可补充详细描述（选填）'}
              rows={2} maxLength={200}
              className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm outline-none resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowReport(false); setReportReason(''); setCustomReason(''); }} className="flex-1 py-2.5 rounded-xl border text-sm font-medium">取消</button>
              <button onClick={handleReport} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">提交举报</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
