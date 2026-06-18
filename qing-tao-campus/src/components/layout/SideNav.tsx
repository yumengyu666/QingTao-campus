import { NavLink } from 'react-router-dom';
import {
  FiHome, FiMessageSquare, FiPlusCircle, FiUser, FiShield,
  FiMail, FiHash, FiBookOpen, FiHeart, FiMessageCircle,
  FiSearch, FiGrid, FiCompass, FiChevronLeft,
  FiChevronRight, FiShoppingBag, FiHelpCircle,
} from 'react-icons/fi';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadStore } from '@/stores/unreadStore';
import { UserAvatar } from '@/components/common/UserAvatar';
import PublishModal from '@/components/common/PublishModal';
import { useEffect, useRef, useState, memo } from 'react';
import { apiFetch } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Navigation Item Types ── */
interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  adminOnly?: boolean;
}

/* ── Nav Groups ── */
const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/', icon: FiHome, label: '首页' },
      { to: '/square', icon: FiMessageSquare, label: '广场' },
      { to: '/goods', icon: FiShoppingBag, label: '淘货' },
    ],
  },
  {
    label: '发现',
    items: [
      { to: '/wanted', icon: FiSearch, label: '求购' },
      { to: '/treehole', icon: FiHash, label: '树洞' },
      { to: '/tags', icon: FiGrid, label: '话题' },
    ],
  },
  {
    label: '学习',
    items: [
      { to: '/qa', icon: FiHelpCircle, label: '答疑' },
      { to: '/resources', icon: FiBookOpen, label: '资料' },
      { to: '/agent', icon: FiMessageCircle, label: '小轻助手' },
    ],
  },
  {
    label: '社交',
    items: [
      { to: '/dating', icon: FiHeart, label: '恋爱空间' },
      { to: '/explore', icon: FiCompass, label: '探索' },
    ],
  },
];

/* ── Badge Component ── */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none shadow-sm"
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
}

/* ── Desktop Nav Item ── */
function NavLinkItem({ to, icon: Icon, label, badge }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl transition-all duration-200 px-3 py-2.5 relative group ${
          isActive
            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="nav-active-bar"
              className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <div className="relative">
            <Icon
              size={20}
              className={`flex-shrink-0 transition-transform duration-200 ${
                isActive ? 'scale-105' : 'group-hover:scale-110'
              }`}
            />
            <Badge count={badge || 0} />
          </div>
          <span className={`text-sm font-medium truncate ${isActive ? 'font-semibold' : ''}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/* ── Mobile Bottom Nav Item ── */
function MobileNavLink({ to, icon: Icon, label, badge }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 px-1 py-1 transition-all duration-200 relative ${
          isActive
            ? 'text-indigo-500 dark:text-indigo-400 scale-105'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`
      }
    >
      <div className="relative">
        <Icon size={18} />
        <Badge count={badge || 0} />
      </div>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </NavLink>
  );
}

