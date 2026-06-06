import { NavLink } from 'react-router-dom';
import { FiHome, FiMessageSquare, FiPlusCircle, FiUser, FiShield, FiMail, FiHash, FiBookOpen, FiHeart, FiMessageCircle } from 'react-icons/fi';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadStore } from '@/stores/unreadStore';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useEffect, useRef } from 'react';
import { apiFetch } from '@/utils/api';

const mainTabs = [
  { to: '/', icon: FiHome, label: '首页' },
  { to: '/square', icon: FiMessageSquare, label: '广场' },
];

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavLinkItem({ to, icon: Icon, label, badge }: { to: string; icon: React.ElementType; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl transition-colors px-4 py-3 relative ${
          isActive
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }`
      }
    >
      <div className="relative">
        <Icon className="text-xl flex-shrink-0" />
        <Badge count={badge || 0} />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  );
}

function MobileNavLink({ to, icon: Icon, label, badge }: { to: string; icon: React.ElementType; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors relative ${
          isActive ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600'
        }`
      }
    >
      <div className="relative">
        <Icon className="text-lg" />
        <Badge count={badge || 0} />
      </div>
      <span className="text-[10px]">{label}</span>
    </NavLink>
  );
}

export function SideNav() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const unreadCount = useUnreadStore((s) => s.count);
  const msgUnread = useUnreadStore((s) => s.msgCount);
  const setUnreadCount = useUnreadStore((s) => s.setCount);
  const setMsgUnread = useUnreadStore((s) => s.setMsgCount);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const prevUnreadRef = useRef(0);
  const prevMsgUnreadRef = useRef(0);
  const notifiedRef = useRef(false);

  // 请求浏览器通知权限
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 浏览器推送：检测到新通知/新消息时发送
  const notifyBrowser = (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return; // 页面在前台不通知
    new Notification(title, { body, icon: '/logo.png', tag: 'qingtao' });
  };

  useEffect(() => {
    if (!token) { setUnreadCount(0); setMsgUnread(0); return; }
    const fetchUnread = async () => {
      // 轮询通知未读数
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

      // 轮询消息未读数（普通私信 + 恋爱消息）
      try {
        const [mr, dr] = await Promise.all([
          apiFetch('/api/messages/unread-count'),
          apiFetch('/api/dating/messages/unread-count'),
        ]);
        const [mj, dj] = await Promise.all([mr.json(), dr.json()]);
        const msgCount = (mj.code === 200 ? mj.data?.count || 0 : 0) +
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

    // 切回标签页时立即刷新
    const onVisible = () => { if (!document.hidden) fetchUnread(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, setUnreadCount, setMsgUnread]);

  return (
    <>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:left-0 md:top-0 md:bottom-0 md:bg-white md:dark:bg-[var(--color-card)] md:border-r md:border-gray-200 md:dark:border-[var(--color-border)] md:z-40 md:p-4">
        <div className="flex items-center gap-3 px-2 mb-8 mt-2">
          <img src="/logo.png" alt="轻淘" className="w-10 h-10 rounded-xl flex-shrink-0 object-contain" />
          <div>
            <h1 className="font-bold text-lg leading-tight">轻淘</h1>
            <p className="text-[10px] text-gray-400 leading-tight">郑州轻工业大学</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {mainTabs.map((tab) => (
            <NavLinkItem key={tab.to} {...tab} />
          ))}

          {/* TreeHole */}
          <NavLinkItem to="/treehole" icon={FiHash} label="树洞" />

          {/* Resources */}
          <NavLinkItem to="/resources" icon={FiBookOpen} label="资料" />

          {/* Agent 小轻助手 */}
          <NavLinkItem to="/agent" icon={FiMessageCircle} label="小轻助手" />

          {/* Publish */}
          <NavLinkItem to="/publish/goods" icon={FiPlusCircle} label="发布" />

          {/* Messages — between publish & profile */}
          <NavLinkItem to="/messages" icon={FiMail} label="消息" badge={msgUnread} />

          {/* Profile */}
          <NavLinkItem to="/profile" icon={FiUser} label="我的" badge={unreadCount} />

          {user?.role === 'admin' && (
            <div className="pt-2 border-t border-gray-100 dark:border-[var(--color-border)]">
              <NavLinkItem to="/admin" icon={FiShield} label="管理后台" />
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-[var(--color-border)]">
          <NavLink to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all active:scale-[0.98] group">
            <UserAvatar src={user?.avatarUrl} nickname={user?.nickname || user?.username} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-indigo-500 transition-colors">
                {user?.nickname || user?.username || '未登录'}
              </p>
              <p className="text-[10px] text-gray-400">查看个人主页</p>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[var(--color-card)] border-t border-gray-200 dark:border-[var(--color-border)] safe-bottom z-50">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
          <MobileNavLink to="/" icon={FiHome} label="首页" />
          <MobileNavLink to="/square" icon={FiMessageSquare} label="广场" />
          <MobileNavLink to="/publish/goods" icon={FiPlusCircle} label="发布" />
          <MobileNavLink to="/messages" icon={FiMail} label="消息" badge={msgUnread} />
          <MobileNavLink to="/profile" icon={FiUser} label="我的" badge={unreadCount} />
        </div>
      </nav>
    </>
  );
}
