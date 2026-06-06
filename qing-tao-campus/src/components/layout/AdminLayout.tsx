import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { FiHome, FiBarChart2, FiImage, FiUsers } from 'react-icons/fi';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/common/PageTransition';

const adminTabs = [
  { to: '/admin', label: '概览', icon: FiBarChart2, exact: true },
  { to: '/admin/images', label: '图片审核', icon: FiImage },
  { to: '/admin/users', label: '用户', icon: FiUsers },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur-xl border-b border-gray-100 dark:border-[var(--color-border)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-500 transition-colors"
              title="进入轻淘"
            >
              <FiHome />
              <span className="hidden sm:inline font-medium">轻淘</span>
            </Link>
            <span className="w-px h-5 bg-gray-200 dark:bg-[var(--color-card-hover)]" />
            <h1 className="font-bold text-indigo-600 text-sm">管理后台</h1>
          </div>
          <nav className="flex gap-1">
            {adminTabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.exact}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`
                }
              >
                <t.icon className="text-sm" />
                <span className="hidden sm:inline">{t.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-4">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </div>
    </div>
  );
}