/* ── Main SideNav ── */
export function SideNav() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const unreadCount = useUnreadStore((s) => s.count);
  const msgUnread = useUnreadStore((s) => s.msgCount);
  const setUnreadCount = useUnreadStore((s) => s.setCount);
  const setMsgUnread = useUnreadStore((s) => s.setMsgCount);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const prevUnreadRef = useRef(0);
  const prevMsgUnreadRef = useRef(0);
  const [showPublish, setShowPublish] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Request notification permission
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const notifyBrowser = (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return;
    new Notification(title, { body, icon: '/logo.png', tag: 'qingtao' });
  };

  // Poll unread counts
  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      setMsgUnread(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const nr = await apiFetch('/api/notifications/unread-count');
        const nj = await nr.json();
        if (nj.code === 200) {
          const count = nj.data?.count || 0;
          if (count > prevUnreadRef.current && prevUnreadRef.current >= 0) {
            notifyBrowser('轻淘 · 新通知', `您有 ${count} 条未读通知`);
          }
          prevUnreadRef.current = count;
          setUnreadCount(count);
        }
      } catch {}

      try {
        const [mr, dr] = await Promise.all([
          apiFetch('/api/messages/unread-count'),
          apiFetch('/api/dating/messages/unread-count'),
        ]);
        const [mj, dj] = await Promise.all([mr.json(), dr.json()]);
        const msgCount =
          (mj.code === 200 ? mj.data?.count || 0 : 0) +
          (dj.code === 200 ? dj.data?.count || 0 : 0);
        if (msgCount > prevMsgUnreadRef.current && prevMsgUnreadRef.current >= 0) {
          notifyBrowser('轻淘 · 新私信', `您有 ${msgCount} 条未读私信`);
        }
        prevMsgUnreadRef.current = msgCount;
        setMsgUnread(msgCount);
      } catch {}
    };

    fetchUnread();
    timerRef.current = setInterval(fetchUnread, 15000);

    const onVisible = () => {
      if (!document.hidden) fetchUnread();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, setUnreadCount, setMsgUnread]);

  // Save collapsed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qingtao-sidebar-collapsed');
      if (saved === 'true') setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('qingtao-sidebar-collapsed', String(next));
  };

  return (
    <>
      {/* ═══════════════ Desktop Sidebar ═══════════════ */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:bg-white md:dark:bg-[var(--color-card)] md:border-r md:border-gray-100 md:dark:border-[var(--color-border)] md:z-40 transition-all duration-300 ${
          collapsed ? 'md:w-[4.5rem]' : 'md:w-56'
        }`}
      >
        <div className={`flex flex-col h-full p-3 ${collapsed ? 'px-2' : 'px-3'}`}>
          {/* ── Logo ── */}
          <NavLink
            to="/"
            className={`flex items-center rounded-xl mb-6 mt-1 group transition-all ${
              collapsed ? 'justify-center p-2' : 'gap-3 px-2 py-1'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm shadow-indigo-500/20 flex-shrink-0 overflow-hidden">
              <img src="/logo.png" alt="轻淘" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-lg leading-tight tracking-tight group-hover:text-indigo-500 transition-colors">
                  轻淘
                </h1>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                  郑州轻工业大学
                </p>
              </div>
            )}
          </NavLink>

          {/* ── Navigation Groups ── */}
          <nav className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
            {navGroups.map((group, gi) => (
              <div key={gi}>
                {group.label && !collapsed && (
                  <p className="text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wider px-3 mb-1.5">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items
                    .filter((item) => !item.adminOnly || user?.role === 'admin')
                    .map((item) =>
                      collapsed ? (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          title={item.label}
                          className={({ isActive }) =>
                            `flex items-center justify-center rounded-xl transition-all duration-200 p-2.5 relative group ${
                              isActive
                                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200'
                            }`
                          }
                        >
                          <item.icon size={20} className="flex-shrink-0" />
                        </NavLink>
                      ) : (
                        <NavLinkItem key={item.to} {...item} />
                      )
                    )}
                </div>
              </div>
            ))}
          </nav>

          {/* ── Bottom Actions ── */}
          <div className="pt-3 space-y-0.5 border-t border-gray-100 dark:border-[var(--color-border)]">
            {/* Publish */}
            <button
              onClick={() => setShowPublish(true)}
              className={`flex items-center rounded-xl transition-all duration-200 w-full text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200 group ${
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              }`}
              title="发布"
            >
              <FiPlusCircle size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">发布</span>}
            </button>

            <NavLinkItem to="/messages" icon={FiMail} label="消息" badge={msgUnread} />
            <NavLinkItem
              to="/profile"
              icon={FiUser}
              label="我的"
              badge={unreadCount}
            />

            {user?.role === 'admin' && (
              <>
                <div className="my-1 border-t border-gray-100 dark:border-[var(--color-border)]" />
                <NavLinkItem to="/admin" icon={FiShield} label="管理后台" />
              </>
            )}
          </div>

          {/* ── User Profile Card ── */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[var(--color-border)]">
            <NavLink
              to="/profile"
              className={`flex items-center rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-[0.98] group ${
                collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
              }`}
            >
              <UserAvatar
                src={user?.avatarUrl}
                nickname={user?.nickname || user?.username}
                size="md"
              />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                    {user?.nickname || user?.username || '未登录'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">查看个人主页</p>
                </div>
              )}
            </NavLink>
          </div>

          {/* ── Collapse Toggle ── */}
          <button
            onClick={toggleCollapsed}
            className="mt-2 mx-auto p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* ═══════════════ Mobile Bottom Nav ═══════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[var(--color-card)]/90 backdrop-blur-xl border-t border-gray-100 dark:border-[var(--color-border)] safe-bottom z-50">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
          <MobileNavLink to="/" icon={FiHome} label="首页" />
          <MobileNavLink to="/square" icon={FiMessageSquare} label="广场" />

          {/* Publish Center Button */}
          <button
            onClick={() => setShowPublish(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all relative"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform">
              <FiPlusCircle size={20} className="text-white" />
            </div>
            <span className="text-[10px] font-medium">发布</span>
          </button>

          <MobileNavLink to="/messages" icon={FiMail} label="消息" badge={msgUnread} />
          <MobileNavLink to="/profile" icon={FiUser} label="我的" badge={unreadCount} />
        </div>
      </nav>

      {/* Publish Modal */}
      <PublishModal show={showPublish} onClose={() => setShowPublish(false)} />
    </>
  );
}
