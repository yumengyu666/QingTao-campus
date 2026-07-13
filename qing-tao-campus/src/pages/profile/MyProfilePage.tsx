import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadStore } from '@/stores/unreadStore';
import { apiFetch } from '@/utils/api';
import {
  FiBox, FiFileText, FiHeart, FiUsers, FiUserPlus,
  FiClock, FiSettings, FiLogOut, FiChevronRight,
  FiMail, FiBell, FiShield, FiAlertTriangle, FiX, FiShoppingBag,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const { user, logout } = useAuthStore();
  const unreadCount = useUnreadStore((s) => s.count);
  const [showChangelog, setShowChangelog] = useState(false);
  const [stats, setStats] = useState({ followCount: 0, fansCount: 0, goodsCount: 0, postsCount: 0, favoritesCount: 0, reputationLabel: '', completedTrades: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      apiFetch(`/api/users/${user.id}`).then((r) => r.json()),
      apiFetch('/api/favorites').then((r) => r.json()),
    ])
      .then(([userJson, favJson]) => {
        if (userJson.code === 200) {
          const d = userJson.data;
          setStats((prev) => ({
            ...prev,
            followCount: d.followCount || 0,
            fansCount: d.fansCount || 0,
            goodsCount: d.goodsCount || 0,
            postsCount: d.postsCount || 0,
            reputationLabel: d.reputationLabel || '',
            completedTrades: d.completedTrades || 0,
          }));
        }
        if (favJson.code === 200) {
          setStats((prev) => ({ ...prev, favoritesCount: favJson.data?.total || 0 }));
        }
      })
      .catch(() => { /* 统计数据加载失败：非关键功能，静默降级 */ })
  }, [user?.id]);

  const changelog = [
    {
      version: 'v2.4.0',
      date: '2026-06-02',
      items: [
        '头像上传：个人资料页支持更换头像',
        '忘记密码：支持通过安全提问验证重置密码',
        '浏览器推送通知：新私信和通知可桌面推送',
        '图片灯箱：点击图片全屏浏览，支持键盘导航',
        '分页器增强：页码数字 + 跳转输入 + 总页数',
        '首页轮播图支持后台动态更换（管理员可配置）',
        '发布表单草稿自动保存，意外关闭不丢失',
        '恋爱对象约束：已有对象无法发起/接受新请求',
        '热门算法优化：综合浏览量和时间新鲜度排序',
        'UI 完善：校区中文标签、字数计数器、相对时间',
      ],
    },
    {
      version: 'v2.3.0',
      date: '2026-06-01',
      items: [
        'AI 内容审核全面升级（审计日志 + 15秒超时）',
        '先审后发：商品/帖子/失物招领发布后须审核通过才公开展示',
        '树洞新增举报入口 + AI 审核覆盖',
        '私聊支持发送图片',
        '联系方式保护：需主动确认后才显示微信/QQ',
        '注销账号功能',
        '购物车/收藏操作增强（联系卖家、加购）',
      ],
    },
    {
      version: 'v2.2.0',
      date: '2026-05-31',
      items: [
        '新增求购功能，可在发布页选择"求购"',
        '商品标签：出售绿色"出"、求购红色"求"、出租紫色"租"',
        '商品支持上架/下架操作',
        '商品评论、帖子评论、失物招领评论需管理员审核后展示',
        '通知支持多选批量标记已读和删除',
        '首页轮播图翻页指示器移至图片下方',
      ],
    },
    {
      version: 'v2.1.0',
      date: '2026-05-30',
      items: [
        '用户主页上线（查看他人商品/帖子/联系方式）',
        '通知系统完善：所有类型通知汇总，红点同步到"我的"',
        '账号封禁全局拦截，被封用户强制下线',
        '管理员可查看/冻结/删除用户',
        '发布商品/帖子需填写并审核通过联系方式',
        '浏览记录改用 localStorage 持久化',
      ],
    },
    {
      version: 'v1.0.0',
      date: '2026-05-25',
      items: [
        '轻淘正式上线',
        '商品发布/浏览/搜索/收藏/购物车',
        '帖子广场/失物招领',
        '用户注册/登录/资料修改（审核制）',
        '管理员审核系统（商品/帖子/失物/资料/评论）',
        '双校区切换（科学校区 & 东风校区）',
        '响应式设计：手机 App + 桌面 Web 双模式',
      ],
    },
  ];

  const menuItems = [
    { icon: FiBox, label: '我的商品', path: '/profile/goods', count: stats.goodsCount },
    { icon: FiFileText, label: '我的帖子', path: '/profile/posts', count: stats.postsCount },
    { icon: FiHeart, label: '我的收藏', path: '/profile/favorites', count: stats.favoritesCount },
    { icon: FiUserPlus, label: '我的关注', path: '/profile/following', count: stats.followCount },
    { icon: FiUsers, label: '我的粉丝', path: '/profile/followers', count: stats.fansCount },
    { icon: FiClock, label: '浏览记录', path: '/profile/history' },
    { icon: FiShoppingBag, label: '交易管理', path: '/profile/trades' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <Header title="我的" showBack={false} />

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 bg-white dark:bg-[var(--color-card)] rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <UserAvatar
            src={user?.avatarUrl}
            nickname={user?.nickname || user?.username}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {user?.nickname || user?.username}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5 truncate">
              {user?.bio || '这个人很懒，什么都没写~'}
            </p>
            {stats.reputationLabel && (
              <p className="text-xs mt-1">
                <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                  {stats.reputationLabel}
                </span>
                {stats.completedTrades > 0 && (
                  <span className="text-gray-400 ml-1.5">{stats.completedTrades}笔交易</span>
                )}
              </p>
            )}
            <div className="flex gap-4 mt-2.5 text-sm">
              <button
                onClick={() => nav('/profile/following')}
                className="hover:text-indigo-500 transition-colors"
              >
                <b className="text-indigo-600">
                  {statsLoading ? '-' : stats.followCount}
                </b>{' '}
                <span className="text-gray-400">关注</span>
              </button>
              <button
                onClick={() => nav('/profile/followers')}
                className="hover:text-indigo-500 transition-colors"
              >
                <b className="text-indigo-600">
                  {statsLoading ? '-' : stats.fansCount}
                </b>{' '}
                <span className="text-gray-400">粉丝</span>
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => nav('/profile/edit')}
          className="mt-4 w-full py-2.5 border border-indigo-200 dark:border-indigo-800 text-indigo-500 rounded-xl text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-[0.98] transition-all"
        >
          编辑资料
        </button>
      </motion.div>

      {/* Menu Grid */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2.5">
        {menuItems.map(({ icon: Icon, label, path, count }, i) => (
          <motion.button
            key={path}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            whileTap={{ scale: 0.95 }}
            onClick={() => nav(path)}
            className="flex flex-col items-center gap-2 py-4 bg-white dark:bg-[var(--color-card)] rounded-xl shadow-sm active:scale-95 transition-all relative hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)]"
          >
            <div className="relative">
              <Icon className="text-xl text-indigo-500" />
            </div>
            <span className="text-xs text-gray-600 dark:text-[var(--color-text-secondary)] font-medium text-center">
              {label}
              {count != null && count > 0 && (
                <span className="text-gray-400 ml-0.5">{count}</span>
              )}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Settings */}
      <div className="mx-4 mt-3 bg-white dark:bg-[var(--color-card)] rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => nav('/profile/password')}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-[var(--color-border)] hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <FiSettings className="text-gray-400" />
            <span className="text-sm">修改密码</span>
          </div>
          <FiChevronRight className="text-gray-300" />
        </button>
        <button
          onClick={() => nav('/profile/security')}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-[var(--color-border)] hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <FiShield className="text-gray-400" />
            <span className="text-sm">账号安全</span>
            <span className="text-[10px] text-gray-400">安全提问</span>
          </div>
          <FiChevronRight className="text-gray-300" />
        </button>
        <button
          onClick={() => nav('/profile/notifications')}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-[var(--color-border)] hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <FiBell className="text-gray-400" />
            <span className="text-sm">通知</span>
          </div>
          <div className="flex items-center gap-2">
            <CountBadge count={unreadCount} />
            <FiChevronRight className="text-gray-300" />
          </div>
        </button>
        <button
          onClick={() => nav('/profile/blacklist')}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-[var(--color-border)] hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <FiShield className="text-gray-400" />
            <span className="text-sm">黑名单</span>
          </div>
          <FiChevronRight className="text-gray-300" />
        </button>
        <button
          onClick={() => {
            if (window.confirm('确定要注销账号吗？此操作不可撤销，所有数据将被清除。') && window.confirm('再次确认：注销后所有商品、帖子、聊天记录将永久删除。')) {
              apiFetch('/api/users/me', { method: 'DELETE' })
                .then(r => r.json())
                .then(j => { if (j.code === 200) { useAuthStore.getState().logout(); } })
                .catch(() => toast.error('注销失败，请稍后重试'));
            }
          }}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-[var(--color-border)] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="text-red-400" />
            <span className="text-sm text-red-500">注销账号</span>
          </div>
          <FiChevronRight className="text-gray-300" />
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FiLogOut className="text-red-400" />
            <span className="text-sm text-red-500 font-medium">退出登录</span>
          </div>
        </button>
      </div>

      {/* Contact */}
      <div className="mx-4 mt-3 bg-white dark:bg-[var(--color-card)] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FiMail className="text-indigo-500" />
          <h3 className="font-medium text-sm">联系我们</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-500 dark:text-[var(--color-text-secondary)]">
          <p>开发者：计算机学院学生</p>
          <p className="text-xs text-gray-300 dark:text-gray-500 leading-relaxed mt-3">
            轻淘是专为郑州轻工业大学打造的校园二手交易平台。
            覆盖科学校区和东风校区，所有发布内容均经过审核。
            如果使用中遇到问题或有建议，欢迎通过平台反馈功能联系我们~
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-gray-300 dark:text-gray-600 py-6">
        轻淘 v2.4.0 · 郑州轻工业大学 ·{' '}
        <button
          onClick={() => setShowChangelog(true)}
          className="text-indigo-400 underline hover:text-indigo-500"
        >
          更新日志
        </button>
      </div>

      {/* Changelog Modal */}
      {showChangelog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowChangelog(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white dark:bg-[var(--color-card)] rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[70vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">更新日志</h2>
              <button
                onClick={() => setShowChangelog(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiX />
              </button>
            </div>
            <div className="space-y-4">
              {changelog.map((v, i) => (
                <div
                  key={i}
                  className={
                    i > 0 ? 'pt-4 border-t border-gray-100 dark:border-[var(--color-border)]' : ''
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">
                      {v.version}
                    </span>
                    <span className="text-xs text-gray-400">{v.date}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {v.items.map((item, j) => (
                      <li
                        key={j}
                        className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] flex items-start gap-2"
                      >
                        <span className="text-indigo-400 mt-1 flex-shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
      <div className="h-4" />
    </div>
  );
}
