import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { PulseDot } from '@/components/ui/PulseDot';
import { Skeleton } from '@/components/common/Skeleton';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [banners, setBanners] = useState<any[]>([]);
  const [newBanner, setNewBanner] = useState({ imageUrl: '', linkUrl: '', sortOrder: 0 });
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'checking'>('checking');
  const [loading, setLoading] = useState(true);

  const fetchHealth = () => apiFetch('/health').then(r => r.json()).then(j => {
    setHealthStatus(j.status === 'ok' ? 'healthy' : 'degraded');
  }).catch(() => setHealthStatus('degraded'));

  const fetchStats = () => apiFetch('/api/admin/stats').then(r => r.json()).then(j => { if (j.code === 200) setStats(j.data); }).catch(() => toast.error('加载统计数据失败')).finally(() => setLoading(false));
  const fetchBanners = () => apiFetch('/api/banners').then(r => r.json()).then(j => { if (j.code === 200) setBanners(j.data || []); }).catch(() => toast.error('加载轮播图失败'));

  useEffect(() => { fetchStats(); fetchBanners(); fetchHealth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addBanner = async () => {
    if (!newBanner.imageUrl.trim()) { toast.error('请输入图片URL'); return; }
    const res = await apiFetch('/api/admin/banners', {
      method: 'POST',
      body: JSON.stringify(newBanner),
    });
    const json = await res.json();
    if (json.code === 201 || json.code === 200) { toast.success('已添加'); setNewBanner({ imageUrl: '', linkUrl: '', sortOrder: 0 }); fetchBanners(); }
    else toast.error(json.message || '添加失败');
  };

  const deleteBanner = async (id: number) => {
    await apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
    toast.success('已删除'); fetchBanners();
  };

  const cards = [
    { label: '总用户数', value: stats.totalUsers || 0, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' },
    { label: '总商品数', value: stats.totalGoods || 0, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' },
    { label: '总帖子数', value: stats.totalPosts || 0, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' },
    { label: '今日新增用户', value: stats.newUsersToday || 0, color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300' },
    { label: '今日新增商品', value: stats.newGoodsToday || 0, color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300' },
    { label: '今日新增帖子', value: stats.newPostsToday || 0, color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300' },
    { label: '待审核', value: stats.pendingTotal || 0, color: stats.pendingTotal > 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500' },
    { label: '失物招领', value: stats.totalLostFound || 0, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">数据概览</h2>
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-white dark:bg-[var(--color-card)]">
        <PulseDot color={healthStatus === 'healthy' ? 'green' : healthStatus === 'degraded' ? 'red' : 'yellow'} size="sm" pulse={healthStatus !== 'checking'} />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          系统状态：{healthStatus === 'healthy' ? '正常运行' : healthStatus === 'degraded' ? '服务降级' : '检测中...'}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/50 dark:bg-[var(--color-card)]/50 rounded-xl p-4 animate-pulse">
              <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))
        ) : (
          cards.map((c) => (
            <div key={c.label} className={`${c.color} rounded-xl p-4`}>
              <p className="text-xs opacity-70">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
          ))
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <button onClick={() => navigate('/admin/content')} className="p-4 bg-white dark:bg-[var(--color-card)] rounded-xl text-left hover:shadow-md transition-shadow active:scale-[0.98]">
          <p className="font-medium text-sm md:text-base">内容审核</p>
          <p className="text-xs md:text-sm text-gray-400 mt-1">商品/帖子审核</p>
        </button>
        <button onClick={() => navigate('/admin/images')} className="p-4 bg-white dark:bg-[var(--color-card)] rounded-xl text-left hover:shadow-md transition-shadow active:scale-[0.98]">
          <p className="font-medium text-sm md:text-base">图片审核</p>
          <p className="text-xs md:text-sm text-gray-400 mt-1">查看待审图片</p>
        </button>
        <button onClick={() => navigate('/admin/users')} className="p-4 bg-white dark:bg-[var(--color-card)] rounded-xl text-left hover:shadow-md transition-shadow active:scale-[0.98]">
          <p className="font-medium text-sm md:text-base">用户管理</p>
          <p className="text-xs md:text-sm text-gray-400 mt-1">管理平台用户</p>
        </button>
      </div>
      <h3 className="font-bold mb-3">轮播图管理 ({banners.length})</h3>
      <div className="space-y-2 mb-4">
        {banners.map((b) => (
          <div key={b.id} className="flex items-center gap-3 bg-white dark:bg-[var(--color-card)] rounded-xl p-3">
            <img src={b.imageUrl} alt="" className="w-16 h-10 rounded object-cover bg-gray-100" loading="lazy" decoding="async" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{b.imageUrl}</p>
              <p className="text-xs text-gray-400">排序：{b.sortOrder} | {b.isActive ? '启用' : '停用'}</p>
            </div>
            <button onClick={() => deleteBanner(b.id)} className="text-xs text-red-500">删除</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 bg-white dark:bg-[var(--color-card)] rounded-xl p-3">
        <input value={newBanner.imageUrl} onChange={(e) => setNewBanner(p => ({ ...p, imageUrl: e.target.value }))} placeholder="图片URL" className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[var(--color-card-hover)] outline-none" />
        <input value={newBanner.sortOrder} onChange={(e) => setNewBanner(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} type="number" placeholder="排序" className="w-16 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[var(--color-card-hover)] outline-none" />
        <button onClick={addBanner} className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600">添加</button>
      </div>
    </div>
  );
}
